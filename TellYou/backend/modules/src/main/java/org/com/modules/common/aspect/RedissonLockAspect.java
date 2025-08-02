package org.com.modules.common.aspect;

import cn.hutool.core.util.StrUtil;
import lombok.RequiredArgsConstructor;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.com.modules.common.annotation.RedissonLocking;
import org.com.modules.common.service.LockService;
import org.com.tools.utils.SpELUtil;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;

/**
 * @author lanye
 * @date 2025/08/01
 */
//@Order(0)
@Aspect
@Component
@RequiredArgsConstructor
public class RedissonLockAspect {
    private final LockService lockService;

    @Around("@annotation(redissonLocking)")
    public Object around(ProceedingJoinPoint joinPoint, RedissonLocking redissonLocking) throws Throwable {
        Method method = ((MethodSignature) joinPoint.getSignature()).getMethod();

        String prefix = StrUtil.isBlank(redissonLocking.prefixKey()) ? SpELUtil.getMethodKey(method) : redissonLocking.prefixKey();
        String key = SpELUtil.parseSpEL(method, joinPoint.getArgs(), redissonLocking.key());

        return lockService.executeWithLockThrows(prefix + ":" + key, redissonLocking.waitTime(), redissonLocking.unit(), joinPoint::proceed);
    }
}
