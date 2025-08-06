package org.com.modules.session.domain.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum GroupRoleEnum {
    MEMBER(1),
    MANAGER(2),
    OWNER(3);

    private final Integer role;
}
