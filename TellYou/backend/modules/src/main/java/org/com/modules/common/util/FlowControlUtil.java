package org.com.modules.common.util;

import org.com.modules.common.domain.dto.FlowControlDTO;
import org.com.modules.common.service.flow.AbstractFlowControlService;
import org.com.modules.common.service.flow.FlowControlStrategyFactory;

import java.util.List;

public class FlowControlUtil {

    /**
     * 单限流策略的调用方法-编程式调用
     *
     * @param strategyName     策略名称
     * @param flowControl 单个频控对象
     * @param supplier         服务提供着
     * @return 业务方法执行结果
     * @throws Throwable
     */
    public static <T, K extends FlowControlDTO> T executeWithFlowControl(String strategyName,
                  K flowControl, AbstractFlowControlService.SupplierThrowWithoutParam<T> supplier) throws Throwable {

        AbstractFlowControlService<K> strategy = FlowControlStrategyFactory.getStrategyByName(strategyName);
        return strategy.executeWithFlowControl(flowControl, supplier);
    }
    public static <K extends FlowControlDTO> void executeWithFlowControl(String strategyName, K flowControl, AbstractFlowControlService.Executor executor) throws Throwable {
        AbstractFlowControlService<K> strategy = FlowControlStrategyFactory.getStrategyByName(strategyName);
        strategy.executeWithFlowControl(flowControl, () -> {
            executor.execute();
            return null;
        });
    }

    /**
     * 多限流策略的编程式调用方法调用方法
     *
     * @param strategyName         策略名称
     * @param flowControlList 频控列表 包含每一个频率控制的定义以及顺序
     * @param supplier             函数式入参-代表每个频控方法执行的不同的业务逻辑
     * @return 业务方法执行的返回值
     * @throws Throwable 被限流或者限流策略定义错误
     */
    public static <T, K extends FlowControlDTO> T executeWithFlowControlList(String strategyName,
           List<K> flowControlList, AbstractFlowControlService.SupplierThrowWithoutParam<T> supplier) throws Throwable {

        AbstractFlowControlService<K> strategy = FlowControlStrategyFactory.getStrategyByName(strategyName);
        return strategy.executeWithFlowControlList(flowControlList, supplier);
    }

    private FlowControlUtil() {}
}
