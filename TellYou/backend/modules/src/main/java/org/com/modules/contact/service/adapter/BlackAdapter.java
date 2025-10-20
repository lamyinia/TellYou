package org.com.modules.contact.service.adapter;

import org.com.modules.contact.domain.entity.Black;

public class BlackAdapter {
    public static Black buildBlackContact(Long fromId, Long target, Integer type){
        return Black.builder().fromId(fromId).target(target)
                .type(type).build();
    }
}
