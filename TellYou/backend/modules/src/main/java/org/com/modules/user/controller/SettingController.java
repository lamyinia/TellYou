package org.com.modules.user.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * @author lanye
 * @date 2025/07/31
 */
@Slf4j
@Tag(name = "用户软件设置接口")
@RestController("settingController")
@RequestMapping("/setting")
public class SettingController {
}
