package org.com.modules.chat.consumer;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.chat.service.MessageMailBoxService;
import org.redisson.api.RedissonClient;
import org.springframework.stereotype.Service;

/**
 * @author: lanye
 * @date: 2025/07/27 20:43
 * @description 群聊消息的消费者
 * @replenish 多人群聊中，由于精准投递中写扩散中查路由表的开销很大，在节点不多的情况下，可以采取集群广播的方式(如果节点很多，当然也可以混合路由去优化)
 *
 */

@Slf4j
@Service
@RequiredArgsConstructor
public class GroupSessionConsumer {
    private final RedissonClient redissonClient;
    private final MessageMailBoxService messageMailBoxService;


}
