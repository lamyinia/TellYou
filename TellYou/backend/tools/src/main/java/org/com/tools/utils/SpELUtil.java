package org.com.tools.utils;


import org.springframework.core.DefaultParameterNameDiscoverer;
import org.springframework.expression.EvaluationContext;
import org.springframework.expression.Expression;
import org.springframework.expression.ExpressionParser;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.expression.spel.support.StandardEvaluationContext;

import java.lang.reflect.Method;
import java.util.Optional;

/**
 * spring el 表达式解析
 * @author lanye
 * @date 2025/08/01
 */
public class SpELUtil {
    private static final ExpressionParser parser = new SpelExpressionParser();
    private static final DefaultParameterNameDiscoverer parameterNameDiscoverer = new DefaultParameterNameDiscoverer();

    public static String parseSpEL(Method method, Object[] args, String spEL){
        String[] params = Optional.ofNullable(
                parameterNameDiscoverer.getParameterNames(method)
        ).orElse(new String[]{});
        EvaluationContext context = new StandardEvaluationContext();
        for (int i = 0; i < params.length; ++ i){
            context.setVariable(params[i], args[i]);
        }
        Expression expression = parser.parseExpression(spEL);
        return expression.getValue(context, String.class);
    }

    public static String getMethodKey(Method method) {
        return method.getDeclaringClass() + "#" + method.getName();
    }
}
