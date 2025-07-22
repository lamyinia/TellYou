package org.com.modules.user.service;

import org.springframework.stereotype.Service;

/**
* @author lanyo
* @description 针对表【user_info(用户信息)】的数据库操作Service
* @createDate 2025-07-22 20:27:43
*/
@Service
public interface UserInfoService {

    void getCheckCode(String emailAddress);
}
