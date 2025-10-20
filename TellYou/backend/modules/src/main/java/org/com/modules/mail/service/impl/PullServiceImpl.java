package org.com.modules.mail.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.mail.dao.mongodb.UserInBoxDocDao;
import org.com.modules.mail.domain.vo.resp.PullMessageResp;
import org.com.modules.mail.service.PullService;
import org.com.tools.properties.PullProperties;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class PullServiceImpl implements PullService {
    private final PullProperties pullProperties;
    private final UserInBoxDocDao userInBoxDocDao;

    @Override
    public PullMessageResp pullBox(Long userId) {
        return userInBoxDocDao.pull(userId, pullProperties.getPullSize());
    }

    @Override
    public void ackBatchConfirm(Long userId, List<String> messageIdList) {
        userInBoxDocDao.ackBatchConfirm(userId, messageIdList);
    }
}
