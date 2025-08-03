package org.com.modules.common.service.flow;

import cn.hutool.core.util.ObjectUtil;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.common.domain.dto.FlowControlDTO;
import org.com.modules.common.exception.FlowControlException;
import org.com.tools.exception.CommonErrorEnum;
import org.com.tools.utils.AssertUtil;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
public abstract class AbstractFlowControlService<K extends FlowControlDTO> {
    @PostConstruct
    protected void registerSelfToFactory(){
        log.info("正在配置策略是 {} 的限流策略", getStrategyName());
        FlowControlStrategyFactory.registerStrategy(getStrategyName(), this);
    }

    private <T> T executeWithFlowControlMap(Map<String, K> flowControlMap, SupplierThrowWithoutParam<T> supplier) throws Throwable {
        if (reachRateLimit(flowControlMap)){
            throw new FlowControlException(CommonErrorEnum.FLOW_LIMIT);
        }
        try {
            return supplier.get();
        } finally {
            addFlowControlStatisticsCount(flowControlMap);
        }
    }

    /**
     * 多限流策略的编程式调用方法 无参的调用方法
     *
     * @param flowControlList 频控列表 包含每一个频率控制的定义以及顺序
     * @param supplier             函数式入参-代表每个频控方法执行的不同的业务逻辑
     * @return 业务方法执行的返回值
     * @throws Throwable 被限流或者限流策略定义错误
     */
    @SuppressWarnings("unchecked")
    public <T> T executeWithFlowControlList(List<K> flowControlList, SupplierThrowWithoutParam<T> supplier) throws Throwable {
        boolean existsHashNullKey = flowControlList.stream().anyMatch(dto -> ObjectUtil.isEmpty(dto.getKey()));
        AssertUtil.isFalse(existsHashNullKey, "限流策略的 Key 字段不允许出现空值");
        Map<String, FlowControlDTO> flowControlDTOMap = flowControlList.stream().collect(
                Collectors.groupingBy(FlowControlDTO::getKey, Collectors.collectingAndThen(Collectors.toList(), list -> list.get(0)))
        );
        return executeWithFlowControlMap((Map<String, K>) flowControlDTOMap, supplier);
    }

    /**
     * 单限流策略的调用方法-编程式调用
     * @param flowControl 单个频控对象
     * @param supplier         服务提供着
     * @return 业务方法执行结果
     * @throws Throwable
     */
    public <T> T executeWithFlowControl(K flowControl, SupplierThrowWithoutParam<T> supplier) throws Throwable {
        return executeWithFlowControlList(Collections.singletonList(flowControl), supplier);
    }

    @FunctionalInterface
    public interface SupplierThrowWithoutParam<T> {
        /**
         * Gets a result.
         * @return a result
         */
        T get() throws Throwable;
    }
    @FunctionalInterface
    public interface Executor {
        /**
         * Gets a result.
         * @return a result
         */
        void execute() throws Throwable;
    }


    /**
     * 是否达到限流阈值 子类实现 每个子类都可以自定义自己的限流逻辑判断
     * @param flowControlMap 定义的注解频控 Map 中的 Key- 对应 redis 的单个频控的Key，Map 中的 Value- 对应 redis 的单个频控的 Key 限制的 Value
     * @return true-方法被限流 false-方法没有被限流
     */
    protected abstract boolean reachRateLimit(Map<String, K> flowControlMap);


    /**
     * 增加限流统计次数 子类实现 每个子类都可以自定义自己的限流统计信息增加的逻辑
     * @param flowControlMap 定义的注解频控 Map 中的 Key- 对应 redis 的单个频控的 Key，Map 中的 Value-对应 redis 的单个频控的 Key 限制的 Value
     */
    protected abstract void addFlowControlStatisticsCount(Map<String, K> flowControlMap);

    /**
     * 获取策略名称
     * @return 策略名称
     */
    protected abstract String getStrategyName();
}
