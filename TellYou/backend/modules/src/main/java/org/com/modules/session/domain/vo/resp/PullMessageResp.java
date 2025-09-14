package org.com.modules.session.domain.vo.resp;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.io.Serializable;
import java.util.List;

@Data
@AllArgsConstructor
@ToString
public class PullMessageResp implements Serializable {
    private List<MessageResp> messageList;
    private Boolean hasMore;
}
