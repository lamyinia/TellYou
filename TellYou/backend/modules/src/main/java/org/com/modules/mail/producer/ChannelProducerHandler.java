package org.com.modules.mail.producer;

import com.alibaba.fastjson.JSON;
import io.netty.channel.ChannelHandler;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.SimpleChannelInboundHandler;
import io.netty.handler.codec.http.websocketx.TextWebSocketFrame;
import io.netty.handler.codec.http.websocketx.WebSocketServerProtocolHandler;
import io.netty.util.AttributeKey;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.rocketmq.spring.core.RocketMQTemplate;
import org.com.modules.mail.domain.enums.MessageTypeEnum;
import org.com.modules.mail.domain.dto.ChatDTO;
import org.com.tools.constant.NettyConstant;
import org.com.tools.utils.ChannelManagerUtil;
import org.springframework.stereotype.Component;

/**
 *  来自 NettyChannel 的消息生产者，
 *  职责包括幂等(设置唯一消息id)、消息校验(格式、敏感词检验)。
 *  消费者的职责是业务分发。
 *
 * @author lanye
 * @date 2025/07/27
 */
@Slf4j
@Component
@ChannelHandler.Sharable
@RequiredArgsConstructor
public class ChannelProducerHandler extends SimpleChannelInboundHandler<TextWebSocketFrame> {
    private final ChannelManagerUtil channelManagerUtil;
    private final RocketMQTemplate rocketMQTemplate;

    @Override
    protected void channelRead0(ChannelHandlerContext channelHandlerContext, TextWebSocketFrame textWebSocketFrame) throws Exception {
        String text = textWebSocketFrame.text();
        ChatDTO json = null;
        try {
            json = JSON.parseObject(text, ChatDTO.class);
        } catch (Exception e){
            log.warn("前端JSON错误 {}", e.getMessage());
        }
        if (json == null) return;
        Integer type = json.getType();
        if (type == 0) return;

        log.info("收到消息: {}", text);
        rocketMQTemplate.convertAndSend(MessageTypeEnum.of(type).getTopic(), text);
    }

    @Override
    public void userEventTriggered(ChannelHandlerContext ctx, Object evt) throws Exception {
        log.info("事件的类型 {}", evt.toString());

        if (evt instanceof WebSocketServerProtocolHandler.HandshakeComplete){
            Long uid = (Long) ctx.channel().attr(AttributeKey.valueOf("uid")).get();
            channelManagerUtil.bind(uid, ctx.channel());
        }
    }

    @Override
    public void channelInactive(ChannelHandlerContext ctx) throws Exception {
        log.info("通道不活跃");
        Long uid = (Long) ctx.channel().attr(NettyConstant.UID_KEY).get();
        channelManagerUtil.unbindById(uid);
    }

    @Override
    public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) throws Exception {
        Long uid = (Long) ctx.channel().attr(NettyConstant.UID_KEY).get();
        log.warn("{} 抛出错误: {}", uid, cause.toString());
    }
}
