package org.com.tools.utils;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;

import java.util.List;
import java.util.Map;

public class JsonUtils {
    private static final ObjectMapper defaultMapper = createDefaultMapper();
    private static final ObjectMapper safeMapper = createSafeMapper();

    private static ObjectMapper createDefaultMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        mapper.configure(SerializationFeature.FAIL_ON_EMPTY_BEANS, false);
        mapper.setSerializationInclusion(JsonInclude.Include.NON_NULL);
        return mapper;
    }

    private static ObjectMapper createSafeMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        mapper.configure(SerializationFeature.FAIL_ON_EMPTY_BEANS, false);
        mapper.setSerializationInclusion(JsonInclude.Include.NON_NULL);

        mapper.deactivateDefaultTyping();

        return mapper;
    }

    public static String toStr(Object t) {
        try {
            return safeMapper.writeValueAsString(t);
        } catch (Exception e) {
            throw new UnsupportedOperationException(e);
        }
    }

    public static String toStrWithTypeInfo(Object t) {
        try {
            return defaultMapper.writeValueAsString(t);
        } catch (Exception e) {
            throw new UnsupportedOperationException(e);
        }
    }

    public static <T> T toObj(String str, Class<T> clz) {
        try {
            return safeMapper.readValue(str, clz);
        } catch (JsonProcessingException e) {
            try {
                JsonNode node = defaultMapper.readTree(str);
                if (node.isArray() && node.size() == 2) {
                    return defaultMapper.treeToValue(node.get(1), clz);
                }
            } catch (JsonProcessingException ex) {
                // 忽略异常，抛出原始错误
            }
            throw new UnsupportedOperationException(e);
        }
    }

    public static <T> T toObj(String str, TypeReference<T> typeRef) {
        try {
            return safeMapper.readValue(str, typeRef);
        } catch (JsonProcessingException e) {
            try {
                JsonNode node = defaultMapper.readTree(str);
                if (node.isArray() && node.size() == 2 && node.get(1).isObject()) {
                    return defaultMapper.readValue(node.get(1).toString(), typeRef);
                }
            } catch (JsonProcessingException ex) {
            }
            throw new UnsupportedOperationException(e);
        }
    }

    public static Map<String, Object> toMap(String str) {
        if (str == null) return null;
        return toObj(str, new TypeReference<Map<String, Object>>() {});
    }

    public static <T> List<T> toList(String str, Class<T> clz) {
        try {
            return safeMapper.readValue(str, new TypeReference<List<T>>() {});
        } catch (JsonProcessingException e) {
            throw new UnsupportedOperationException(e);
        }
    }

    public static JsonNode toJsonNode(String str) {
        try {
            return defaultMapper.readTree(str);
        } catch (JsonProcessingException e) {
            throw new UnsupportedOperationException(e);
        }
    }

    public static <T> T nodeToValue(JsonNode node, Class<T> clz) {
        try {
            return defaultMapper.treeToValue(node, clz);
        } catch (JsonProcessingException e) {
            throw new UnsupportedOperationException(e);
        }
    }

    public static ObjectMapper getSafeMapper() {
        return safeMapper;
    }

    public static ObjectMapper getDefaultMapper() {
        return defaultMapper;
    }
}
