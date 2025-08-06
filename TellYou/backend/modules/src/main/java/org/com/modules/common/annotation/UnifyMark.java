package org.com.modules.common.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.FIELD, ElementType.TYPE})
public @interface UnifyMark {
    Target target();

    enum Target {
        USER_ID, GROUP_ID,
        NORMAL,
        MEMBER_AUTHORITY, MANAGER_AUTHORITY, OWNER_AUTHORITY
    }
}
