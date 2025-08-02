package org.com.modules.user.dao;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.common.domain.enums.YesOrNoEnum;
import org.com.modules.user.domain.entity.FriendContact;
import org.com.modules.user.mapper.FriendContactMapper;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class FriendContactDao extends ServiceImpl<FriendContactMapper, FriendContact> {
    public FriendContact getContactByBothId(Long uid, Long contactId){
        return lambdaQuery().eq(FriendContact::getUserId, uid)
                .eq(FriendContact::getContactId, contactId)
                .eq(FriendContact::getIsDeleted, YesOrNoEnum.NO.getStatus()).one();
    }
}
