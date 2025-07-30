package org.com.modules.user.domain.vo.req;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.ToString;

import java.io.Serializable;

@Data
@ToString
public class RegisterReq implements Serializable {
    @NotBlank(message = "邮箱不能为空")
    @Email(message = "邮箱格式不正确")
    private String email;

    @NotBlank(message = "验证码不能为空")
    @Size(min = 6, max = 6, message = "验证码必须是6位")
    private String code;

    @NotBlank(message = "密码不能为空")
    @Size(min = 6, max = 20, message = "密码长度需在6-20字符之间")
    private String password;

    @NotBlank(message = "昵称不能为空")
    @Size(max = 20, message = "昵称最长20个字符")
    private String nickName;

    private Integer sex;
}