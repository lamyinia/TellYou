package org.com.modules.contact.dao.mysql;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.com.modules.common.domain.vo.req.CursorPageReq;
import org.com.modules.common.domain.vo.resp.CursorPageResp;
import org.com.modules.common.util.CursorUtil;
import org.com.modules.contact.domain.entity.ContactApply;
import org.com.modules.contact.domain.enums.ConfirmEnum;
import org.com.modules.contact.domain.enums.ContactTypeEnum;
import org.com.modules.user.domain.vo.resp.SimpleApplyInfo;
import org.com.modules.contact.mapper.ContactApplyMapper;
import org.com.modules.group.domain.vo.req.GroupApplyListReq;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ApplyDao extends ServiceImpl<ContactApplyMapper, ContactApply> {
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

    public List<SimpleApplyInfo> selectApplyById(Long userId){
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

    public List<ContactApply> selectApplyByIds(List<Long> ids){
        return lambdaQuery()
                .in(ContactApply::getApplyId, ids)
                .eq(ContactApply::getStatus, ConfirmEnum.WAITING.getStatus())
                .list();
    }

    public CursorPageResp<ContactApply> pullIncoming(CursorPageReq cursorPageReq, Long userId){
        return CursorUtil.getCursorPageByMysqlAsc(this, cursorPageReq,
                wrapper -> wrapper.eq(ContactApply::getTargetId, userId), ContactApply::getLastApplyTime);
    }

    public CursorPageResp<ContactApply> pullOutPosting(CursorPageReq cursorPageReq, Long userId){
        return CursorUtil.getCursorPageByMysqlAsc(this, cursorPageReq,
                wrapper -> wrapper.eq(ContactApply::getApplyUserId, userId), ContactApply::getLastApplyTime);
    }

    @SuppressWarnings("unchecked")
    public List<ContactApply> getGroupApplyPage(GroupApplyListReq req, Integer status){
        return lambdaQuery()
                .eq(ContactApply::getTargetId, req.getGroupId())
                .eq(ContactApply::getContactType, ContactTypeEnum.GROUP.getStatus())
                .eq(ContactApply::getStatus, status)
                .orderByDesc(ContactApply::getLastApplyTime)
                .page(req.getPageReq().daoPage())
                .getRecords();
    }
}
