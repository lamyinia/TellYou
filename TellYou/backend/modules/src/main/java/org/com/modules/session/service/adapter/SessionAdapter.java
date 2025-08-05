package org.com.modules.session.service.adapter;

import org.com.modules.session.domain.entity.Session;
import org.com.modules.user.domain.enums.SessionTypeEnum;

import java.util.Date;

public class SessionAdapter {
    public static Session buildDefaultFrinedSession(){
        return Session.builder().createdAt(new Date()).updatedAt(new Date())
                .sessionType(SessionTypeEnum.PRIVATE.getStatus()).build();
    }

    public static Session buildDefaultGroupSession() {
        return Session.builder().createdAt(new Date()).updatedAt(new Date())
                .sessionType(SessionTypeEnum.PRIVATE.getStatus()).build();
    }
}
