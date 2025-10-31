package org.com.modules.common.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.common.interceptor.CollectorInterceptor;
import org.com.modules.common.interceptor.JwtTokenInterceptor;
import org.com.modules.common.domain.entity.JacksonObjectMapper;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurationSupport;

import java.util.List;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class WebMvcConfiguration extends WebMvcConfigurationSupport {
    private final JwtTokenInterceptor jwtTokenInterceptor;
    private final CollectorInterceptor collectorInterceptor;

    /**
     * 扩展Spring MVC框架的消息转化器
     * @param converters
     */
    @Override
    protected void extendMessageConverters(List<HttpMessageConverter<?>> converters) {
        log.info("配置消息转换器...");
        MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter();
        converter.setObjectMapper(new JacksonObjectMapper());
        converters.add(converters.size()-1, converter);
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/**")
                .addResourceLocations(
                        "classpath:/META-INF/resources/",
                        "classpath:/resources/",
                        "classpath:/static/",
                        "classpath:/public/"
                );
    }

    @Override
    protected void addInterceptors(InterceptorRegistry registry) {
        log.info("配置 Jwt 拦截器、Collector拦截器...");
        registry.addInterceptor(jwtTokenInterceptor)
                .addPathPatterns("/**")
                .excludePathPatterns("/user-account/**");

        registry.addInterceptor(collectorInterceptor)
                .addPathPatterns("/**");
    }
}
