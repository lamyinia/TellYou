package org.com.modules.session.domain.vo.resp;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SimpleGroupInfo {
    @JsonSerialize(using = ToStringSerializer.class)
    private Long groupId;

    private String groupName;

    private String avatar;
}
