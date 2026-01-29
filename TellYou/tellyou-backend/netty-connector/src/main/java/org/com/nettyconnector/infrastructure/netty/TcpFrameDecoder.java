package org.com.nettyconnector.infrastructure.netty;

import io.netty.buffer.ByteBuf;
import io.netty.channel.ChannelHandlerContext;
import io.netty.handler.codec.ByteToMessageDecoder;
import io.netty.handler.codec.CorruptedFrameException;
import io.netty.handler.codec.TooLongFrameException;

import java.util.List;

public class TcpFrameDecoder extends ByteToMessageDecoder {

    private final int maxBodyLen;

    public TcpFrameDecoder(int maxBodyLen) {
        this.maxBodyLen = maxBodyLen;
    }

    @Override
    protected void decode(ChannelHandlerContext ctx, ByteBuf in, List<Object> out) {
        if (in.readableBytes() < TcpProtocolConstants.HEADER_LEN) {
            return;
        }

        in.markReaderIndex();

        short magic = in.readShort();
        if (magic != TcpProtocolConstants.MAGIC) {
            in.resetReaderIndex();
            throw new CorruptedFrameException("bad_magic");
        }

        byte ver = in.readByte();
        byte flags = in.readByte();

        if (ver != TcpProtocolConstants.VERSION_V1) {
            in.resetReaderIndex();
            throw new CorruptedFrameException("unsupported_version: " + ver);
        }

        int bodyLen = in.readInt();
        if (bodyLen < 0 || bodyLen > maxBodyLen) {
            in.resetReaderIndex();
            throw new TooLongFrameException("body_too_large: " + bodyLen);
        }

        if (in.readableBytes() < bodyLen) {
            in.resetReaderIndex();
            return;
        }

        ByteBuf body = in.readRetainedSlice(bodyLen);
        out.add(body);

        // flags reserved for future usage (compression/encryption). Currently ignored.
        if (flags != 0) {
            // no-op
        }
    }
}
