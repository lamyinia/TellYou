package org.com.modules.common.aspect;

import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.aspectj.lang.reflect.MethodSignature;
import org.com.modules.common.annotation.Unify;
import org.com.modules.common.annotation.UnifyUid;
import org.com.modules.common.exception.UnifyException;
import org.com.modules.common.util.RequestHolder;
import org.com.tools.exception.CommonErrorEnum;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.lang.reflect.Field;
import java.lang.reflect.Parameter;

@Slf4j
@Order(1)
@Aspect
@Component
public class UnifyAspect {
    @Before("within(org.com..*) && @args(org.com.modules.common.annotation.Unify)")
    public void unify(JoinPoint joinPoint){
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Parameter[] parameters = signature.getMethod().getParameters();
        Object[] args = joinPoint.getArgs();

        for (int i = 0; i < parameters.length; i++) {
            Parameter parameter = parameters[i];
            Object arg = args[i];

            if (parameter.isAnnotationPresent(Unify.class) && parameter.getType().isAnnotationPresent(Unify.class) && arg != null) {
                validateUid(arg);
            }
        }
    }
    public void validateUid(Object obj){
        try {
            Class<?> clazz = obj.getClass();
            Field[] fields = clazz.getDeclaredFields();

            for (Field field : fields) {
                if (field.isAnnotationPresent(UnifyUid.class)) {
                    field.setAccessible(true);
                    Object fieldValue = field.get(obj);

                    if (fieldValue != null) {
                        Long requestUid = (Long) fieldValue;
                        Long currentUid = RequestHolder.get().getUid();

                        if (currentUid == null) {
                            throw new UnifyException("用户未登录");
                        }

                        if (!requestUid.equals(currentUid)) {
                            log.warn("UID不匹配: 请求UID={}, 当前用户UID={}", requestUid, currentUid);
                            throw new UnifyException(CommonErrorEnum.UNIFY_ERROR);
                        }

                        log.debug("UID验证通过: {}", requestUid);
                    }
                }
            }
        } catch (IllegalAccessException e) {
            log.error("验证UID时发生异常", e);
            throw new UnifyException("UID验证异常");
        }
    }
}
