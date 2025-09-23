package org.com.modules.user.service.adapter;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.vavr.control.Try;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.user.domain.entity.UserInfo;
import org.com.modules.user.domain.vo.req.RegisterReq;
import org.com.modules.user.domain.vo.resp.LoginResp;
import org.com.tools.constant.ValueConstant;
import org.com.tools.utils.JsonUtils;
import org.com.tools.utils.SecurityUtil;

import java.util.HashMap;
import java.util.Map;

@Slf4j
public class UserInfoAdapter {
    private static final ObjectMapper objectMapper = new ObjectMapper();

    public static UserInfo buildUserInfo(RegisterReq registerReq){
        return UserInfo.builder()
                .email(registerReq.getEmail())
                .nickName(registerReq.getNickName())
                .sex(registerReq.getSex())
                .password(SecurityUtil.encode(registerReq.getPassword()))
                .personalSignature(ValueConstant.DEFAULT_SIGNATURE)
                .avatar(ValueConstant.DEFAULT_AVATAR)
                .identifier(JsonUtils.toStr(getDefaultIdentifier()))
                .residues(JsonUtils.toStr(getDefaultResidues()))
                .build();
    }
    public static LoginResp buildVo(UserInfo userInfo, String token){
        Map<String, Object> residues = parseResidues(userInfo.getResidues());

        return LoginResp.builder()
                .uid(userInfo.getUserId())
                .token(token)
                .nickname(userInfo.getNickName())
                .nicknameResidue((Integer) residues.get(ValueConstant.DEFAULT_NICKNAME_RESIDUE_KEY))
                .sex(userInfo.getSex() == 1 ? "男" : "女")
                .sexResidue((Integer) residues.get(ValueConstant.DEFAULT_SEX_RESIDUE_KEY))
                .signature(userInfo.getPersonalSignature())
                .signatureResidue((Integer) residues.get(ValueConstant.DEFAULT_SIGNATURE_RESIDUE_KEY))
                .avatarUrl(userInfo.getAvatar())
                .avatarResidue((Integer) residues.get(ValueConstant.DEFAULT_AVATAR_RESIDUE_KEY))
                .build();
    }
    /**
     * 解析 identifier 字段
     * @param identifier 扩展信息对象
     * @return 解析后的Map
     */
    public static Map<String, Object> parseIdentifier(Object identifier) {
        return Try.of(() -> identifier)
                .filter(String.class::isInstance)
                .map(String.class::cast)
                .map(JsonUtils::toMap)
                .onFailure(e -> log.warn("解析 identifier 失败: {}", e.getMessage()))
                .getOrElse(getDefaultIdentifier());
    }
    /**
     * 解析 residues 字段
     * @param residues 扩展信息对象
     * @return 解析后的Map
     */
    public static Map<String, Object> parseResidues(Object residues) {
        return Try.of(() -> residues)
                .filter(String.class::isInstance)
                .map(String.class::cast)
                .map(JsonUtils::toMap)
                .onFailure(e -> log.warn("解析 residues 失败: {}", e.getMessage()))
                .getOrElse(UserInfoAdapter::getDefaultResidues);
    }
    public static Map<String, Object> getDefaultIdentifier() {
        Map<String, Object> defaultIdentifier = new HashMap<>();
        defaultIdentifier.put(ValueConstant.DEFAULT_AVATAR_VERSION_KEY, 1);
        defaultIdentifier.put(ValueConstant.DEFAULT_NICKNAME_VERSION_KEY, 1);
        return defaultIdentifier;
    }
    public static Map<String, Object> getDefaultResidues() {
        Map<String, Object> defaultResidues = new HashMap<>();
        defaultResidues.put(ValueConstant.DEFAULT_AVATAR_RESIDUE_KEY, 3);
        defaultResidues.put(ValueConstant.DEFAULT_NICKNAME_RESIDUE_KEY, 3);
        defaultResidues.put(ValueConstant.DEFAULT_SIGNATURE_RESIDUE_KEY, 3);
        defaultResidues.put(ValueConstant.DEFAULT_SEX_RESIDUE_KEY, 3);
        return defaultResidues;
    }
}
