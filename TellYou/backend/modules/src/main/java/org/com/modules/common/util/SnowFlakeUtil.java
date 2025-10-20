package org.com.modules.common.util;

public class SnowFlakeUtil {
    private final long datacenterId;
    private final long workerId;
    private long sequence = 0L;
    private long lastTimestamp = -1L;

    public SnowFlakeUtil(long datacenterId, long workerId) {
        this.datacenterId = datacenterId;
        this.workerId = workerId;
    }

    public synchronized long nextId() {
        long timestamp = System.currentTimeMillis();
        if (timestamp < lastTimestamp) {
            throw new RuntimeException("Clock moved backwards.");
        }
        if (timestamp == lastTimestamp) {
            sequence = (sequence + 1) & 4095; // 每毫秒 4096 序号
            if (sequence == 0) {
                while ((timestamp = System.currentTimeMillis()) <= lastTimestamp) { /* spin */ }
            }
        } else {
            sequence = 0L;
        }
        lastTimestamp = timestamp;
        return ((timestamp - 1609430400000L) << 22) | (datacenterId << 17) | (workerId << 12) | sequence;
    }
}
