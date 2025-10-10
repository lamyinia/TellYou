package org.com.modules.user.dao;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.com.modules.user.domain.entity.ContactApply;
import org.com.modules.user.domain.enums.ConfirmEnum;
import org.com.modules.user.domain.enums.ContactTypeEnum;
import org.com.modules.user.domain.vo.resp.SimpleApplyInfo;
import org.com.modules.user.mapper.ContactApplyMapper;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ContactApplyDao extends ServiceImpl<ContactApplyMapper, ContactApply> {
    public ContactApply getFriendApply(Long uid, Long targetId){
        return lambdaQuery().eq(ContactApply::getApplyUserId, uid)
                .eq(ContactApply::getTargetId, targetId)
                .eq(ContactApply::getContactType, ContactTypeEnum.FRIEND.getStatus())
                .eq(ContactApply::getStatus, ConfirmEnum.WAITING.getStatus())
                .one();
    }

    public ContactApply getGroupApply(Long uid, Long targetId){
        return lambdaQuery().eq(ContactApply::getApplyUserId, uid)
                .eq(ContactApply::getTargetId, targetId)
                .eq(ContactApply::getContactType, ContactTypeEnum.GROUP.getStatus())
                .eq(ContactApply::getStatus, ConfirmEnum.WAITING.getStatus())
                .one();
    }

    public List<SimpleApplyInfo> selectApplyInfoById(Long userId){
        List<ContactApply> resp = lambdaQuery()
                .eq(ContactApply::getApplyUserId, userId)
                .select(ContactApply::getApplyUserId, ContactApply::getTargetId, ContactApply::getContactType,
                        ContactApply::getLastApplyTime, ContactApply::getStatus, ContactApply::getApplyInfo)
                .list();
        resp.addAll(
                lambdaQuery()
                        .eq(ContactApply::getTargetId, userId)
                        .select(ContactApply::getApplyUserId, ContactApply::getTargetId, ContactApply::getContactType,
                                ContactApply::getLastApplyTime, ContactApply::getStatus, ContactApply::getApplyInfo)
                        .list()
        );
        return resp.stream().map(applyInfo -> {
            SimpleApplyInfo info = new SimpleApplyInfo();
            BeanUtils.copyProperties(applyInfo, info);
            return info;
        }).toList();
    }
}
