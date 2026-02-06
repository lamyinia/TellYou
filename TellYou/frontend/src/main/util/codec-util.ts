import { app } from "electron";
import fs from "fs";
import path from "path";
import protobuf from "protobufjs";

const MAGIC = 0x5459;
const VERSION_V1 = 1;
const HEADER_LEN = 8;
const DEFAULT_MAX_BODY_LEN = 1024 * 1024;

let rootPromise: Promise<protobuf.Root> | null = null;

function resolveProtoFileAbsolutePath(): string | null {
  const candidates = [
    path.join(
      process.cwd(),
      "src",
      "main",
      "proto",
      "connector",
      "tcp",
      "v1",
      "tellyou_tcp.proto",
    ),
    path.join(
      app.getAppPath(),
      "src",
      "main",
      "proto",
      "connector",
      "tcp",
      "v1",
      "tellyou_tcp.proto",
    ),
    path.join(
      __dirname,
      "..",
      "proto",
      "connector",
      "tcp",
      "v1",
      "tellyou_tcp.proto",
    ),
  ];

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        return p;
      }
    } catch {
      // ignore
    }
  }
  return null;
}

function resolveProtoBaseDir(protoFile: string): string {
  return path.resolve(path.dirname(protoFile), "..", "..", "..", "..");
}

async function getProtoRoot(): Promise<protobuf.Root> {
  if (rootPromise) {
    return rootPromise;
  }

  rootPromise = (async () => {
    const protoFile = resolveProtoFileAbsolutePath();
    if (!protoFile) {
      throw new Error("tellyou_tcp.proto not found");
    }

    const protoBaseDir = resolveProtoBaseDir(protoFile);
    const root = new protobuf.Root();
    root.resolvePath = (origin, target) => {
      const underBase = path.join(protoBaseDir, target);
      if (fs.existsSync(underBase)) {
        return underBase;
      }
      return protobuf.util.path.resolve(origin, target);
    };

    await root.load(protoFile);
    root.resolveAll();
    return root;
  })();

  return rootPromise;
}

function toBuffer(data: Uint8Array | Buffer): Buffer {
  return Buffer.isBuffer(data) ? data : Buffer.from(data);
}

export function encodeTcpFrame(body: Uint8Array | Buffer): Buffer {
  const payload = toBuffer(body);
  if (payload.length > DEFAULT_MAX_BODY_LEN) {
    throw new Error(`body_too_large: ${payload.length}`);
  }

  const out = Buffer.allocUnsafe(HEADER_LEN + payload.length);
  out.writeUInt16BE(MAGIC, 0);
  out.writeUInt8(VERSION_V1, 2);
  out.writeUInt8(0, 3);
  out.writeInt32BE(payload.length, 4);
  payload.copy(out, HEADER_LEN);
  return out;
}

export function decodeTcpFrames(
  buffer: Buffer,
  maxBodyLen: number = DEFAULT_MAX_BODY_LEN,
): { frames: Buffer[]; rest: Buffer } {
  let offset = 0;
  const frames: Buffer[] = [];

  while (buffer.length - offset >= HEADER_LEN) {
    const magic = buffer.readUInt16BE(offset);
    if (magic !== MAGIC) {
      throw new Error("bad_magic");
    }

    const ver = buffer.readUInt8(offset + 2);
    if (ver !== VERSION_V1) {
      throw new Error(`unsupported_version: ${ver}`);
    }

    const bodyLen = buffer.readInt32BE(offset + 4);
    if (bodyLen < 0 || bodyLen > maxBodyLen) {
      throw new Error(`body_too_large: ${bodyLen}`);
    }

    const totalLen = HEADER_LEN + bodyLen;
    if (buffer.length - offset < totalLen) {
      break;
    }

    const body = buffer.subarray(offset + HEADER_LEN, offset + totalLen);
    frames.push(body);
    offset += totalLen;
  }

  return { frames, rest: buffer.subarray(offset) };
}

export async function encodeEnvelope(
  envelope: Record<string, any>,
): Promise<Buffer> {
  const root = await getProtoRoot();
  const Envelope = root.lookupType("connector.tcp.v1.Envelope");
  const err = Envelope.verify(envelope);
  if (err) {
    throw new Error(`Envelope.verify failed: ${err}`);
  }
  const msg = Envelope.create(envelope);
  const bytes = Envelope.encode(msg).finish();
  return Buffer.from(bytes);
}

export async function decodeEnvelope(body: Buffer): Promise<{ object: any }> {
  const root = await getProtoRoot();
  const Envelope = root.lookupType("connector.tcp.v1.Envelope");
  const message = Envelope.decode(body);
  const object = Envelope.toObject(message, {
    longs: String,
    enums: String,
    bytes: String,
    defaults: false,
  });
  return { object };
}
