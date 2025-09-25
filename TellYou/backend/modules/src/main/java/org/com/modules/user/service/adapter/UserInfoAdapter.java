package org.com.modules.user.service.adapter;

import io.vavr.control.Try;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.user.domain.entity.UserInfo;
import org.com.modules.user.domain.vo.req.RegisterReq;
import org.com.modules.user.domain.vo.resp.LoginResp;
import org.com.modules.user.domain.vo.resp.SearchByUidResp;
import org.com.tools.constant.ValueConstant;
import org.com.tools.utils.JsonUtils;
import org.com.tools.utils.SecurityUtil;

import java.util.HashMap;
import java.util.Map;

@Slf4j
public class UserInfoAdapter {

    public static UserInfo buildUserInfo(RegisterReq registerReq){
        UserInfo userInfo = new UserInfo();
        userInfo.setEmail(registerReq.getEmail());
        userInfo.setPassword(registerReq.getPassword());
        userInfo.setNickName(registerReq.getNickName());
        userInfo.setSex(registerReq.getSex());
        userInfo.setPassword(ValueConstant.DEFAULT_SIGNATURE);
        userInfo.setAvatar(ValueConstant.DEFAULT_AVATAR);
        userInfo.setIdentifier(JsonUtils.toStr(getDefaultIdentifier()));
        userInfo.setResidues(JsonUtils.toStr(getDefaultResidues()));
        return userInfo;
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
            if (identifier instanceof String) {
                return JsonUtils.toMap((String) identifier);
            }
        } catch (Exception e) {
            log.warn("解析 identifier 失败: {}", e.getMessage());
        }
        return getDefaultIdentifier();
    }
    /**
     * 解析 residues 字段
     * @param residues 扩展信息对象
     * @return 解析后的Map
     */
    public static Map<String, Object> parseResidues(Object residues) {
        try {
            if (residues instanceof String) {
                return JsonUtils.toMap((String) residues);
            }
        } catch (Exception e) {
            log.warn("解析 residues 失败: {}", e.getMessage());
        }
        return getDefaultResidues();
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

    /**
     * 将 UserInfo 转换为 SearchByUidResp
     * @param userInfo 用户信息实体
     * @return 搜索响应对象
     */
    public static SearchByUidResp buildSearchByUidResp(UserInfo userInfo) {
        SearchByUidResp resp = new SearchByUidResp();
        if (userInfo == null) {
            resp.setUserId(-1L);
        } else {
            resp.setUserId(userInfo.getUserId());
            resp.setNickname(userInfo.getNickName());
            resp.setAvatar(userInfo.getAvatar());
            resp.setSex(userInfo.getSex());
            resp.setSignature(userInfo.getPersonalSignature());
        }

        return resp;
    }
}
