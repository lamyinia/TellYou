package org.com.nettyconnector.infrastructure.netty;

public final class TcpProtocolConstants {

    private TcpProtocolConstants() {
    }

    public static final short MAGIC = (short) 0x5459;
    public static final byte VERSION_V1 = 1;

    public static final int HEADER_LEN = 8;
    public static final int DEFAULT_MAX_BODY_LEN = 1024 * 1024;
}
