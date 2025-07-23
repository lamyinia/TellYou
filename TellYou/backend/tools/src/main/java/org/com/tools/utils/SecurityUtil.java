package org.com.tools.utils;

import cn.hutool.crypto.digest.DigestUtil;
import cn.hutool.crypto.digest.Digester;

public class SecurityUtil {
    static Digester digester = DigestUtil.digester("SHA-256");

    public static String encode(String str){
        return digester.digestHex(str);
    }
}
