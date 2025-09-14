package org.com.modules.session.service;

import org.com.modules.session.domain.vo.resp.PullMessageResp;

import java.util.List;

public interface PullService {
    PullMessageResp pullBox(Long userId);

    void ackBatchConfirm(Long userId, List<String> messageIdList);

}
