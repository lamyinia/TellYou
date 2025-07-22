package org.com.modules.user.domain.entity;

import javax.validation.constraints.Size;
import javax.validation.constraints.NotNull;

import java.io.Serializable;

import java.time.LocalDateTime;

import com.baomidou.mybatisplus.annotation.TableId;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import org.hibernate.validator.constraints.Length;

/**
* 用户信息
* @TableName user_info
*/
@Data
@Schema(description = "用户信息")
public class UserInfo implements Serializable {

    /**
    * 用户ID
    */
    @NotNull(message="[用户ID]不能为空")
    @Schema(description = "用户ID")
    @TableId
    private Long user_id;
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
    private String nick_name;
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
    @Size(max= 32,message="编码长度不能超过32")
    @Schema(description = "密码")
    @Length(max= 32,message="编码长度不能超过32")
    private String password;
    /**
    * 个性签名
    */
    @Size(max= 50,message="编码长度不能超过50")
    @Schema(description = "个性签名")
    @Length(max= 50,message="编码长度不能超过50")
    private String personal_signature;
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
    private LocalDateTime create_time;
    /**
    * 最后登录时间
    */
    @NotNull(message="[最后登录时间]不能为空")
    @Schema(description = "最后登录时间")
    private LocalDateTime last_login_time;
    /**
    * 地区
    */
    @Size(max= 50,message="编码长度不能超过50")
    @Schema(description = "地区")
    @Length(max= 50,message="编码长度不能超过50")
    private String area_name;
    /**
    * 地区编号
    */
    @Size(max= 50,message="编码长度不能超过50")
    @Schema(description = "地区编号")
    @Length(max= 50,message="编码长度不能超过50")
    private String area_code;
    /**
    * ip信息
    */
    @Schema(description = "ip信息")
    private Object ip_info;
    /**
    * 最后离开时间
    */
    @NotNull(message="[最后离开时间]不能为空")
    @Schema(description = "最后离开时间")
    private LocalDateTime last_off_time;
    /**
    * 剩余改名次数
    */
    @NotNull(message="[剩余改名次数]不能为空")
    @Schema(description = "剩余改名次数")
    private Integer remaining_name_change;
}
