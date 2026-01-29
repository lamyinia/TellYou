package org.com.nettyconnector.infrastructure.netty;

import io.netty.channel.ChannelHandler;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.SimpleChannelInboundHandler;
import io.netty.handler.timeout.IdleState;
import io.netty.handler.timeout.IdleStateEvent;
import lombok.extern.slf4j.Slf4j;
import org.com.nettyconnector.proto.connector.tcp.v1.*;
import org.com.nettyconnector.proto.connector.tcp.v1.Error;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@ChannelHandler.Sharable
public class TcpEnvelopeHandler extends SimpleChannelInboundHandler<Envelope> {

    @Value("${gateway.id:connector-1}")
    private String gatewayId;

    @Value("${netty.tcp.heartbeat-interval-sec:30}")
    private int heartbeatIntervalSec;

    @Override
    protected void channelRead0(ChannelHandlerContext ctx, Envelope msg) {
        switch (msg.getPayloadCase()) {
            case AUTH_REQUEST -> handleAuth(ctx, msg, msg.getAuthRequest());
            case PING -> handlePing(ctx, msg);
            case PAYLOAD_NOT_SET -> writeError(ctx, msg, 400, "payload_not_set");
            default -> {
                Boolean authenticated = ctx.channel().attr(ConnectorChannelAttrs.AUTHENTICATED).get();
                if (Boolean.TRUE.equals(authenticated)) {
                    writeError(ctx, msg, 404, "unsupported_payload: " + msg.getPayloadCase().name());
                } else {
                    writeAuthFail(ctx, msg, 401, "unauthenticated");
                }
            }
        }
    }

    @Override
    public void userEventTriggered(ChannelHandlerContext ctx, Object evt) {
        if (evt instanceof IdleStateEvent event && event.state() == IdleState.READER_IDLE) {
            ctx.close();
            return;
        }
        ctx.fireUserEventTriggered(evt);
    }

    @Override
    public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) {
        log.warn("tcp handler exception: {}", cause.toString());
        ctx.close();
    }

    private void handlePing(ChannelHandlerContext ctx, Envelope req) {
        Envelope resp = Envelope.newBuilder()
                .setVersion(req.getVersion())
                .setStreamId(req.getStreamId())
                .setTimestampMs(System.currentTimeMillis())
                .setTraceId(req.getTraceId())
                .setPong(Pong.newBuilder().build())
                .build();
        ctx.writeAndFlush(resp);
    }

    private void handleAuth(ChannelHandlerContext ctx, Envelope req, AuthRequest authRequest) {
        String token = authRequest.getToken();
        if (token == null || token.isBlank()) {
            writeAuthFail(ctx, req, 401, "missing_token");
            ctx.close();
            return;
        }

        long userId = deriveUserId(token);
        ctx.channel().attr(ConnectorChannelAttrs.USER_ID).set(userId);
        ctx.channel().attr(ConnectorChannelAttrs.AUTHENTICATED).set(true);

        Envelope resp = Envelope.newBuilder()
                .setVersion(req.getVersion())
                .setStreamId(req.getStreamId())
                .setTimestampMs(System.currentTimeMillis())
                .setTraceId(req.getTraceId())
                .setAuthOk(AuthOk.newBuilder()
                        .setUserId(userId)
                        .setGatewayId(gatewayId)
                        .setHeartbeatIntervalSec(heartbeatIntervalSec)
                        .build())
                .build();

        ctx.writeAndFlush(resp);
    }

    private void writeAuthFail(ChannelHandlerContext ctx, Envelope req, int errorCode, String message) {
        Envelope resp = Envelope.newBuilder()
                .setVersion(req.getVersion())
                .setStreamId(req.getStreamId())
                .setTimestampMs(System.currentTimeMillis())
                .setTraceId(req.getTraceId())
                .setAuthFail(AuthFail.newBuilder()
                        .setErrorCode(errorCode)
                        .setMessage(message)
                        .build())
                .build();
        ctx.writeAndFlush(resp);
    }

    private void writeError(ChannelHandlerContext ctx, Envelope req, int errorCode, String message) {
        Envelope resp = Envelope.newBuilder()
                .setVersion(req.getVersion())
                .setStreamId(req.getStreamId())
                .setTimestampMs(System.currentTimeMillis())
                .setTraceId(req.getTraceId())
                .setError(Error.newBuilder()
                        .setErrorCode(errorCode)
                        .setMessage(message)
                        .build())
                .build();
        ctx.writeAndFlush(resp);
    }

    private long deriveUserId(String token) {
        String t = token.trim();
        try {
            if (t.startsWith("uid=") && t.length() > 4) {
                return Long.parseLong(t.substring(4));
            }
            if (t.startsWith("uid:") && t.length() > 4) {
                return Long.parseLong(t.substring(4));
            }
            if (t.matches("\\d+")) {
                return Long.parseLong(t);
            }
            int idx = t.lastIndexOf(':');
            if (idx >= 0 && idx + 1 < t.length()) {
                String suffix = t.substring(idx + 1);
                if (suffix.matches("\\d+")) {
                    return Long.parseLong(suffix);
                }
            }
        } catch (Exception ignored) {
        }
        return (long) Math.abs(t.hashCode());
    }
}
