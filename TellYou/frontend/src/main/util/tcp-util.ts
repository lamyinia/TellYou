import net from "net";
import {
  decodeEnvelope,
  decodeTcpFrames,
  encodeEnvelope,
  encodeTcpFrame,
} from "@main/util/codec-util";

type TcpTestOptions = {
  host: string;
  port: number;
  token: string;
  clientId?: string;
  deviceId?: string;
  connectTimeoutMs?: number;
};

function nowMs(): number {
  return Date.now();
}

function genTraceId(): string {
  return `tcp-test-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function startTcpGatewayTest(partial?: Partial<TcpTestOptions>): { stop: () => void; } {
  const host = partial?.host ?? process.env.TELLYOU_TCP_HOST ?? "127.0.0.1";
  const port = Number(partial?.port ?? process.env.TELLYOU_TCP_PORT ?? 7070);
  const token = partial?.token ?? process.env.TELLYOU_TCP_TOKEN ?? "uid=1";

  const options: TcpTestOptions = {
    host,
    port,
    token,
    clientId:
      partial?.clientId ?? process.env.TELLYOU_TCP_CLIENT_ID ?? "electron-main",
    deviceId: partial?.deviceId ?? process.env.TELLYOU_TCP_DEVICE_ID ?? "pc",
    connectTimeoutMs: partial?.connectTimeoutMs ?? 5000,
  };

  const socket = new net.Socket();
  let stopped = false;
  let recvBuffer: Buffer = Buffer.alloc(0);
  let pingTimer: NodeJS.Timeout | null = null;
  let connectTimer: NodeJS.Timeout | null = null;
  let streamId = 1;
  let authenticated = false;
  let connected = false;

  const stop = (): void => {
    if (stopped) {
      return;
    }
    stopped = true;
    authenticated = false;
    connected = false;
    if (pingTimer) {
      clearInterval(pingTimer);
      pingTimer = null;
    }
    if (connectTimer) {
      clearTimeout(connectTimer);
      connectTimer = null;
    }
    try {
      socket.destroy();
    } catch {
      // ignore
    }
  };

  const sendEnvelope = async (payload: Record<string, any>): Promise<void> => {
    if (stopped) {
      return;
    }
    const env = {
      version: 1,
      streamId: streamId++,
      timestampMs: nowMs(),
      traceId: genTraceId(),
      ...payload,
    };
    const body = await encodeEnvelope(env);
    const frame = encodeTcpFrame(body);
    socket.write(frame);
  };

  const startPingLoop = (intervalSec: number): void => {
    if (pingTimer) {
      clearInterval(pingTimer);
      pingTimer = null;
    }

    const sec = Math.max(1, intervalSec);
    console.info("[tcp-test] start ping loop", { intervalSec: sec });
    pingTimer = setInterval(() => {
      sendEnvelope({ ping: {} }).catch((e) => {
        console.error("[tcp-test] ping send failed", e);
      });
    }, sec * 1000);
  };

  socket.on("connect", () => {
    connected = true;
    if (connectTimer) {
      clearTimeout(connectTimer);
      connectTimer = null;
    }
    console.info("[tcp-test] connected", {
      host: options.host,
      port: options.port,
    });
    authenticated = false;
    recvBuffer = Buffer.alloc(0);

    sendEnvelope({
      authRequest: {
        token: options.token,
        clientId: options.clientId,
        deviceId: options.deviceId,
      },
    }).catch((e) => {
      console.error("[tcp-test] auth send failed", e);
    });
  });

  socket.on("data", (chunk) => {
    recvBuffer = Buffer.concat([recvBuffer, chunk]);

    try {
      const { frames, rest } = decodeTcpFrames(recvBuffer);
      recvBuffer = rest;

      for (const body of frames) {
        decodeEnvelope(body)
          .then(({ object }) => {
            console.info("[tcp-test] recv", object);

            if (object?.authOk) {
              authenticated = true;
              const intervalSec = Number(
                object.authOk.heartbeatIntervalSec ?? 30,
              );
              startPingLoop(intervalSec);
              return;
            }

            if (object?.authFail) {
              console.error("[tcp-test] authFail", object.authFail);
              stop();
              return;
            }

            if (object?.error) {
              console.error("[tcp-test] error", object.error);
            }
          })
          .catch((e) => {
            console.error("[tcp-test] envelope decode failed", e);
          });
      }
    } catch (e) {
      console.error("[tcp-test] frame decode failed", e);
      stop();
    }
  });

  socket.on("error", (err) => {
    if (stopped) {
      return;
    }
    console.error("[tcp-test] socket error", err);
  });

  socket.on("close", (hadError) => {
    if (stopped) {
      return;
    }
    console.warn("[tcp-test] socket closed", {
      hadError,
      authenticated,
    });
    stop();
  });

  console.info("[tcp-test] starting", {
    host: options.host,
    port: options.port,
    token: options.token,
  });

  connectTimer = setTimeout(() => {
    if (stopped || connected) {
      return;
    }
    console.error("[tcp-test] connect timeout", {
      host: options.host,
      port: options.port,
      timeoutMs: options.connectTimeoutMs ?? 5000,
    });
    stop();
  }, options.connectTimeoutMs ?? 5000);

  socket.connect(options.port, options.host);

  return { stop };
}
