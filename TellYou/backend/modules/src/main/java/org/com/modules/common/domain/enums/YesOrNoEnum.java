package org.com.modules.common.domain.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.Arrays;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Getter
@AllArgsConstructor
public enum YesOrNoEnum {
    NO(0, "否"),
    YES(1, "是");

    private final Integer status;
    private final String option;

    private static Map<Integer, YesOrNoEnum> cache;
    static {
        cache = Arrays.stream(YesOrNoEnum.values()).collect(
                Collectors.toMap(YesOrNoEnum::getStatus, Function.identity())
        );
    }

    public static YesOrNoEnum of(Integer type) {
        return cache.get(type);
    }
    public static Integer toStatus(Boolean bool) {
        return bool ? YES.getStatus() : NO.getStatus();
    }
}
