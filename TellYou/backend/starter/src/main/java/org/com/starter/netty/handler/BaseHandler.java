package org.com.starter.netty.handler;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONObject;
import io.netty.channel.ChannelHandler;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.SimpleChannelInboundHandler;
import io.netty.handler.codec.http.websocketx.TextWebSocketFrame;
import io.netty.handler.codec.http.websocketx.WebSocketServerProtocolHandler;
import io.netty.util.AttributeKey;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.rocketmq.spring.core.RocketMQTemplate;
import org.com.modules.session.domain.enums.MessageTypeEnum;
import org.com.modules.session.domain.vo.req.MessageReq;
import org.com.tools.constant.NettyConstant;
import org.com.tools.utils.ChannelManagerUtil;
import org.springframework.stereotype.Component;

import java.util.Date;

/**
 * @author lanye
 * @date 2025/07/27
 * @description: 代表 netty 的消息生产者，
 *职责包括鉴权、幂等(设置唯一消息id)、消息校验(格式、敏感词检验)、流量控制。
 *消费者的职责是业务分发、最终一致性、延迟策略、状态上报、死信处理。
 */
@Slf4j
@Component
@ChannelHandler.Sharable
@RequiredArgsConstructor  // TODO 在 websocket 长连接层做流量控制
public class BaseHandler extends SimpleChannelInboundHandler<TextWebSocketFrame> {
    private final ChannelManagerUtil channelManagerUtil;
    private final RocketMQTemplate rocketMQTemplate;

    @Override
    protected void channelRead0(ChannelHandlerContext channelHandlerContext, TextWebSocketFrame textWebSocketFrame) throws Exception {
        String text = textWebSocketFrame.text();
        MessageReq json = null;
        try {
            json = JSON.parseObject(text, MessageReq.class);
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