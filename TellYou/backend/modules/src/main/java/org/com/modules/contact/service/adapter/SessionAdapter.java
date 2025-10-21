package org.com.modules.contact.service.adapter;

import org.com.modules.contact.domain.entity.Session;
import org.com.modules.contact.domain.enums.SessionTypeEnum;
import org.com.tools.constant.ValueConstant;

public class SessionAdapter {

    public static Session buildDefaultFrinedSession(Long sessionId){
        return Session.builder()
                .sessionId(sessionId)
                .createdAt(ValueConstant.getDefaultDate())
                .updatedAt(ValueConstant.getDefaultDate())
                .sessionType(SessionTypeEnum.PRIVATE.getStatus()).build();
    }

    public static Session buildDefaultGroupSession(Long sessionId) {
        return Session.builder()
                .sessionId(sessionId)
                .createdAt(ValueConstant.getDefaultDate())
                .updatedAt(ValueConstant.getDefaultDate())
                .sessionType(SessionTypeEnum.PUBLIC.getStatus())
                .build();
    }
}
