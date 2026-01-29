package org.com.nettyconnector.infrastructure.netty;

import io.netty.bootstrap.ServerBootstrap;
import io.netty.channel.Channel;
import io.netty.channel.ChannelFuture;
import io.netty.channel.ChannelInitializer;
import io.netty.channel.EventLoopGroup;
import io.netty.channel.nio.NioEventLoopGroup;
import io.netty.channel.socket.nio.NioServerSocketChannel;
import io.netty.channel.socket.SocketChannel;
import io.netty.handler.codec.protobuf.ProtobufDecoder;
import io.netty.handler.codec.protobuf.ProtobufEncoder;
import io.netty.handler.timeout.IdleStateHandler;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.nettyconnector.proto.connector.tcp.v1.Envelope;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * 帧格式（网络字节序 Big-Endian）
 * <ul>
 *     <li>magic：2 字节 short</li>
 *     <li>ver：  1 字节</li>
 *     <li>flags：1 字节（预留，当前不启用）</li>
 *     <li>length：4 字节 int，表示 body 长度</li>
 *     <li>body：length 字节，内容是 Envelope 的 protobuf 二进制</li>
 * </ul>
 * @author lanye
 * @since 2026/01/30 01:42
 */

@Slf4j
@Component
@RequiredArgsConstructor
public class TcpServer {

    @Value("${netty.tcp.port:7070}")
    private int port;

    private final TcpEnvelopeHandler tcpEnvelopeHandler;

    private EventLoopGroup bossGroup;
    private EventLoopGroup workerGroup;
    private Channel serverChannel;
    private Thread bindThread;

    @PostConstruct
    public void start() {
        this.bossGroup = new NioEventLoopGroup(1);
        this.workerGroup = new NioEventLoopGroup();

        this.bindThread = new Thread(this::doBind, "netty-tcp-server");
        this.bindThread.setDaemon(true);
        this.bindThread.start();
    }

    private void doBind() {
        try {
            ServerBootstrap bootstrap = new ServerBootstrap()
                    .group(bossGroup, workerGroup)
                    .channel(NioServerSocketChannel.class)
                    .childHandler(new ChannelInitializer<SocketChannel>() {
                        @Override
                        protected void initChannel(SocketChannel ch) {
                            ch.pipeline().addLast(new TcpFrameDecoder(TcpProtocolConstants.DEFAULT_MAX_BODY_LEN));
                            ch.pipeline().addLast(new ProtobufDecoder(Envelope.getDefaultInstance()));
                            ch.pipeline().addLast(new IdleStateHandler(90, 0, 0));

                            ch.pipeline().addLast(new TcpFrameEncoder());
                            ch.pipeline().addLast(new ProtobufEncoder());
                            ch.pipeline().addLast(tcpEnvelopeHandler);
                        }
                    });

            ChannelFuture future = bootstrap.bind(port).sync();
            this.serverChannel = future.channel();
            log.info("Netty TCP server started on port={}", port);
            this.serverChannel.closeFuture().sync();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } catch (Exception e) {
            log.error("Netty TCP server failed to start on port={}", port, e);
        }
    }

    @PreDestroy
    public void stop() {
        try {
            Channel ch = this.serverChannel;
            if (ch != null) {
                ch.close().syncUninterruptibly();
            }
        } catch (Exception e) {
            log.warn("Netty TCP server channel close failed", e);
        } finally {
            if (workerGroup != null) {
                workerGroup.shutdownGracefully().syncUninterruptibly();
            }
            if (bossGroup != null) {
                bossGroup.shutdownGracefully().syncUninterruptibly();
            }
        }
        log.info("Netty TCP server stopped");
    }
}
