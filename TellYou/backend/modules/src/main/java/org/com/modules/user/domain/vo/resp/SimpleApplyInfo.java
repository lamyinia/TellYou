package org.com.modules.user.domain.vo.resp;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class SimpleApplyInfo {
    @JsonSerialize(using = ToStringSerializer.class)
    private Long applyUserId;

    @JsonSerialize(using = ToStringSerializer.class)
    private Long targetId;

    private Integer contactType;

    private Integer status;

    private Date lastApplyTime;

    private String applyInfo;
}
