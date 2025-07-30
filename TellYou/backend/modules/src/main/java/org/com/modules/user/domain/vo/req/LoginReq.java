package org.com.modules.user.domain.vo.req;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.io.Serializable;

@Data
public class LoginReq implements Serializable {
    @NotBlank
    private String email;
    @NotBlank
    private String password;
}
