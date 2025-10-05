package org.com.modules.common.util;

import cn.hutool.core.util.StrUtil;
import cn.hutool.core.util.URLUtil;
import org.com.tools.constant.UrlConstant;

public class UrlUtil {
    public static Integer extractVersionFromUrl(String url){
        String splits[] = URLUtil.getPath(url).split("/");
        return Integer.parseInt(splits[splits.length-2]);
    }
    public static String getFirstOriginalAvatar(String host, String uid){
        return host + UrlConstant.originalAvatarPath + uid + StrUtil.SLASH + "1" + StrUtil.SLASH + "index.avif";
    }
    public static String getFirstThumbAvatar(String host, String uid){
        return host + UrlConstant.thumbedAvatarPath + uid + StrUtil.SLASH + "1" + StrUtil.SLASH + "index.avif";
    }
    public static String getFirstOriginalAvatar(String uid){
        return UrlConstant.originalAvatarPath + uid + StrUtil.SLASH + "1" + StrUtil.SLASH + "index.avif";
    }
    public static String getFirstThumbAvatar(String uid){
        return UrlConstant.thumbedAvatarPath + uid + StrUtil.SLASH + "1" + StrUtil.SLASH + "index.avif";
    }
}
