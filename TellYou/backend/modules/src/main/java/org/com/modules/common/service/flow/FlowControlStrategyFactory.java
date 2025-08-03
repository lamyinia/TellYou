package org.com.modules.common.service.flow;

import org.com.modules.common.domain.dto.FlowControlDTO;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class FlowControlStrategyFactory {

    private FlowControlStrategyFactory() {}

    /**
     * 限流策略
     */
    public static final String REDISSON_FLOW_CONTROL = "RedissonFlowControl";

    /**
     * 限流策略集合
     */
    static Map<String, AbstractFlowControlService<?>> flowControlStrategyMap = new ConcurrentHashMap<>();

    /**
     * 将策略类放入工厂
     *
     * @param strategyName       策略名称
     * @param flowControlService 策略类
     */
    public static <K extends FlowControlDTO> void registerStrategy(String strategyName, AbstractFlowControlService<K> flowControlService){
        flowControlStrategyMap.put(strategyName, flowControlService);
    }

    /**
     * 根据名称获取策略类
     *
     * @param strategyName 策略名称
     * @return 对应的限流策略类
     */
    @SuppressWarnings("unchecked")
    public static <K extends FlowControlDTO> AbstractFlowControlService<K> getStrategyByName(String strategyName){
        return (AbstractFlowControlService<K>) flowControlStrategyMap.get(strategyName);
    }

}
