package org.com.modules.mail.cache;

import lombok.RequiredArgsConstructor;
import org.apache.rocketmq.spring.core.RocketMQTemplate;
import org.com.modules.mail.cache.entity.CacheMissMessage;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class CacheMissProducer {
    private final RocketMQTemplate rocketMQTemplate;
    private final DistributedCache distributedCache;
    private static final String CACHE_INVALIDATE_TOPIC = "cache-invalidate-topic";

    public void addGroupMembers(Long groupId, List<Long> members) {
        CacheMissMessage message = new CacheMissMessage();
        message.setCacheType(CacheMissMessage.CACHE_TYPE_GROUP_MEMBERS);
        message.setOperation(CacheMissMessage.OPERATION_ADD);
        message.setKeys(List.of(String.valueOf(groupId)));

        distributedCache.addGroupMember(groupId, members.stream().collect(Collectors.toSet()));

        rocketMQTemplate.convertAndSend(CACHE_INVALIDATE_TOPIC, message);
    }

    public void removeGroupMembers(Long groupId, List<Long> members) {
        CacheMissMessage message = new CacheMissMessage();
        message.setCacheType(CacheMissMessage.CACHE_TYPE_GROUP_MEMBERS);
        message.setOperation(CacheMissMessage.OPERATION_REMOVE);
        message.setKeys(members.stream().map(String::valueOf).toList());

        distributedCache.removeGroupMember(groupId, members.stream().collect(Collectors.toSet()));

        rocketMQTemplate.convertAndSend(CACHE_INVALIDATE_TOPIC, message);
    }

}
