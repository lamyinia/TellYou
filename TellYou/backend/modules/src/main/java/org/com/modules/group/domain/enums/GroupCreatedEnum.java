package org.com.modules.group.domain.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum GroupCreatedEnum {
    GROUP_CARD("欢迎加群"),
    GROUP_NOTIFICATION("抵制不良风气，构建和谐交流氛围");
    private String message;
}
