package org.com.tools.constant;

import java.util.Date;

public class ValueConstant {
    public static final Long DEFAULT_ZERO = 0L;
    public static final Integer DEFAULT_VALUE = 1;

    public static final Date getDefaultDate(){
        return new Date(System.currentTimeMillis());
    }
}
