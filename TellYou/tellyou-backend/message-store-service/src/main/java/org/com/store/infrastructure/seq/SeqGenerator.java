package org.com.store.infrastructure.seq;

public interface SeqGenerator {

    long nextSeq(long sessionId);
}
