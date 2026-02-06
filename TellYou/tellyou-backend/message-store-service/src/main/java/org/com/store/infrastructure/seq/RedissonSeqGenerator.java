package org.com.store.infrastructure.seq;

import lombok.RequiredArgsConstructor;
import org.redisson.api.RAtomicLong;
import org.redisson.api.RedissonClient;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class RedissonSeqGenerator implements SeqGenerator {

    private final RedissonClient redissonClient;

    private static String seqKey(long sessionId) {
        return "im:seq:session:" + sessionId;
    }

    @Override
    public long nextSeq(long sessionId) {
        RAtomicLong seq = redissonClient.getAtomicLong(seqKey(sessionId));
        return seq.incrementAndGet();
    }
}
