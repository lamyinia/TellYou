package org.com.modules.common.util;

import cn.hutool.core.util.URLUtil;

public class UrlUtil {
    public static Integer extractVersionFromUrl(String url){
        String splits[] = URLUtil.getPath(url).split("/");
        return Integer.parseInt(splits[splits.length-2]);
    }
}
