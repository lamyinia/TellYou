package org.com.starter.netty.handler;

import com.alibaba.fastjson.JSON;
import io.netty.channel.ChannelHandler;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.SimpleChannelInboundHandler;
import io.netty.handler.codec.http.websocketx.TextWebSocketFrame;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.chat.domain.dto.ChatMessageDTO;
import org.com.modules.chat.service.ChatMessageService;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@ChannelHandler.Sharable
@RequiredArgsConstructor
public class BaseHandler extends SimpleChannelInboundHandler<TextWebSocketFrame> {
    private final ChatMessageService chatMessageService;

    @Override
    protected void channelRead0(ChannelHandlerContext channelHandlerContext, TextWebSocketFrame textWebSocketFrame) throws Exception {
        String text = textWebSocketFrame.text();
        log.info("收到消息: {}", text);
        ChatMessageDTO dto = JSON.parseObject(text, ChatMessageDTO.class);
        chatMessageService.handleMessage(dto);
    }

    @Override
    public void userEventTriggered(ChannelHandlerContext ctx, Object evt) throws Exception {

    }
}
