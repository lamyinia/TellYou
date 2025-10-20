package org.com.modules.user.service;

import org.com.modules.media.domain.vo.req.AvatarUploadConfirmReq;
import org.com.modules.user.domain.vo.req.*;
import org.com.modules.user.domain.vo.resp.LoginResp;
import org.com.modules.user.domain.vo.resp.SearchByUidResp;
import org.com.modules.user.domain.vo.resp.SimpleUserInfoList;

import java.util.List;

/**
 * 针对表 user_info(用户信息) 的数据库操作Service
* @author lanye
* @createDate 2025-07-22 20:27:43
*/
public interface UserInfoService {

    void getCheckCode(String emailAddress);

    void register(RegisterReq registerReq);

    LoginResp login(LoginReq loginReq);

    void confirmAvatarUpload(Long uid, AvatarUploadConfirmReq req);

    void modifyNickname(ModifyNicknameReq req);

    void modifySignature(ModifySignatureReq req);

    SearchByUidResp SearchByUidResp(SearchByUidReq req);

    SimpleUserInfoList getBaseInfoList(List<Long> targetList);
}
