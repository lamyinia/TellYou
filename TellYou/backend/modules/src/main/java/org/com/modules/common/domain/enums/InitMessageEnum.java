package org.com.modules.common.domain.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum InitMessageEnum {
    GROUP_CARD("欢迎加群"),
    GROUP_NOTIFICATION("抵制不良风气，构建和谐交流氛围");
    private String message;
}
