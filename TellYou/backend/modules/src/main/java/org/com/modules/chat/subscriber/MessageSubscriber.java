package org.com.modules.chat.subscriber;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.chat.domain.document.MessageMailBox;
import org.com.modules.chat.domain.vo.MessageVO;
import org.com.modules.chat.service.retry.MessageRetryService;
import org.com.modules.chat.utils.MessageConvertUtil;
import org.redisson.api.RTopic;
import org.redisson.api.RedissonClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class MessageSubscriber {
    @Value("${server.node}")
    private String node;

    private final RedissonClient redissonClient;
    private final MessageRetryService messageRetryService;
    private final MessageConvertUtil messageConvertUtil;

    @PostConstruct
    public void deliver(){
        RTopic topic = redissonClient.getTopic(node);
        topic.addListener(MessageMailBox.class, (channel, document) -> {
            MessageVO msg = messageConvertUtil.covertToVO(document);
            document.getToUserIds().forEach(id -> messageRetryService.retryDelivery(id, msg));
        });
    }

}
