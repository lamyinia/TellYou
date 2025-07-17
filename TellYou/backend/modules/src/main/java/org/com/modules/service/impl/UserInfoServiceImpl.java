package org.com.modules.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.com.modules.domain.UserInfo;
import org.com.modules.mapper.UserInfoMapper;
import org.com.modules.service.UserInfoService;
import org.springframework.stereotype.Service;

/**
* @author lanyo
* @description 针对表【user_info(用户信息)】的数据库操作Service实现
* @createDate 2025-07-17 11:55:33
*/
@Service
public class UserInfoServiceImpl extends ServiceImpl<UserInfoMapper, UserInfo>
    implements UserInfoService {

}




