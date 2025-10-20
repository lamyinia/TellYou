package org.com.modules.user.service.impl;

import io.seata.spring.annotation.GlobalTransactional;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.com.modules.common.annotation.RedissonLocking;
import org.com.modules.media.domain.vo.req.AvatarUploadConfirmReq;
import org.com.modules.media.service.minio.DownloadService;
import org.com.modules.media.service.minio.UploadFileService;
import org.com.modules.common.util.UrlUtil;
import org.com.modules.user.dao.UserInfoDao;
import org.com.modules.user.domain.entity.UserInfo;
import org.com.modules.user.domain.vo.req.*;
import org.com.modules.user.domain.vo.resp.LoginResp;
import org.com.modules.user.domain.vo.resp.SearchByUidResp;
import org.com.modules.user.domain.vo.resp.SimpleUserInfo;
import org.com.modules.user.domain.vo.resp.SimpleUserInfoList;
import org.com.modules.user.service.UserInfoService;
import org.com.modules.user.service.adapter.UserInfoAdapter;
import org.com.tools.constant.ValueConstant;
import org.com.tools.exception.BusinessException;
import org.com.tools.template.MinioTemplate;
import org.com.tools.utils.JsonUtils;
import org.com.tools.utils.JwtUtil;
import org.com.tools.utils.SecurityUtil;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.TimeUnit;


/**
* @author lanye
* @description 针对表user_info(用户信息)的数据库操作Service实现
* @createDate 2025-07-22 20:27:43
*/
@Slf4j
@Service
@RequiredArgsConstructor
public class UserInfoServiceImpl implements UserInfoService {
    private final MinioTemplate minioTemplate;
    private final RedisTemplate<String, Object> redisTemplate;
    private final UploadFileService uploadFileService;
    private final DownloadService downloadService;
    private final UserInfoDao userInfoDao;
    private final JavaMailSender javaMailSender;
    private final JwtUtil jwtUtil;

    private static final String REDIS_CODE_PREFIX = "register:code:";
    private static final int CODE_EXPIRE_MINUTES = 5;

    @Override
    public LoginResp login(LoginReq loginReq) {
        UserInfo userInfo = userInfoDao.getByEmail(loginReq.getEmail());
        if (Objects.isNull(userInfo) || !userInfo.getPassword().equals( SecurityUtil.encode(loginReq.getPassword()) )){
            throw new BusinessException(20003, "用户密码错误");  // TODO 错误枚举类完善
        }
        if (userInfo.getStatus().equals(0)){
            throw new BusinessException(20004, "改用户已被封号处理");
        }

        Map <String, Object> claims = new HashMap<>();
        claims.put(jwtUtil.getJwtProperties().getUidKey(), userInfo.getUserId());
        String token = jwtUtil.createJwt(claims);

        return UserInfoAdapter.buildVo(userInfo, token);
    }

    @Override
    @Transactional
    @GlobalTransactional
    public void register(RegisterReq registerReq) {
        if (Objects.nonNull(userInfoDao.getByEmail(registerReq.getEmail()))){
            throw new BusinessException(20001, "邮箱已经注册");
        }

        String key = REDIS_CODE_PREFIX + registerReq.getEmail();
        String code = (String) redisTemplate.opsForValue().get(key);
        if (!ValueConstant.IS_DEVELOPMENT){
            if (StringUtils.isEmpty(code) || !StringUtils.equals(code, registerReq.getCode())){
                throw new BusinessException(20002, "验证码校验错误");
            }
        }

        UserInfo user = UserInfoAdapter.buildUserInfo(registerReq);
        userInfoDao.save(user);
        redisTemplate.delete(key);

        Map <String, Object> atomFile = new HashMap<>();
        String uid = String.valueOf(user.getUserId());
        String avatarUrl = UrlUtil.getFirstOriginalAvatar(minioTemplate.getHost(), uid);
        userInfoDao.lambdaUpdate()
                .eq(UserInfo::getUserId, user.getUserId())
                .set(UserInfo::getAvatar, avatarUrl)
                .update();

        // 写入 minIO 用户信息
        atomFile.put(ValueConstant.DEFAULT_AVATAR_VERSION_KEY, ValueConstant.DEFAULT_VALUE);
        atomFile.put(ValueConstant.DEFAULT_NICKNAME_VERSION_KEY, ValueConstant.DEFAULT_VALUE);
        atomFile.put(ValueConstant.DEFAULT_ORIGIN_AVATAR_URL_KRY, avatarUrl);
        atomFile.put(ValueConstant.DEFAULT_THUMB_AVATAR_URL_KEY, UrlUtil.getFirstThumbAvatar(minioTemplate.getHost(), uid));
        atomFile.put(ValueConstant.DEFAULT_NICKNAME_KEY, user.getNickName());

        uploadFileService.writeDefaultAvatar(UrlUtil.getFirstOriginalAvatar(uid));
        uploadFileService.writeDefaultAvatar(UrlUtil.getFirstThumbAvatar(uid));
        uploadFileService.writeAtomJson(uid, atomFile);
    }

