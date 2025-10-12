package org.com.modules.user.dao;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.common.domain.enums.YesOrNoEnum;
import org.com.modules.common.domain.vo.req.CursorPageReq;
import org.com.modules.common.domain.vo.resp.CursorPageResp;
import org.com.modules.common.util.CursorUtil;
import org.com.modules.session.domain.vo.resp.ContactResp;
import org.com.modules.user.domain.entity.FriendContact;
import org.com.modules.user.domain.enums.ContactStatusEnum;
import org.com.modules.user.domain.enums.SessionTypeEnum;
import org.com.modules.user.mapper.FriendContactMapper;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class FriendContactDao extends ServiceImpl<FriendContactMapper, FriendContact> {
    public FriendContact getContactByBothId(Long uid, Long contactId){
        return lambdaQuery().eq(FriendContact::getUserId, uid)
                .eq(FriendContact::getContactId, contactId)
                .eq(FriendContact::getIsDeleted, YesOrNoEnum.NO.getStatus()).one();
    }

    public FriendContact findByBothId(Long uid1, Long uid2) {
        return lambdaQuery().eq(FriendContact::getUserId, uid1)
                .eq(FriendContact::getContactId, uid2).one();
    }

    public void rebuildContact(Long uid1, Long uid2){
        Integer version = lambdaQuery().eq(FriendContact::getUserId, uid1)
                .eq(FriendContact::getContactId, uid2).one().getVersion();

        lambdaUpdate().eq(FriendContact::getUserId, uid1).eq(FriendContact::getContactId, uid2)
                .set(FriendContact::getStatus, ContactStatusEnum.FRIEND.getStatus())
                .set(FriendContact::getIsDeleted, YesOrNoEnum.NO.getStatus())
                .set(FriendContact::getVersion, version+1).update();

        lambdaUpdate().eq(FriendContact::getUserId, uid2).eq(FriendContact::getContactId, uid1)
                .set(FriendContact::getIsDeleted, YesOrNoEnum.NO.getStatus())
                .set(FriendContact::getVersion, version+1).update();
    }

    public void abandon(FriendContact contact) {
        lambdaUpdate().eq(FriendContact::getUserId, contact.getUserId())
                .eq(FriendContact::getContactId, contact.getContactId())
                .set(FriendContact::getIsDeleted, YesOrNoEnum.YES.getStatus())
                .set(FriendContact::getStatus, ContactStatusEnum.NORMAL.getStatus())
                .update();
    }

    public CursorPageResp<FriendContact> getFriendPage(Long uid, CursorPageReq cursorPageReq) {
        return CursorUtil.getCursorPageByMysql(this, cursorPageReq,
                wrapper -> wrapper.eq(FriendContact::getUserId, uid), FriendContact::getCreatedAt);
    }

    public List<ContactResp> selectFriendContactById(Long userId){
        List<FriendContact> list = lambdaQuery()
                .eq(FriendContact::getUserId, userId)
                .eq(FriendContact::getIsDeleted, YesOrNoEnum.NO.getStatus())
                .select(FriendContact::getContactId, FriendContact::getSessionId)
                .list();

        return list.stream().map(contact -> ContactResp.builder()
                .sessionId(contact.getSessionId())
                .contactId(contact.getContactId())
                .contactType(SessionTypeEnum.PRIVATE.getStatus())
                .role(null)
                .build()).toList();
    }
}
