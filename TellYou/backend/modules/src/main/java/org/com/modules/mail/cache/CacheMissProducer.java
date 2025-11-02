package org.com.modules.mail.cache;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.rocketmq.spring.core.RocketMQTemplate;
import org.com.modules.group.domain.enums.GroupRoleEnum;
import org.com.modules.mail.cache.entity.CacheMissMessage;
import org.com.modules.mail.cache.entity.GroupMemberInfo;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class CacheMissProducer {
    private final RocketMQTemplate rocketMQTemplate;
    /**
     * @see
     * org.com.modules.mail.cache.CacheMissConsumer
     */

    private final DistributedCache distributedCache;
    private static final String CACHE_INVALIDATE_TOPIC = "cache-invalidate-topic";

    public void addNewMembers(Long groupId, List<Long> members) {
        log.info("addNewMembers 即将发送缓存失效广播: groupId={}, members={}", groupId, members);
        CacheMissMessage message = new CacheMissMessage();
        message.setCacheType(CacheMissMessage.CACHE_TYPE_GROUP_MEMBERS);
        message.setOperation(CacheMissMessage.OPERATION_ADD);
        message.setKeys(List.of(String.valueOf(groupId)));

        distributedCache.addGroupMember(groupId, members.stream().map(member -> new GroupMemberInfo(member, GroupRoleEnum.MEMBER.getRole())).collect(Collectors.toSet()));

        rocketMQTemplate.convertAndSend(CACHE_INVALIDATE_TOPIC, message);
    }

    public void addGroupMember(Long groupId, List<GroupMemberInfo> members){
        log.info("addGroupMember 即将发送缓存失效广播: groupId={}, members={}", groupId, members);
        CacheMissMessage message = new CacheMissMessage();
        message.setCacheType(CacheMissMessage.CACHE_TYPE_GROUP_MEMBERS);
        message.setOperation(CacheMissMessage.OPERATION_ADD);
        message.setKeys(List.of(String.valueOf(groupId)));

        distributedCache.addGroupMember(groupId, members.stream().collect(Collectors.toSet()));
        rocketMQTemplate.convertAndSend(CACHE_INVALIDATE_TOPIC, message);
    }


    public void removeMembers(Long groupId, List<Long> members) {
        log.info("removeMembers 即将发送缓存失效广播: groupId={}, members={}", groupId, members);
        CacheMissMessage message = new CacheMissMessage();
        message.setCacheType(CacheMissMessage.CACHE_TYPE_GROUP_MEMBERS);
        message.setOperation(CacheMissMessage.OPERATION_REMOVE);
        message.setKeys(members.stream().map(String::valueOf).toList());

        distributedCache.removeGroupMember(groupId, members.stream().map(member -> new GroupMemberInfo(member, GroupRoleEnum.MEMBER.getRole())).collect(Collectors.toSet()));
        rocketMQTemplate.convertAndSend(CACHE_INVALIDATE_TOPIC, message);
    }

}
