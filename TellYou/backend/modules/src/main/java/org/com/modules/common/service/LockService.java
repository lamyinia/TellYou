package org.com.modules.common.service;

import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import org.com.tools.exception.BusinessException;
import org.com.tools.exception.CommonErrorEnum;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;

@Service
@RequiredArgsConstructor
public class LockService {
    private final RedissonClient redissonClient;

    public <T> T executeWithLockThrows(String key, int waitTime, TimeUnit unit, SupplierThrow<T> supplier) throws Throwable {
        RLock lock = redissonClient.getLock(key);
        boolean lockSuccess = lock.tryLock(waitTime, unit);
        if (!lockSuccess) {
            throw new BusinessException(CommonErrorEnum.LOCK_LIMIT);
        }
        try {
            return supplier.get();
        } finally {
            if (lock.isLocked() && lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
    }

    @SneakyThrows
    public <T> T executeWithLock(String key, int waitTime, TimeUnit unit, Runnable runnable) {
        return executeWithLockThrows(key, waitTime, unit, () -> {
            runnable.run();
            return null;
        });
    }

//    public <T> T executeWithLock(String key, Supplier<T> supplier) {
//        return executeWithLock(key, -1, TimeUnit.MILLISECONDS, supplier);
//    }


    @FunctionalInterface
    public interface SupplierThrow<T> {
        /**
         * Gets a result.
         * @return a result
         */
        T get() throws Throwable;
    }
}
