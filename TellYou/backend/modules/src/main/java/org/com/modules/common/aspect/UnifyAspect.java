package org.com.modules.common.aspect;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.aspectj.lang.reflect.MethodSignature;
import org.com.modules.common.annotation.Unify;
import org.com.modules.common.annotation.UnifyMark;
import org.com.modules.common.exception.UnifyException;
import org.com.modules.common.util.RequestHolder;
import org.com.modules.session.dao.GroupContactDao;
import org.com.modules.session.domain.enums.GroupRoleEnum;
import org.com.tools.exception.CommonErrorEnum;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.lang.reflect.Field;
import java.lang.reflect.Parameter;

@Slf4j
@Order(1)
@Aspect
@Component
@RequiredArgsConstructor
public class UnifyAspect {
    private final GroupContactDao groupContactDao;

    @Before("within(org.com..*) && @args(org.com.modules.common.annotation.UnifyMark)")
    public void unify(JoinPoint joinPoint) {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Parameter[] parameters = signature.getMethod().getParameters();
        Object[] args = joinPoint.getArgs();

        for (int i = 0; i < parameters.length; i++) {
            Parameter parameter = parameters[i];
            Object arg = args[i];

            if (parameter.isAnnotationPresent(Unify.class) && parameter.getType().isAnnotationPresent(UnifyMark.class) && arg != null) {
                validate(arg);
            }
        }
    }

    public void validate(Object obj) {
        try {
            Class<?> clazz = obj.getClass();
            Field[] fields = clazz.getDeclaredFields();
            UnifyMark role = clazz.getAnnotation(UnifyMark.class);

            Long fromId = null, groupId = null;

            for (Field field : fields) {
                if (field.isAnnotationPresent(UnifyMark.class)) {
                    field.setAccessible(true);
                    UnifyMark anno = field.getAnnotation(UnifyMark.class);

                    if (UnifyMark.Target.USER_ID.equals(anno.target())) {
                        fromId = (Long) field.get(obj);
                        Long currentUid = RequestHolder.get().getUid();
                        if (fromId == null || currentUid == null) return;
                        if (!fromId.equals(currentUid)) {
                            log.warn("UID 不匹配: 请求 UID = {}, 当前用户 UID = {}", fromId, currentUid);
                            throw new UnifyException(CommonErrorEnum.UNIFY_ERROR);
                        }
                    }
                    if (UnifyMark.Target.GROUP_ID.equals(anno.target())) {
                        groupId = (Long) field.get(obj);
                    }
                }
            }

            if (UnifyMark.Target.NORMAL.equals(role.target())) return;
            if (fromId == null || groupId == null) return;

            boolean validation = true;
            if (UnifyMark.Target.MEMBER_AUTHORITY.equals(role.target())){
                validation &= groupContactDao.validatePower(fromId, groupId, GroupRoleEnum.MEMBER.getRole());
            }
            if (UnifyMark.Target.MANAGER_AUTHORITY.equals(role.target())){
                validation &= groupContactDao.validatePower(fromId, groupId, GroupRoleEnum.MANAGER.getRole());
            }
            if (UnifyMark.Target.OWNER_AUTHORITY.equals(role.target())){
                validation &= groupContactDao.validatePower(fromId, groupId, GroupRoleEnum.OWNER.getRole());
            }

            if (!validation) throw new UnifyException(CommonErrorEnum.ROLE_ERROR);

        } catch(IllegalAccessException e){
            log.error("验证UID时发生异常", e);
            throw new UnifyException("UID验证异常");
        }
    }
}

