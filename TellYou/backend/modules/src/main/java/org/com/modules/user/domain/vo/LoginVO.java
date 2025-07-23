package org.com.modules.user.domain.vo;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.io.Serializable;

@Data
@AllArgsConstructor
public class LoginVO implements Serializable {
    private String token;
}
