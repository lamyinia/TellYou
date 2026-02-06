package org.com.social.infrastructure.persistence.po;

import lombok.Data;

@Data
public class ImGroupDO {
    private Long groupId;
    private Long sessionId;
    private Long ownerId;
    private Long creatorId;
    private String groupName;
    private String avatar;
    private Integer state;
    private Integer joinMode;
    private Integer speakMode;
    private Integer memberCount;
    private Integer maxMembers;
    private Integer partitionCount;
    private Integer maxPartitionCount;
    private String card;
    private String notification;
    private Integer version;
}
