package org.com.modules.user.domain.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Builder;
import lombok.Data;
import org.apache.ibatis.type.JdbcType;
import org.apache.ibatis.type.StringTypeHandler;
import org.hibernate.validator.constraints.Length;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.Map;

/**
* 用户信息
* @TableName user_info
*/
@Data
@Builder
@Schema(description = "用户信息")
public class UserInfo implements Serializable {
    /**
    * 用户ID
    */
    @NotNull(message="[用户ID]不能为空")
    @Schema(description = "用户ID")
    @TableId
    private Long userId;
    /**
    * 邮箱
    */
    @Size(max= 50,message="编码长度不能超过50")
    @Schema(description = "邮箱")
    @Length(max= 50,message="编码长度不能超过50")
    private String email;
    /**
    * 昵称
    */
    @Size(max= 20,message="编码长度不能超过20")
    @Schema(description = "昵称")
    @Length(max= 20,message="编码长度不能超过20")
    private String nickName;
    /**
    * 用户头像
    */
    @Size(max= 255,message="编码长度不能超过255")
    @Schema(description = "用户头像")
    @Length(max= 255,message="编码长度不能超过255")
    private String avatar;
    /**
    * 性别 0:女 1:男
    */
    @Schema(description = "性别 0:女 1:男")
    private Integer sex;
    /**
    * 密码
    */
    @Size(max= 80,message="编码长度不能超过80")
    @Schema(description = "密码")
    @Length(max= 80,message="编码长度不能超过80")
    private String password;
    /**
    * 个性签名
    */
    @Size(max= 50,message="编码长度不能超过50")
    @Schema(description = "个性签名")
    @Length(max= 50,message="编码长度不能超过50")
    private String personalSignature;
    /**
    * 状态 1正常 0封号
    */
    @NotNull(message="[状态 1正常 0封号]不能为空")
    @Schema(description = "状态 1正常 0封号")
    private Integer status;
    /**
    * 创建时间
    */

    @NotNull(message="[创建时间]不能为空")
    @Schema(description = "创建时间")
    private LocalDateTime createTime;
    /**
    * 最后登录时间
    */
    @NotNull(message="[最后登录时间]不能为空")
    @Schema(description = "最后登录时间")
    private LocalDateTime lastLoginTime;
    /**
    * 地区
    */
    @Size(max= 50,message="编码长度不能超过50")
    @Schema(description = "地区")
    @Length(max= 50,message="编码长度不能超过50")
    private String areaName;
    /**
    * 地区编号
    */
    @Size(max= 50,message="编码长度不能超过50")
    @Schema(description = "地区编号")
    @Length(max= 50,message="编码长度不能超过50")
    private String areaCode;
    /**
    * ip信息
    */
    @Schema(description = "额外信息")
    private Object identifier;
    /**
    * 剩余改名次数
    */
    @NotNull(message="剩余改名、改性别、改签名、改头像次数")
    @Schema(description = "剩余改名次数")
    private Object residues;
    /**
     * 最后离开时间
     */
    @NotNull(message="[最后离开时间]不能为空")
    @Schema(description = "最后离开时间")
    private LocalDateTime lastOffTime;
}
