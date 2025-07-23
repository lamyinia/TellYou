package org.com.tools.common;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.json.JsonReadFeature;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.module.SimpleModule;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.fasterxml.jackson.datatype.jsr310.deser.LocalDateDeserializer;
import com.fasterxml.jackson.datatype.jsr310.deser.LocalDateTimeDeserializer;
import com.fasterxml.jackson.datatype.jsr310.deser.LocalTimeDeserializer;
import com.fasterxml.jackson.datatype.jsr310.ser.LocalDateSerializer;
import com.fasterxml.jackson.datatype.jsr310.ser.LocalDateTimeSerializer;
import com.fasterxml.jackson.datatype.jsr310.ser.LocalTimeSerializer;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.TimeZone;

/**
 * @author lanye
 * @date 2025/07/23
 */
public class JacksonObjectMapper extends ObjectMapper {

    public static final String DEFAULT_DATE_FORMAT = "yyyy-MM-dd";
    public static final String DEFAULT_DATE_TIME_FORMAT = "yyyy-MM-dd HH:mm:ss";
    public static final String DEFAULT_TIME_FORMAT = "HH:mm:ss";

    public JacksonObjectMapper() {
        super();

        this.setDefaultConfiguration();
        this.registerJava8TimeModule();

        this.registerCustomSerialization();

        this.configureSerializationFeatures();
        this.configureDeserializationFeatures();
    }

    private void setDefaultConfiguration() {
        this.setTimeZone(TimeZone.getTimeZone("Asia/Shanghai"));

        // 设置日期格式
        this.setDateFormat(new SimpleDateFormat(DEFAULT_DATE_TIME_FORMAT));

        // 设置序列化时包含属性的规则
        this.setSerializationInclusion(JsonInclude.Include.NON_NULL);

        this.configure(JsonParser.Feature.ALLOW_SINGLE_QUOTES, true);

        this.configure(JsonParser.Feature.ALLOW_UNQUOTED_FIELD_NAMES, true);

        // 允许JSON包含控制字符
        this.configure(JsonReadFeature.ALLOW_UNESCAPED_CONTROL_CHARS.mappedFeature(), true);

        // 允许JSON包含反斜杠引号
        this.configure(JsonReadFeature.ALLOW_BACKSLASH_ESCAPING_ANY_CHARACTER.mappedFeature(), true);
    }

    private void registerJava8TimeModule() {
        JavaTimeModule javaTimeModule = new JavaTimeModule();

        // 配置LocalDateTime序列化和反序列化规则
        javaTimeModule.addSerializer(LocalDateTime.class,
                new LocalDateTimeSerializer(DateTimeFormatter.ofPattern(DEFAULT_DATE_TIME_FORMAT)));
        javaTimeModule.addDeserializer(LocalDateTime.class,
                new LocalDateTimeDeserializer(DateTimeFormatter.ofPattern(DEFAULT_DATE_TIME_FORMAT)));

        // 配置LocalDate序列化和反序列化规则
        javaTimeModule.addSerializer(LocalDate.class,
                new LocalDateSerializer(DateTimeFormatter.ofPattern(DEFAULT_DATE_FORMAT)));
        javaTimeModule.addDeserializer(LocalDate.class,
                new LocalDateDeserializer(DateTimeFormatter.ofPattern(DEFAULT_DATE_FORMAT)));

        // 配置LocalTime序列化和反序列化规则
        javaTimeModule.addSerializer(LocalTime.class,
                new LocalTimeSerializer(DateTimeFormatter.ofPattern(DEFAULT_TIME_FORMAT)));
        javaTimeModule.addDeserializer(LocalTime.class,
                new LocalTimeDeserializer(DateTimeFormatter.ofPattern(DEFAULT_TIME_FORMAT)));

        this.registerModule(javaTimeModule);
    }

    private void registerCustomSerialization() {
        SimpleModule simpleModule = new SimpleModule();

        // 解决Long类型在前端精度丢失问题 - 将Long、BigInteger、BigDecimal转为String
        simpleModule.addSerializer(Long.class, ToStringSerializer.instance);
        simpleModule.addSerializer(Long.TYPE, ToStringSerializer.instance);
        simpleModule.addSerializer(BigInteger.class, ToStringSerializer.instance);
        simpleModule.addSerializer(BigDecimal.class, ToStringSerializer.instance);

        // 添加枚举序列化/反序列化配置
        this.enable(MapperFeature.ACCEPT_CASE_INSENSITIVE_ENUMS);

        this.registerModule(simpleModule);
    }

    private void configureSerializationFeatures() {
        // 禁用日期序列化为时间戳
        this.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

        // 禁用将时间区间序列化为时间戳
        this.disable(SerializationFeature.WRITE_DURATIONS_AS_TIMESTAMPS);

        // 禁用序列化空对象
        this.disable(SerializationFeature.FAIL_ON_EMPTY_BEANS);

        // 禁用序列化Map为数组
        this.disable(SerializationFeature.WRITE_EMPTY_JSON_ARRAYS);

        // 禁用序列化Map为数组
        this.disable(SerializationFeature.WRITE_SINGLE_ELEM_ARRAYS_UNWRAPPED);

        // 启用枚举序列化为名称
        this.enable(SerializationFeature.WRITE_ENUMS_USING_TO_STRING);

        // 启用对Map进行排序
        this.enable(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS);

        // 启用缩进输出（开发环境有用，生产环境通常关闭）
        // this.enable(SerializationFeature.INDENT_OUTPUT);
    }

    private void configureDeserializationFeatures() {
        // 禁用反序列化时遇到未知属性抛出异常
        this.disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);

        // 禁用将空字符串强制转换为空对象
        this.disable(DeserializationFeature.ACCEPT_EMPTY_STRING_AS_NULL_OBJECT);

        // 允许JSON数组映射为单个对象
        this.enable(DeserializationFeature.ACCEPT_SINGLE_VALUE_AS_ARRAY);

        // 允许忽略大小写
        this.enable(MapperFeature.ACCEPT_CASE_INSENSITIVE_PROPERTIES);

        // 允许使用BigDecimal反序列化浮点数
        this.enable(DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS);

        // 允许使用BigInteger反序列化整数
        this.enable(DeserializationFeature.USE_BIG_INTEGER_FOR_INTS);
    }

    // 提供构建器方法，可用于进一步自定义
    public static JacksonObjectMapper build() {
        return new JacksonObjectMapper();
    }

    /**
     * @param dateFormat
     * @return {@link JacksonObjectMapper }
     * 提供自定义日期格式的方法
     */
    public JacksonObjectMapper withDateFormat(String dateFormat) {
        this.setDateFormat(new SimpleDateFormat(dateFormat));
        return this;
    }

    /**
     * @param timeZone
     * @return {@link JacksonObjectMapper }
     * 提供自定义时区的方法
     */
    public JacksonObjectMapper withTimeZone(TimeZone timeZone) {
        this.setTimeZone(timeZone);
        return this;
    }
}