    @Override
    public void getCheckCode(String emailAddress) {
        if (Objects.nonNull(userInfoDao.getByEmail(emailAddress))){
            throw new BusinessException(20001, "邮箱已经注册");
        }

        String code = String.valueOf((int) ((Math.random() * 9 + 1) * 100000));
        redisTemplate.opsForValue().set(REDIS_CODE_PREFIX + emailAddress, code,
                CODE_EXPIRE_MINUTES, TimeUnit.MINUTES);

        sendVerification(emailAddress, code);
    }

    private void sendVerification(String email, String code) {
        MimeMessage message = javaMailSender.createMimeMessage();
        try {
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom("a13579a18@qq.com"); // 使用专用发件地址
            helper.setTo(email);
            helper.setSubject("【重要】您的注册验证码 - 请勿回复");

            String content = "<div style='font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;'>"
                    + "<h2 style='color: #333;'>感谢您注册我们的服务</h2>"
                    + "<p>您的验证码为：<strong style='font-size: 18px;'>" + code + "</strong></p>"
                    + "<p>请在 " + CODE_EXPIRE_MINUTES + " 分钟内使用该验证码完成注册</p>"
                    + "<hr style='border-top: 1px solid #eee; margin: 20px 0;'>"
                    + "<p style='font-size: 12px; color: #999;'>此为系统自动发送邮件，请勿直接回复。"
                    + "如非本人操作请忽略此邮件。</p>"
                    + "</div>";

            helper.setText(content, true);
            javaMailSender.send(message);
            log.info("验证码邮件已发送至: {}", email);
        } catch (MessagingException e) {
            log.error("邮件发送失败: {}", email, e);
            throw new RuntimeException(e);
        }
    }

    @Override
    @RedissonLocking(prefixKey = "user:setting", key="#uid")
    public void confirmAvatarUpload(Long uid, AvatarUploadConfirmReq req) {
        try {
            UserInfo userInfo = userInfoDao.getById(uid);
            if (userInfo == null) {
                throw new BusinessException(20005, "用户不存在");
            }

            Map<String, Object> identifier = UserInfoAdapter.parseIdentifier(userInfo.getIdentifier());
            Map<String, Object> residues = UserInfoAdapter.parseResidues(userInfo.getResidues());
            Integer avatarResidue = (Integer) residues.getOrDefault(ValueConstant.DEFAULT_AVATAR_RESIDUE_KEY, 3);
            Integer currentAvatarVersion = (Integer) identifier.getOrDefault(ValueConstant.DEFAULT_AVATAR_VERSION_KEY, 1);

            if (avatarResidue <= 0) throw new BusinessException(20006, "头像修改次数不够");
            if (!minioTemplate.objectExists(req.getOriginalUploadUrl()) || !minioTemplate.objectExists(req.getThumbnailUploadUrl())
                    || UrlUtil.extractVersionFromUrl(req.getOriginalUploadUrl()) != currentAvatarVersion + 1
            || UrlUtil.extractVersionFromUrl(req.getThumbnailUploadUrl()) != currentAvatarVersion + 1){
                throw new BusinessException(20007, "url 路径不合法");
            }

            Map <String, Object> atomFile = downloadService.getAtomJson(String.valueOf(uid));
            residues.put(ValueConstant.DEFAULT_AVATAR_RESIDUE_KEY, avatarResidue - 1);
            identifier.put(ValueConstant.DEFAULT_AVATAR_VERSION_KEY, currentAvatarVersion + 1);
            atomFile.put(ValueConstant.DEFAULT_AVATAR_VERSION_KEY, currentAvatarVersion + 1);
            atomFile.put(ValueConstant.DEFAULT_ORIGIN_AVATAR_URL_KRY, minioTemplate.getHost() + req.getOriginalUploadUrl());
            atomFile.put(ValueConstant.DEFAULT_THUMB_AVATAR_URL_KEY, minioTemplate.getHost() + req.getThumbnailUploadUrl());

            String identifierJson = JsonUtils.toStr(identifier);
            String residuesJson = JsonUtils.toStr(residues);

            userInfoDao.lambdaUpdate()
                    .eq(UserInfo::getUserId, uid)
                    .set(UserInfo::getIdentifier, identifierJson)
                    .set(UserInfo::getResidues, residuesJson)
                    .set(UserInfo::getAvatar, minioTemplate.getHost() + req.getOriginalUploadUrl())
                    .update();
            userInfoDao.evictIdentifierCache(uid);
            uploadFileService.writeAtomJson(String.valueOf(uid), atomFile);

            log.info("用户 {} 头像版本号已更新: {} -> {}", uid, currentAvatarVersion, currentAvatarVersion + 1);
            log.info("用户 {} 头像剩余更换次数: {} -> {}", uid, avatarResidue, avatarResidue - 1);

        } catch (BusinessException e){
            throw e;
        } catch (Exception e) {
            log.error("确认头像上传失败，用户ID: {}", uid, e);
            throw new BusinessException(20008, "头像上传确认失败");
        }
    }

