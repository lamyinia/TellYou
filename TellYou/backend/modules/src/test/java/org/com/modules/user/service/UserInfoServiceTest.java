package org.com.modules.user.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.com.modules.user.dao.UserInfoDao;
import org.com.modules.user.domain.entity.UserInfo;
import org.com.modules.user.service.impl.UserInfoServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * UserInfoService 测试类
 */
@ExtendWith(MockitoExtension.class)
class UserInfoServiceTest {

    @Mock
    private UserInfoDao userInfoDao;

    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private UserInfoServiceImpl userInfoService;

    @Test
    void testConfirmAvatarUpload_WithValidExtInfo() throws Exception {
        // 准备测试数据
        Long uid = 123L;
        String extInfoJson = "{\"nameVersion\": 1, \"avatarVersion\": 2}";
        
        UserInfo userInfo = UserInfo.builder()
                .userId(uid)
                .extInfo(extInfoJson)
                .build();

        Map<String, Object> extInfoMap = new HashMap<>();
        extInfoMap.put("nameVersion", 1);
        extInfoMap.put("avatarVersion", 2);

        Map<String, Object> updatedExtInfoMap = new HashMap<>();
        updatedExtInfoMap.put("nameVersion", 1);
        updatedExtInfoMap.put("avatarVersion", 3);

        String updatedExtInfoJson = "{\"nameVersion\": 1, \"avatarVersion\": 3}";

        // Mock 行为
        when(userInfoDao.getById(uid)).thenReturn(userInfo);
        when(objectMapper.readValue(extInfoJson, any())).thenReturn(extInfoMap);
        when(objectMapper.writeValueAsString(updatedExtInfoMap)).thenReturn(updatedExtInfoJson);
        when(userInfoDao.lambdaUpdate()).thenReturn(userInfoDao.lambdaUpdate());
        when(userInfoDao.lambdaUpdate().eq(any(), any())).thenReturn(userInfoDao.lambdaUpdate());
        when(userInfoDao.lambdaUpdate().set(any(), any())).thenReturn(userInfoDao.lambdaUpdate());
        when(userInfoDao.lambdaUpdate().update()).thenReturn(true);

        // 执行测试
        userInfoService.confirmAvatarUpload(uid);

        // 验证结果
        verify(userInfoDao).getById(uid);
        verify(objectMapper).readValue(extInfoJson, any());
        verify(objectMapper).writeValueAsString(updatedExtInfoMap);
        verify(userInfoDao.lambdaUpdate()).eq(eq(UserInfo::getUserId), eq(uid));
        verify(userInfoDao.lambdaUpdate()).set(eq(UserInfo::getExtInfo), eq(updatedExtInfoJson));
        verify(userInfoDao.lambdaUpdate()).update();
    }

    @Test
    void testConfirmAvatarUpload_WithNullExtInfo() throws Exception {
        // 准备测试数据
        Long uid = 123L;
        
        UserInfo userInfo = UserInfo.builder()
                .userId(uid)
                .extInfo(null)
                .build();

        Map<String, Object> defaultExtInfoMap = new HashMap<>();
        defaultExtInfoMap.put("nameVersion", 1);
        defaultExtInfoMap.put("avatarVersion", 1);

        Map<String, Object> updatedExtInfoMap = new HashMap<>();
        updatedExtInfoMap.put("nameVersion", 1);
        updatedExtInfoMap.put("avatarVersion", 2);

        String updatedExtInfoJson = "{\"nameVersion\": 1, \"avatarVersion\": 2}";

        // Mock 行为
        when(userInfoDao.getById(uid)).thenReturn(userInfo);
        when(objectMapper.writeValueAsString(updatedExtInfoMap)).thenReturn(updatedExtInfoJson);
        when(userInfoDao.lambdaUpdate()).thenReturn(userInfoDao.lambdaUpdate());
        when(userInfoDao.lambdaUpdate().eq(any(), any())).thenReturn(userInfoDao.lambdaUpdate());
        when(userInfoDao.lambdaUpdate().set(any(), any())).thenReturn(userInfoDao.lambdaUpdate());
        when(userInfoDao.lambdaUpdate().update()).thenReturn(true);

        // 执行测试
        userInfoService.confirmAvatarUpload(uid);

        // 验证结果
        verify(userInfoDao).getById(uid);
        verify(objectMapper).writeValueAsString(updatedExtInfoMap);
        verify(userInfoDao.lambdaUpdate()).update();
    }

    @Test
    void testConfirmAvatarUpload_UserNotFound() {
        // 准备测试数据
        Long uid = 123L;

        // Mock 行为
        when(userInfoDao.getById(uid)).thenReturn(null);

        // 执行测试并验证异常
        assertThrows(Exception.class, () -> userInfoService.confirmAvatarUpload(uid));
        
        verify(userInfoDao).getById(uid);
        verifyNoMoreInteractions(userInfoDao);
    }
}
