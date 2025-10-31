package org.com.modules.mail.domain.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 消息聚合的 dto
 * @author lanye
 * @since 2025/10/21 16:55
 */

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AggregateDTO {
    private List<Long> userIds;

    private Long groupId;

    private Long sessionId;

    /**
     * @see org.com.modules.mail.domain.enums.MessageTypeEnum
     */
    private Integer aggregateType;
}
