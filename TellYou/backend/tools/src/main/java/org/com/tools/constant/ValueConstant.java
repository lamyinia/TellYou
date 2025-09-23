package org.com.tools.constant;

import java.util.Date;

public class ValueConstant {
    public static final Long DEFAULT_ZERO = 0L;
    public static final Integer DEFAULT_VALUE = 1;
    public static final String DEFAULT_AVATAR = "http://113.44.158.255:32788/lanye/avatar/2025-08/d212eb94b83a476ab23f9d2d62f6e2ef~tplv-p14lwwcsbr-7.jpg";
    public static final String DEFAULT_SIGNATURE = "万般通祇，彼岸花开";
    public static final String DEFAULT_AVATAR_VERSION_KEY = "avatarVersion";
    public static final String DEFAULT_NICKNAME_VERSION_KEY = "nicknameVersion";
    public static final String DEFAULT_AVATAR_RESIDUE_KEY = "avatarResidue";
    public static final String DEFAULT_NICKNAME_RESIDUE_KEY = "nicknameResidue";
    public static final String DEFAULT_SIGNATURE_RESIDUE_KEY = "signatureResidue";
    public static final String DEFAULT_SEX_RESIDUE_KEY = "sexResidue";



    public static final Date getDefaultDate(){
        return new Date(System.currentTimeMillis());
    }
}
