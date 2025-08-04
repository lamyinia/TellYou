package org.com.modules.user.service.adapter;

import org.com.modules.common.domain.enums.YesOrNoEnum;
import org.com.modules.user.domain.entity.FriendContact;
import org.com.modules.user.domain.enums.ContactStatusEnum;

import java.util.List;

public class FriendContactAdapter {
    public static List<FriendContact> buildFriendContact(Long sessionId, Long uid1, Long uid2){
        return List.of(FriendContact.builder().userId(uid1).contactId(uid2).isDeleted(YesOrNoEnum.NO.getStatus())
                        .sessionId(sessionId).status(ContactStatusEnum.FRIEND.getStatus()).build(),
                FriendContact.builder().userId(uid2).contactId(uid1).isDeleted(YesOrNoEnum.NO.getStatus())
                        .sessionId(sessionId).status(ContactStatusEnum.FRIEND.getStatus()).build());
    }
}
