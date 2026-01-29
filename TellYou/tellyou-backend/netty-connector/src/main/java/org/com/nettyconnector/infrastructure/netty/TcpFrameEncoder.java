package org.com.nettyconnector.infrastructure.netty;

import io.netty.buffer.ByteBuf;
import io.netty.channel.ChannelHandlerContext;
import io.netty.handler.codec.MessageToByteEncoder;

public class TcpFrameEncoder extends MessageToByteEncoder<ByteBuf> {

    private final byte version;
    private final byte flags;

    public TcpFrameEncoder(byte version, byte flags) {
        this.version = version;
        this.flags = flags;
    }

    public TcpFrameEncoder() {
        this(TcpProtocolConstants.VERSION_V1, (byte) 0);
    }

    @Override
    protected void encode(ChannelHandlerContext ctx, ByteBuf msg, ByteBuf out) {
        int bodyLen = msg.readableBytes();

        out.writeShort(TcpProtocolConstants.MAGIC);
        out.writeByte(version);
        out.writeByte(flags);
        out.writeInt(bodyLen);
        out.writeBytes(msg, msg.readerIndex(), bodyLen);
    }
}
