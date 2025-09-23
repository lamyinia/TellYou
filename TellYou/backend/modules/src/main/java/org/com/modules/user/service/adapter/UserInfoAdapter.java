package org.com.modules.user.service.adapter;

import lombok.extern.slf4j.Slf4j;
import org.com.modules.user.domain.entity.UserInfo;
import org.com.modules.user.domain.vo.req.RegisterReq;
import org.com.modules.user.domain.vo.resp.LoginResp;
import org.com.tools.constant.ValueConstant;
import org.com.tools.utils.JsonUtils;
import org.com.tools.utils.SecurityUtil;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

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
                .identifier(getDefaultIdentifier())
                .residues(getDefaultResidues())
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
        try {
            if (identifier == null) {
                return getDefaultIdentifier();
            }
            if (identifier instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> map = (Map<String, Object>) identifier;
                return map;
            } else if (identifier instanceof String) {
                return JsonUtils.toMap((String) identifier);
            } else {
                log.warn("identifier 类型不支持，使用默认值: {}", identifier.getClass().getSimpleName());
                return getDefaultIdentifier();
            }
        } catch (Exception e) {
            log.warn("解析 identifier 失败，使用默认值: {}", e.getMessage());
            return getDefaultIdentifier();
        }
    }
    /**
     * 解析 residues 字段
     * @param residues 扩展信息对象
     * @return 解析后的Map
     */
    public static Map<String, Object> parseResidues(Object residues) {
        try {
            if (residues == null) {
                return getDefaultResidues();
            }
            if (residues instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> map = (Map<String, Object>) residues;
                return map;
            } else if (residues instanceof String) {
                return JsonUtils.toMap((String) residues);
            } else {
                log.warn("residues 类型不支持，使用默认值: {}", residues.getClass().getSimpleName());
                return getDefaultResidues();
            }
        } catch (Exception e) {
            log.warn("解析 residues 失败，使用默认值: {}", e.getMessage());
            return getDefaultResidues();
        }
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
