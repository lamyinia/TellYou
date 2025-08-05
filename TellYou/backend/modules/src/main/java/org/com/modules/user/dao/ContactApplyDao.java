package org.com.modules.user.dao;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.com.modules.user.domain.entity.ContactApply;
import org.com.modules.user.domain.enums.ConfirmEnum;
import org.com.modules.user.domain.enums.ContactTypeEnum;
import org.com.modules.user.mapper.ContactApplyMapper;
import org.springframework.stereotype.Service;

@Service
public class ContactApplyDao extends ServiceImpl<ContactApplyMapper, ContactApply> {
    public ContactApply getApplyByBothId(Long uid, Long targetId){
        return lambdaQuery().eq(ContactApply::getApplyUserId, uid)
                .eq(ContactApply::getTargetId, targetId)
                .eq(ContactApply::getContactType, ContactTypeEnum.FRIEND.getStatus())
                .eq(ContactApply::getStatus, ConfirmEnum.WAITING.getStatus())
                .one();
    }
}