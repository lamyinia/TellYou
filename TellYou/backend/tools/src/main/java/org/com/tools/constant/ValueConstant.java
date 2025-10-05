package org.com.tools.constant;

import java.util.Date;

public class ValueConstant {
    public static final Long DEFAULT_ZERO = 0L;
    public static final Integer DEFAULT_VALUE = 1;
    public static final String DEFAULT_SIGNATURE = "万般通祇，彼岸花开";
    public static final String DEFAULT_AVATAR_VERSION_KEY = "avatarVersion";
    public static final String DEFAULT_NICKNAME_VERSION_KEY = "nicknameVersion";
    public static final String DEFAULT_AVATAR_RESIDUE_KEY = "avatarResidue";
    public static final String DEFAULT_NICKNAME_RESIDUE_KEY = "nicknameResidue";
    public static final String DEFAULT_SIGNATURE_RESIDUE_KEY = "signatureResidue";
    public static final String DEFAULT_SEX_RESIDUE_KEY = "sexResidue";
    public static final String DEFAULT_ORIGIN_AVATAR_URL_KRY = "originalAvatarUrl";
    public static final String DEFAULT_THUMB_AVATAR_URL_KEY = "thumbedAvatarUrl";


    public static final String SINGLE_FILE = "index";


    public static final Boolean IS_DEVELOPMENT = true;

    public static final Date getDefaultDate(){
        return new Date(System.currentTimeMillis());
    }
}
