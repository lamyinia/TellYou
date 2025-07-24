//package org.com.starter;
//
//import org.springframework.context.annotation.Bean;
//import org.springframework.security.config.annotation.web.builders.HttpSecurity;
//import org.springframework.security.web.SecurityFilterChain;
//
//@org.springframework.context.annotation.Configuration
//public class SecurityConfig {
//    @Bean
//    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
//        http.authorizeHttpRequests(authorize -> authorize.requestMatchers(
//                                "/doc.html", "/webjars/**", "/swagger-resources/**", "/v3/api-docs/**", "/swagger-ui/**",
//                                "/.well-known/**", "/static/**", "/public/**").permitAll().anyRequest().permitAll())
//                .csrf(csrf -> csrf.disable())
//                .formLogin(form -> form.disable())
//                .httpBasic(basic -> basic.disable());
//        return http.build();
//    }
//}