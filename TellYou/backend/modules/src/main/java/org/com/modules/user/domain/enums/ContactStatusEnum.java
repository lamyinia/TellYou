package org.com.modules.user.domain.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;
import org.com.modules.common.domain.enums.YesOrNoEnum;

import java.util.Arrays;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Getter
@AllArgsConstructor
public enum ContactStatusEnum {
    FRIEND(1, "好友"),
    NORMAL(2, "非好友");

    private final Integer status;
    private final String option;

    private static Map<Integer, ContactStatusEnum> cache;
    static {
        cache = Arrays.stream(ContactStatusEnum.values()).collect(
                Collectors.toMap(ContactStatusEnum::getStatus, Function.identity())
        );
    }

    public static ContactStatusEnum of(Integer type) {
        return cache.get(type);
    }
}
