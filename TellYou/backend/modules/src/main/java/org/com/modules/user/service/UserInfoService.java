package org.com.modules.user.service;

import org.com.modules.user.domain.dto.LoginDTO;
import org.com.modules.user.domain.dto.RegisterDTO;
import org.com.modules.user.domain.vo.LoginVO;
import org.springframework.stereotype.Service;

/**
* @author lanyo
* @description 针对表【user_info(用户信息)】的数据库操作Service
* @createDate 2025-07-22 20:27:43
*/
public interface UserInfoService {

    void getCheckCode(String emailAddress);

    void register(RegisterDTO registerDTO);

    LoginVO login(LoginDTO loginDTO);
}
