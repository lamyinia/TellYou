package org.com.modules.user.service.impl;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.com.modules.user.dao.UserInfoDao;
import org.com.modules.user.domain.vo.req.LoginReq;
import org.com.modules.user.domain.vo.req.RegisterReq;
import org.com.modules.user.domain.entity.UserInfo;
import org.com.modules.user.domain.vo.resp.LoginResp;
import org.com.modules.user.service.UserInfoService;
import org.com.tools.exception.BusinessException;
import org.com.tools.utils.JwtUtil;
import org.com.tools.utils.SecurityUtil;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.TimeUnit;


/**
* @author lanyo
* @description 针对表【user_info(用户信息)】的数据库操作Service实现
* @createDate 2025-07-22 20:27:43
*/
@Slf4j
@Service
@RequiredArgsConstructor
public class UserInfoServiceImpl implements UserInfoService {
    private final UserInfoDao userInfoDao;
    private final JavaMailSender javaMailSender;
    private final RedisTemplate redisTemplate;
    private final JwtUtil jwtUtil;

    private static final String REDIS_CODE_PREFIX = "register:code:";
    private static final int CODE_EXPIRE_MINUTES = 5;

    // TODO 流量控制
    @Override
    public LoginResp login(LoginReq loginReq) {
        UserInfo user = userInfoDao.getByEmail(loginReq.getEmail());
        if (Objects.isNull(user) || !user.getPassword().equals( SecurityUtil.encode(loginReq.getPassword()) )){
            throw new BusinessException(20003, "用户密码错误");  // TODO 错误枚举类完善
        }
        if (user.getStatus().equals(0)){
            throw new BusinessException(20004, "改用户已被封号处理");
        }

        Map <String, Object> claims = new HashMap<>();
        claims.put(jwtUtil.getJwtProperties().getUidKey(), user.getUserId());
        String token = jwtUtil.createJwt(claims);

        return new LoginResp(token);
    }

    @Override
    public void register(RegisterReq dto) {
        String key = REDIS_CODE_PREFIX + dto.getEmail();
        String code = (String) redisTemplate.opsForValue().get(key);
        if (StringUtils.isEmpty(code) || !StringUtils.equals(code, dto.getCode())){
            throw new BusinessException(20002, "验证码校验错误");
        }

        UserInfo user = UserInfo.builder().email(dto.getEmail()).nickName(dto.getNickName()).sex(dto.getSex())
                .password(SecurityUtil.encode(dto.getPassword())).personalSignature("万般通祇，彼岸花开")
                .build();

        userInfoDao.save(user);
        redisTemplate.delete(code);
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
}




