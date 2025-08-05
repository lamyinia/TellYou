package org.com.modules.user.service.adapter;

import org.com.modules.user.domain.entity.Black;

public class BlackAdapter {
    public static Black buildBlackContact(Long fromId, Long target, Integer type){
        return Black.builder().fromId(fromId).target(target)
                .type(type).build();
    }
}
