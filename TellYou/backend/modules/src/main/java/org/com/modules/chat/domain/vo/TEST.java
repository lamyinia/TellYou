package org.com.modules.chat.domain.vo;

import lombok.Builder;
import lombok.Data;
import lombok.ToString;

import java.io.Serializable;

@Data
@Builder
@ToString
public class TEST implements Serializable {
    private Long integer;

}
