package org.com.modules.media.domain.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum MediaTypeEnum {
    IMAGE("image"),
    VOICE("voice"),
    VIDEO("video"),
    FILE("file");

    private String value;
}
