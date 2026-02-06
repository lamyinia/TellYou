package org.com.social.infrastructure.persistence.po;

import lombok.Data;

@Data
public class GroupPartitionDO {
    private Long groupId;
    private Integer partitionId;
    private String partitionName;
}
