package org.com.social.application;

import lombok.RequiredArgsConstructor;
import org.com.social.infrastructure.persistence.mapper.UserDetailMapper;
import org.com.social.infrastructure.persistence.mapper.UserProfileMapper;
import org.com.social.infrastructure.persistence.po.UserDetailDO;
import org.com.social.infrastructure.persistence.po.UserProfileDO;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ProfileApplicationService {
    private final UserProfileMapper userProfileMapper;
    private final UserDetailMapper userDetailMapper;

    @Transactional
    public boolean createDefaultProfile(long userId, String nickName, int sex) {
        UserProfileDO existing = userProfileMapper.selectById(userId);
        if (existing != null) {
            return false;
        }

        int normalizedSex = (sex == 0 || sex == 1 || sex == 2) ? sex : 2;

        UserProfileDO profile = new UserProfileDO();
        profile.setUserId(userId);
        profile.setNickName(nickName);
        profile.setSex(normalizedSex);
        profile.setAvatarVersion(1);
        profile.setNicknameVersion(1);

        UserDetailDO detail = new UserDetailDO();
        detail.setUserId(userId);
        detail.setRenameTimesLeft(1);
        detail.setImIdTimesLeft(1);
        detail.setAvatarTimesLeft(10);
        detail.setSignatureTimesLeft(10);

        userProfileMapper.insert(profile);
        userDetailMapper.insert(detail);

        return true;
    }
}
