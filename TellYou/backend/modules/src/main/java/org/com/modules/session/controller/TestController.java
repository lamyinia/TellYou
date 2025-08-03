package org.com.modules.session.controller;

import lombok.extern.slf4j.Slf4j;
import org.com.modules.common.annotation.FlowControl;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/test")
public class TestController {

    @GetMapping("/flow")
    @FlowControl(time = 10, count = 20, spEl = "'test'", target = FlowControl.Target.EL)
    public String testFlowControl() {
        log.info("测试方法被调用");
        return "test";
    }
} 