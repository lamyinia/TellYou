package org.com.modules.user.domain.vo.resp;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.io.Serializable;

@Data
@AllArgsConstructor
public class LoginResp implements Serializable {
    private String token;
}
