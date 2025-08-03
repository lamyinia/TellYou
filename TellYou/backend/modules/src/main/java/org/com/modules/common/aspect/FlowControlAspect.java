package org.com.modules.common.aspect;

import cn.hutool.core.util.StrUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.com.modules.common.annotation.FlowControl;
import org.com.modules.common.domain.dto.FlowControlDTO;
import org.com.modules.common.util.FlowControlUtil;
import org.com.modules.common.util.RequestHolder;
import org.com.tools.utils.SpELUtil;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.com.modules.common.service.flow.FlowControlStrategyFactory.REDISSON_FLOW_CONTROL;

@Aspect
@Slf4j
@Component
@RequiredArgsConstructor
public class FlowControlAspect {

    @Around("@annotation(org.com.modules.common.annotation.FlowControl) || @annotation(org.com.modules.common.annotation.FlowControlContainer)")
    public Object around(ProceedingJoinPoint joinPoint) throws Throwable {
        Method method = ((MethodSignature) joinPoint.getSignature()).getMethod();
        FlowControl[] annotations = method.getAnnotationsByType(FlowControl.class);

        Map<String, FlowControl> keyMap = new HashMap<>();
        for (int i = 0; i < annotations.length; ++ i){
            FlowControl anno = annotations[i];
            String prefix = StrUtil.isBlank(anno.prefixKey()) ?
                    (SpELUtil.getMethodKey(method) + ":index:" + i) : anno.prefixKey();
            String key = "";
            switch (anno.target()){
                case EL:
                    key = SpELUtil.parseSpEL(method, joinPoint.getArgs(), anno.spEl());
                    break;
                case IP:
                    key = RequestHolder.get().getIp();
                    break;
                case UID:
                    key = RequestHolder.get().getUid().toString();
                    break;
            }
            keyMap.put(prefix + ":" + key, anno);
        }

        List<FlowControlDTO> flowControlDTOList = keyMap.entrySet().stream()
                .map(entrySet -> buildFlowControlDTO(entrySet.getKey(), entrySet.getValue()))
                .collect(Collectors.toList());

        return FlowControlUtil.executeWithFlowControlList(REDISSON_FLOW_CONTROL, flowControlDTOList, joinPoint::proceed);
    }

    /**
     * 将注解参数转换为编程式调用所需要的参数
     *
     * @param key              频率控制Key
     * @param flowControl 注解
     * @return 编程式调用所需要的参数-FrequencyControlDTO
     */
    private FlowControlDTO buildFlowControlDTO(String key, FlowControl flowControl) {
        FlowControlDTO dto = new FlowControlDTO();
        dto.setCount(flowControl.count());
        dto.setTime(flowControl.time());
        dto.setUnit(flowControl.unit());
        dto.setKey(key);
        return dto;
    }
}
