package org.com.starter.netty.handler;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.ChannelInboundHandlerAdapter;
import io.netty.handler.codec.http.FullHttpRequest;
import lombok.extern.slf4j.Slf4j;
import org.com.tools.constant.NettyConstant;
import org.com.tools.utils.JwtUtil;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class JwtAuthHandler extends ChannelInboundHandlerAdapter {
    private final JwtUtil jwtUtil;

    public JwtAuthHandler(JwtUtil jwtUtil){
        this.jwtUtil = jwtUtil;
    }

    @Override
    public void channelRead(ChannelHandlerContext ctx, Object msg) throws Exception {
        if (msg instanceof FullHttpRequest){
            FullHttpRequest request = (FullHttpRequest) msg;
            String uri = request.uri();
            String token = null;
            if (uri.contains("token=")) {
                String[] parts = uri.split("token=");
                token = parts[1].split("&")[0];
            }
            if (token == null){
                ctx.close();
            }

            log.info("正在验证 websocket 连接的token");

            try {
                Claims claims = jwtUtil.parseJWT(token);
                Long uid = (Long) claims.get(jwtUtil.getJwtProperties().getUidKey());
                log.info("uid: {}, JWT验证 - 令牌: {}...", uid, token.substring(0, Math.min(token.length(), 6)));
                ctx.channel().attr(NettyConstant.UID_KEY).set(uid);

                ctx.fireChannelRead(msg);
            } catch (ExpiredJwtException ex){
                ctx.close();
            } catch (JwtException | IllegalArgumentException ex){
                ctx.close();
            }

        } else {
            ctx.fireChannelRead(msg);
        }
    }
}
