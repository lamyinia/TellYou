package org.com.social.infrastructure.persistence.po;

import lombok.Data;

@Data
public class ImSessionDO {
    private Long sessionId;
    private Integer sessionType;
    private Integer state;
    private Integer version;
    private Long messageFlags;
    private String extJson;
}
