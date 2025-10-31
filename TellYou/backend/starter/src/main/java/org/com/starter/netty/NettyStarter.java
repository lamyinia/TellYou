package org.com.starter.netty;


import io.netty.bootstrap.ServerBootstrap;
import io.netty.channel.*;
import io.netty.channel.nio.NioEventLoopGroup;
import io.netty.channel.socket.nio.NioServerSocketChannel;
import io.netty.handler.codec.http.HttpObjectAggregator;
import io.netty.handler.codec.http.HttpServerCodec;
import io.netty.handler.codec.http.websocketx.WebSocketServerProtocolHandler;
import io.netty.handler.logging.LogLevel;
import io.netty.handler.logging.LoggingHandler;
import io.netty.handler.timeout.IdleStateHandler;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.mail.producer.ChannelProducerHandler;
import org.com.starter.netty.handler.JwtAuthHandler;
import org.com.starter.netty.properties.NettyProperties;
import org.com.tools.utils.JwtUtil;
import org.springframework.stereotype.Component;

/**
 * <p> 组合 netty 的配置规则，包括webSocket 的升级协议、解耦心跳信息和业务信息、jwt鉴权、配置序列化器
 * @author lanye
 * @date 2025/07/27
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class NettyStarter implements Runnable {
    private EventLoopGroup bossGroup = new NioEventLoopGroup(1);
    private EventLoopGroup workerGroup = new NioEventLoopGroup();
    private final NettyProperties nettyProperties;
    private final ChannelProducerHandler businessHandler;
    private final JwtUtil jwtUtil;

    @PreDestroy
    public void close(){
        bossGroup.shutdownGracefully();
        workerGroup.shutdownGracefully();
    }

    @Override
    public void run() {
        ServerBootstrap serverBootstrap = new ServerBootstrap();
        serverBootstrap.group(bossGroup, workerGroup);
        serverBootstrap.channel(NioServerSocketChannel.class)
                .handler(new LoggingHandler(LogLevel.INFO))
                .childHandler(new ChannelInitializer<Channel>(){
                    @Override
                    protected void initChannel(Channel channel) throws Exception {
                        ChannelPipeline pipeline = channel.pipeline();
                        pipeline.addLast(new HttpServerCodec());
                        pipeline.addLast(new HttpObjectAggregator(64 * 1024));
                        pipeline.addLast(new JwtAuthHandler(jwtUtil));
                        pipeline.addLast(new IdleStateHandler(90, 0, 0));
                        pipeline.addLast(new WebSocketServerProtocolHandler("/ws", null, true, 64 * 1024, true, true, 10000L));
                        pipeline.addLast(businessHandler);
                    }
                });
        try {
            ChannelFuture sync = serverBootstrap.bind(nettyProperties.getServerPort()).sync();
            log.info("Netty 服务端启动成功, 端口:{}", nettyProperties.getServerPort());
            sync.channel().closeFuture().sync();
        } catch (InterruptedException e) {
            throw new RuntimeException(e);
        }
    }
}
