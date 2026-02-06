package org.com.store.domain;

public final class MessageFlags {

    private MessageFlags() {
    }

    public static final long WRITE_FANOUT = 1L;
    public static final long READ_FANOUT = 2L;

    public static final long STRICT_ORDER = 4L;
    public static final long TREND_ORDER = 8L;

    public static final long READ_RECEIPT = 16L;
    public static final long DELIVER_ACK = 32L;

    public static final long ASYNC_FANOUT = 64L;
    public static final long HISTORY_QUERY = 128L;
    public static final long CLIENT_CURSOR = 256L;
    public static final long SERVER_CURSOR = 512L;

    public static boolean has(long flags, long bit) {
        return (flags & bit) != 0;
    }
}
