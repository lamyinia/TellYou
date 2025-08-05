package org.com.tools.utils;

import cn.hutool.core.util.ObjectUtil;
import org.com.tools.exception.BusinessErrorEnum;
import org.com.tools.exception.BusinessException;
import org.com.tools.exception.ErrorEnum;

import java.text.MessageFormat;
import java.util.*;

/**
 * 校验工具类
 */
public class AssertUtil {
    public static void isTrue(boolean expression, String msg) {
        if (!expression) {
            throwException(msg);
        }
    }

    public static void isTrue(boolean expression, ErrorEnum errorEnum) {
        if (!expression) {
            throwException(errorEnum);
        }
    }

    public static void isFalse(boolean expression, String msg) {
        if (expression) {
            throwException(msg);
        }
    }

    public static void isFalse(boolean expression, ErrorEnum errorEnum) {
        if (expression) {
            throwException(errorEnum);
        }
    }

    public static void isNotEmpty(Object obj, String msg) {
        if (isEmpty(obj)) {
            throwException(msg);
        }
    }

    public static void isNotEmpty(Object obj, ErrorEnum errorEnum) {
        if (isEmpty(obj)) {
            throwException(errorEnum);
        }
    }

    public static void isEmpty(Object obj, String msg) {
        if (!isEmpty(obj)) {
            throwException(msg);
        }
    }

    public static void equal(Object o1, Object o2, String msg) {
        if (!ObjectUtil.equal(o1, o2)) {
            throwException(msg);
        }
    }

    public static void notEqual(Object o1, Object o2, String msg) {
        if (ObjectUtil.equal(o1, o2)) {
            throwException(msg);
        }
    }

    private static boolean isEmpty(Object obj) {
        return ObjectUtil.isEmpty(obj);
    }

    private static void throwException(String msg) {
        throw new BusinessException(null, msg);
    }
    private static void throwException(ErrorEnum errorEnum) {
        throw new BusinessException(errorEnum.getErrorCode(), errorEnum.getErrorMsg());
    }

    private static void throwException(ErrorEnum errorEnum, Object... arg) {
        if (Objects.isNull(errorEnum)) {
            errorEnum = BusinessErrorEnum.BUSINESS_ERROR;
        }
        throw new BusinessException(errorEnum.getErrorCode(), MessageFormat.format(errorEnum.getErrorMsg(), arg));
    }


}
