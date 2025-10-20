package org.com.modules.common.aspect;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.aspectj.lang.reflect.MethodSignature;
import org.com.modules.common.annotation.Check;
import org.com.modules.common.annotation.CheckMark;
import org.com.modules.common.exception.CheckPowerException;
import org.com.modules.common.util.RequestHolder;
import org.com.modules.contact.dao.mysql.GroupContactDao;
import org.com.modules.group.domain.enums.GroupRoleEnum;
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
public class CheckAspect {
    private final GroupContactDao groupContactDao;

    @Before("within(org.com..*) && @args(org.com.modules.common.annotation.CheckMark)")
    public void unify(JoinPoint joinPoint) {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Parameter[] parameters = signature.getMethod().getParameters();
        Object[] args = joinPoint.getArgs();

        for (int i = 0; i < parameters.length; i++) {
            Parameter parameter = parameters[i];
            Object arg = args[i];

            if (parameter.isAnnotationPresent(Check.class) && parameter.getType().isAnnotationPresent(CheckMark.class) && arg != null) {
                validate(arg);
            }
        }
    }

    public void validate(Object obj) {
        try {
            Class<?> clazz = obj.getClass();
            Field[] fields = clazz.getDeclaredFields();
            CheckMark role = clazz.getAnnotation(CheckMark.class);

            Long fromId = null, groupId = null;

            for (Field field : fields) {
                if (field.isAnnotationPresent(CheckMark.class)) {
                    field.setAccessible(true);
                    CheckMark anno = field.getAnnotation(CheckMark.class);

                    if (CheckMark.Target.USER_ID.equals(anno.target())) {
                        fromId = (Long) field.get(obj);
                        Long currentUid = RequestHolder.get().getUid();
                        if (currentUid == null) return;
                        if (fromId == null || !fromId.equals(currentUid)) {
                            log.warn("UID 不匹配: 请求 UID = {}, 当前用户 UID = {}", fromId, currentUid);
                            throw new CheckPowerException(CommonErrorEnum.UNIFY_ERROR);
                        }
                    }
                    if (CheckMark.Target.GROUP_ID.equals(anno.target())) {
                        groupId = (Long) field.get(obj);
                    }
                }
            }

            if (CheckMark.Target.NORMAL.equals(role.target())) return;
            if (fromId == null || groupId == null) return;

            boolean validation = true;
            if (CheckMark.Target.MEMBER_AUTHORITY.equals(role.target())){
                validation &= groupContactDao.validatePower(fromId, groupId, GroupRoleEnum.MEMBER.getRole());
            }
            if (CheckMark.Target.MANAGER_AUTHORITY.equals(role.target())){
                validation &= groupContactDao.validatePower(fromId, groupId, GroupRoleEnum.MANAGER.getRole());
            }
            if (CheckMark.Target.OWNER_AUTHORITY.equals(role.target())){
                validation &= groupContactDao.validatePower(fromId, groupId, GroupRoleEnum.OWNER.getRole());
            }

            if (!validation) throw new CheckPowerException(CommonErrorEnum.ROLE_ERROR);

        } catch(IllegalAccessException e){
            log.error("验证UID时发生异常", e);
            throw new CheckPowerException("UID验证异常");
        }
    }
}

