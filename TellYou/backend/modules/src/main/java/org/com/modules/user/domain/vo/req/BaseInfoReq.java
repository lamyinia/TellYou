package org.com.modules.user.domain.vo.req;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class BaseInfoReq {
    private List<Long> targetList;
}
