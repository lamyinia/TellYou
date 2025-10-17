package org.com.tools.utils;

import com.alibaba.fastjson.JSON;
import io.netty.channel.Channel;
import io.netty.channel.ChannelId;
import io.netty.handler.codec.http.websocketx.TextWebSocketFrame;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.tools.constant.RedissonConstant;
import org.redisson.api.RedissonClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

/**
 * @author lanye
 * @date 2025/07/25
 * @描述: 负责管理用户 userId 和 Channel 的双射关系
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ChannelManagerUtil {
    @Value("${server.node}")
    private String node;

    private final ConcurrentHashMap<Long, Channel> USER_CHANNEL_MAP = new ConcurrentHashMap<>();

    private final ConcurrentHashMap<ChannelId, Long> CHANNEL_USER_MAP = new ConcurrentHashMap<>();

    private final RedissonClient redissonClient;


    /**
     * 绑定用户id和Channel
     */
    public void bind(Long userId, Channel channel) {
        USER_CHANNEL_MAP.put(userId, channel);
        CHANNEL_USER_MAP.put(channel.id(), userId);
        log.info("绑定用户[{}]与Channel[{}]", userId, channel.id());

        redissonClient.getMap(RedissonConstant.ROUTE).put(userId, node);
        log.info(redissonClient.getMap(RedissonConstant.ROUTE).get(userId).toString());
    }

    public void unbindById(Long userId){
        Channel oth = USER_CHANNEL_MAP.get(userId);
        if (userId != null) unbindUserId(userId);
        if (oth != null) unbindChannel(oth);
        doRemove(userId, oth);
    }

    public void unbindByChannel(Channel channel){
        Long userId = CHANNEL_USER_MAP.get(channel);
        if (userId != null) unbindUserId(userId);
        if (channel != null) unbindChannel(channel);
        doRemove(userId, channel);
    }

    private void doRemove(Long userId, Channel channel){
        redissonClient.getMap(RedissonConstant.ROUTE).remove(userId, node);
        log.info("解绑[{}]和[{}]", userId.toString(), channel.id().toString());
    }

    /**
     * 解绑用户id和Channel
     */
    private void unbindUserId(Long userId) {
        USER_CHANNEL_MAP.remove(userId);
    }

    private void unbindChannel(Channel channel) {
        CHANNEL_USER_MAP.remove(channel.id());
    }

    /**
     * 根据用户 Id 获取 Channel
     */
    public Channel getChannel(Long userId) {
        return USER_CHANNEL_MAP.get(userId);
    }

    /**
     * 根据 Channel 获取用户 Id
     */
    public Long getUserId(Channel channel) {
        return CHANNEL_USER_MAP.get(channel.id());
    }

    /**
     * @description: 向指定用户推送消息
     */
    public boolean doDeliver(Long userId, Object message) {
        Channel channel = getChannel(userId);
        if (channel != null && channel.isActive()) {
            channel.writeAndFlush(new TextWebSocketFrame(JSON.toJSONString(message)));
            log.info("向用户[{}]推送消息: {}", userId, message);
            return true;
        } else {
            log.info("用户[{}]不在线，消息推送失败", userId);
            return false;
        }
    }
}
