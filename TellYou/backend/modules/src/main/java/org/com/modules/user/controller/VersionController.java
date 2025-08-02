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
@Tag(name = "版本管理接口")
@RestController("versionController")
@RequestMapping("/version")
public class VersionController {
}
