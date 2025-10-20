package org.com.modules.mail.domain.vo.resp;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.ToString;
import org.com.modules.deliver.domain.vo.push.PushedChat;

import java.io.Serializable;
import java.util.List;

@Data
@AllArgsConstructor
@ToString
public class PullMessageResp implements Serializable {
    private List<PushedChat> messageList;
    private Boolean hasMore;
}
