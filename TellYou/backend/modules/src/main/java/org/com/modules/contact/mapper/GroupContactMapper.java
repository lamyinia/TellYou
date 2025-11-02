package org.com.modules.contact.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import org.apache.ibatis.annotations.Param;
import org.com.modules.contact.domain.entity.GroupContact;
import org.com.modules.group.domain.vo.req.InvitableFriendListReq;
import org.com.modules.group.domain.vo.resp.InvitableFriendResp;

/**
* @author lanye
* @since 2025-08-03 19:58:46
*/
public interface GroupContactMapper extends BaseMapper<GroupContact> {

    /**
     * 分页查询可邀请的好友列表（排除已在群内的好友和黑名单中的好友）
     * @param page 分页对象
     * @param req 查询参数
     * @return 分页结果
     */
    IPage<InvitableFriendResp> getInvitableFriendList(Page<InvitableFriendResp> page, @Param("req") InvitableFriendListReq req);
}




