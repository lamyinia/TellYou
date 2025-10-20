package org.com.modules.mail.service;

import org.com.modules.mail.domain.vo.resp.PullMessageResp;

import java.util.List;

public interface PullService {
    PullMessageResp pullBox(Long userId);

    void ackBatchConfirm(Long userId, List<String> messageIdList);

}
