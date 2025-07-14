package org.com.server;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.server.netty.NettyStarter;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.SQLException;

@Slf4j
@Component
@RequiredArgsConstructor
public class RunNetty implements ApplicationRunner {

    private final DataSource dataSource;
    private final NettyStarter nettyStarter;

    @Override
    public void run(ApplicationArguments args) throws Exception {
        try {
            dataSource.getConnection();
            log.info("Netty 启动中...");
            new Thread(nettyStarter).start();
        } catch (SQLException e) {
            log.error("数据库配置错误");
        } catch (Exception e) {
            log.error("Netty 启动失败: {}", e);
        }
    }
}
