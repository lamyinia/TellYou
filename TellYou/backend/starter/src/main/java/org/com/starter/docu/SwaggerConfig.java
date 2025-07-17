package org.com.starter.docu;

import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.OpenAPI;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;


@Slf4j
@Configuration
public class SwaggerConfig {
    @Bean
    public OpenAPI customOpenAPI() {
        log.info("正在生成接口文档");
        return new OpenAPI()
                .info(new Info()
                        .title("tell-you 接口文档")
                        .version("3.0")
                        .description("tell-you 接口文档"));
    }

}