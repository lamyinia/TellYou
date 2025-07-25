package org.com.starter.netty.handler;

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
import org.com.modules.chat.domain.dto.ChatMessageDTO;
import org.com.modules.chat.service.ChatMessageService;
import org.com.tools.constant.MQConstant;
import org.com.tools.constant.NettyConstant;
import org.com.tools.utils.ChannelManagerUtil;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@ChannelHandler.Sharable
@RequiredArgsConstructor
public class BaseHandler extends SimpleChannelInboundHandler<TextWebSocketFrame> {
    private final ChatMessageService chatMessageService;
    private final ChannelManagerUtil channelManagerUtil;
    private final RocketMQTemplate rocketMQTemplate;

    @Override
    protected void channelRead0(ChannelHandlerContext channelHandlerContext, TextWebSocketFrame textWebSocketFrame) throws Exception {
        String text = textWebSocketFrame.text();
        log.info("收到消息: {}", text);
        ChatMessageDTO dto = null;
        try {
            dto = JSON.parseObject(text, ChatMessageDTO.class);
        } catch (Exception e){
            log.warn("前端JSON错误 {}", e.getMessage());
        }

        if ("HEARTBEAT".equals(dto.getType())){  // TODO 优化 HEARTBEAT 大小
            return;
        }

        if (dto.getType().contains("PRIVATE")){
            rocketMQTemplate.convertAndSend(MQConstant.DELIVER_TOPIC, dto);
        } else {
            rocketMQTemplate.convertAndSend(MQConstant.PUBLISH_TOPIC, dto);
        }
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
