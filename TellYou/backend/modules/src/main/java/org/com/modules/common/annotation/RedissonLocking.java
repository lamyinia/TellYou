package org.com.modules.common.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.util.concurrent.TimeUnit;

/**
 * 分布式锁注解
 * @author lanye
 * @date 2025/08/01
 */
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface RedissonLocking {
    /**
     * key的前缀,默认取方法全限定名，除非我们在不同方法上对同一个资源做分布式锁，就自己指定
     * @return key的前缀
     */
    String prefixKey() default "";

    /**
     * springEl 表达式
     *
     * @return 表达式
     */
    String key();

    /**
     * 等待锁的时间
     * @return 单位毫秒
     */
    int waitTime() default 3000;

    /**
     * 等待锁的时间单位，默认毫秒
     * @return 单位
     */
    TimeUnit unit() default TimeUnit.MILLISECONDS;
}
