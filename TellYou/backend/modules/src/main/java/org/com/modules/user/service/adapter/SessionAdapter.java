package org.com.modules.user.service.adapter;

import org.com.modules.session.domain.entity.Session;
import org.com.modules.user.domain.enums.SessionTypeEnum;

public class SessionAdapter {
    public static Session buildDefaultFrinedSession(){
        return Session.builder().sessionType(SessionTypeEnum.PRIVATE.getStatus()).build();
    }
}