    @Override
    @RedissonLocking(prefixKey = "user:setting", key="#req.fromUid")
    public void modifyNickname(ModifyNicknameReq req) {
        try {
            String uid = String.valueOf(req.getFromUid());
            UserInfo userInfo = userInfoDao.getById(req.getFromUid());
            if (userInfo == null) {
                throw new BusinessException(20005, "用户不存在");
            }

            Map<String, Object> identifier = UserInfoAdapter.parseIdentifier(userInfo.getIdentifier());
            Map<String, Object> residues = UserInfoAdapter.parseResidues(userInfo.getResidues());
            Integer currentNicknameVersion = (Integer) identifier.getOrDefault(ValueConstant.DEFAULT_NICKNAME_VERSION_KEY, 1);
            Integer nicknameResidue = (Integer) residues.getOrDefault(ValueConstant.DEFAULT_NICKNAME_RESIDUE_KEY, 3);

            if (nicknameResidue <= 0) throw new BusinessException(20009, "昵称修改次数不够");

            Map <String, Object> atomFile = downloadService.getAtomJson(uid);

            identifier.put(ValueConstant.DEFAULT_NICKNAME_VERSION_KEY, currentNicknameVersion + 1);
            residues.put(ValueConstant.DEFAULT_NICKNAME_RESIDUE_KEY, nicknameResidue - 1);
            atomFile.put(ValueConstant.DEFAULT_NICKNAME_VERSION_KEY, currentNicknameVersion + 1);
            atomFile.put(ValueConstant.DEFAULT_NICKNAME_KEY, req.getNewNickname());

            userInfoDao.lambdaUpdate()
                    .eq(UserInfo::getUserId, req.getFromUid())
                    .set(UserInfo::getIdentifier, JsonUtils.toStr(identifier))
                    .set(UserInfo::getResidues, JsonUtils.toStr(residues))
                    .set(UserInfo::getNickName, req.getNewNickname())
                    .update();
            uploadFileService.writeAtomJson(uid, atomFile);

            log.info("用户 {} 名称版本号已更新: {} -> {}", req.getFromUid(), currentNicknameVersion, currentNicknameVersion + 1);
            log.info("用户 {} 名称剩余更换次数: {} -> {}", req.getFromUid(), nicknameResidue, nicknameResidue - 1);

        } catch (BusinessException e){
            throw e;
        } catch (Exception e) {
            log.error("修改名字失败，用户ID: {}", req.getFromUid(), e);
            throw new BusinessException(20010, "修改名字失败");
        }

    }

    @Override
    @RedissonLocking(prefixKey = "user:setting", key="#req.fromUid")
    public void modifySignature(ModifySignatureReq req) {
        UserInfo userInfo = userInfoDao.getById(req.getFromUid());
        if (userInfo == null) {
            throw new BusinessException(20005, "用户不存在");
        }

        Map<String, Object> residues = UserInfoAdapter.parseResidues(userInfo.getResidues());
        Integer signatureResidue = (Integer) residues.getOrDefault(ValueConstant.DEFAULT_SIGNATURE_RESIDUE_KEY, 3);

        if (signatureResidue <= 0) throw new BusinessException(20011, "签名修改次数不够");

        residues.put(ValueConstant.DEFAULT_SIGNATURE_RESIDUE_KEY, signatureResidue - 1);

        userInfoDao.lambdaUpdate()
                .eq(UserInfo::getUserId, req.getFromUid())
                .set(UserInfo::getResidues, JsonUtils.toStr(residues))
                .set(UserInfo::getPersonalSignature, req.getNewSignature())
                .update();

        log.info("用户 {} 新签名: {}", req.getFromUid(), req.getNewSignature());
    }

    @Override
    public SearchByUidResp SearchByUidResp(SearchByUidReq req) {
        return userInfoDao.getBaseInfo(req.getSearchedId());
    }

    @Override
    public SimpleUserInfoList getBaseInfoList(List<Long> targetList) {
        List<SimpleUserInfo> resp = userInfoDao.getBaseInfoList(targetList);
        return new SimpleUserInfoList(resp);
    }
}




