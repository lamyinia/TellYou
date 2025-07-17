package org.com.modules;

import io.swagger.annotations.Api;
import org.com.tools.common.ApiResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/test")
@Api(tags = "测试类")
public class TestController {

    @GetMapping
    public ApiResult test(){
        return ApiResult.success("success");
    }
}
