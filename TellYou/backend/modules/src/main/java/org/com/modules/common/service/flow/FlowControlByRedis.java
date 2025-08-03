package org.com.modules.common.service.flow;

import lombok.extern.slf4j.Slf4j;
import org.com.modules.common.domain.dto.FlowControlDTO;
import org.com.tools.utils.RedisUtils;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import static org.com.modules.common.service.flow.FlowControlStrategyFactory.REDISSON_FLOW_CONTROL;

@Slf4j
@Service
public class FlowControlByRedis extends AbstractFlowControlService<FlowControlDTO>{

    @Override
    protected boolean reachRateLimit(Map<String, FlowControlDTO> flowControlMap) {
        List<String> flowKeys = new ArrayList<>(flowControlMap.keySet());
        List<Integer> countList = RedisUtils.mget(flowKeys, Integer.class);
        for (int i = 0; i < flowKeys.size(); ++ i){
            String key = flowKeys.get(i);
            Integer count = countList.get(i);
            int flowControlCount = flowControlMap.get(key).getCount();

            if (Objects.nonNull(count) && count >= flowControlCount) {
                log.warn("frequencyControl limit key:{},count:{}", key, count);
                return true;
            }
        }
        return false;
    }

    @Override
    protected void addFlowControlStatisticsCount(Map<String, FlowControlDTO> flowControlMap) {
        flowControlMap.forEach((k, v) -> {
            RedisUtils.inc(k, v.getTime(), v.getUnit());
        });
    }

    @Override
    protected String getStrategyName() {
        return REDISSON_FLOW_CONTROL;
    }
}
