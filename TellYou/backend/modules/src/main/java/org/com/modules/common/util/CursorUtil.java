package org.com.modules.common.util;

import cn.hutool.core.collection.CollectionUtil;
import cn.hutool.core.lang.Pair;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.support.SFunction;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import org.com.modules.common.domain.vo.req.CursorPageReq;
import org.com.modules.common.domain.vo.resp.CursorPageResp;
import org.com.tools.utils.RedisUtils;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.redis.core.ZSetOperations;

import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 游标分页工具类
 * @author lanye
 * @date 2025/08/08
 */
public class CursorUtil {
    public static <T> CursorPageResp<Pair<T, Double>> getCursorPageByRedis(CursorPageReq cursorPageReq, String redisKey, Function<String, T> typeConvert) {
        Set<ZSetOperations.TypedTuple<String>> typedTuples;
        if (StrUtil.isBlank(cursorPageReq.getCursor())) {//第一次
            typedTuples = RedisUtils.zReverseRangeWithScores(redisKey, cursorPageReq.getPageSize());
        } else {
            typedTuples = RedisUtils.zReverseRangeByScoreWithScores(redisKey, Double.parseDouble(cursorPageReq.getCursor()), cursorPageReq.getPageSize());
        }
        List<Pair<T, Double>> result = typedTuples
                .stream()
                .map(t -> Pair.of(typeConvert.apply(t.getValue()), t.getScore()))
                .sorted((o1, o2) -> o2.getValue().compareTo(o1.getValue()))
                .collect(Collectors.toList());
        String cursor = Optional.ofNullable(CollectionUtil.getLast(result))
                .map(Pair::getValue)
                .map(String::valueOf)
                .orElse(null);
        Boolean isLast = result.size() != cursorPageReq.getPageSize();
        return new CursorPageResp<>(cursor, isLast, result);
    }

    // select ..... where ... last_apply_time < ? order by last_apply_time desc
    public static <T> CursorPageResp<T> getCursorPageByMysqlDesc(IService<T> iService, CursorPageReq request, Consumer<LambdaQueryWrapper<T>> initWrapper, SFunction<T, ?> cursorColumn){
        Class<?> cursorType = LambdaUtil.getReturnType(cursorColumn);
        LambdaQueryWrapper<T> wrapper = new LambdaQueryWrapper<>();
        initWrapper.accept(wrapper);

        if (StrUtil.isNotBlank(request.getCursor())){
            wrapper.lt(cursorColumn, parseCursor(request.getCursor(), cursorType));
        }
        wrapper.orderByDesc(cursorColumn);

        Page<T> page = iService.page(request.plusPage(), wrapper);
        String cursor = Optional.ofNullable(CollectionUtil.getLast(page.getRecords()))
                .map(cursorColumn).map(CursorUtil::toCursor).orElse(null);

        Boolean isLast = page.getRecords().size() != request.getPageSize();
        return new CursorPageResp<>(cursor, isLast, page.getRecords());
    }
    // select ..... where ... last_apply_time > ? order by last_apply_time asc
    public static <T> CursorPageResp<T> getCursorPageByMysqlAsc(IService<T> iService, CursorPageReq request, Consumer<LambdaQueryWrapper<T>> initWrapper, SFunction<T, ?> cursorColumn){
        Class<?> cursorType = LambdaUtil.getReturnType(cursorColumn);
        LambdaQueryWrapper<T> wrapper = new LambdaQueryWrapper<>();
        initWrapper.accept(wrapper);

        if (StrUtil.isNotBlank(request.getCursor())){
            wrapper.gt(cursorColumn, parseCursor(request.getCursor(), cursorType));
        }
        wrapper.orderByAsc(cursorColumn);

        Page<T> page = iService.page(request.plusPage(), wrapper);
        String cursor = Optional.ofNullable(CollectionUtil.getLast(page.getRecords()))
                .map(cursorColumn).map(CursorUtil::toCursor).orElse(null);

        Boolean isLast = page.getRecords().size() != request.getPageSize();
        return new CursorPageResp<>(cursor, isLast, page.getRecords());
    }

    /**
     * MongoDB 游标分页查询
     * @param mongoTemplate MongoDB模板
     * @param request 分页请求
     * @param collectionName 集合名称
     * @param documentClass 文档类型
     * @param initCriteria 初始化查询条件
     * @param cursorField 游标字段名
     * @param <T> 文档类型
     * @return 游标分页响应
     * @example
     */
    public static <T> CursorPageResp<T> getCursorPageByMongoDB(
            MongoTemplate mongoTemplate,
            CursorPageReq request,
            String collectionName,
            Class<T> documentClass,
            Consumer<Criteria> initCriteria,
            String cursorField) {
/*
        使用示例：
        CursorPageResp<MessageDoc> result = CursorUtil.getCursorPageByMongoDB(
            mongoTemplate,
            request,
            "message_mailbox",
            MessageDoc.class,
            criteria -> criteria.and("sessionId").is(sessionId),
            "createTime"
        );
*/
        Criteria criteria = new Criteria();
        initCriteria.accept(criteria);

        if (StrUtil.isNotBlank(request.getCursor())) {
            criteria.and(cursorField).lt(parseCursor(request.getCursor(), Object.class));
        }

        Query query = new Query(criteria);
        query.with(Sort.by(Sort.Direction.DESC, cursorField));
        query.limit(request.getPageSize());

        List<T> records = mongoTemplate.find(query, documentClass, collectionName);

        String cursor = Optional.ofNullable(CollectionUtil.getLast(records))
                .map(record -> {
                    try {
                        java.lang.reflect.Field field = record.getClass().getDeclaredField(cursorField);
                        field.setAccessible(true);
                        Object value = field.get(record);
                        return toCursor(value);
                    } catch (Exception e) {
                        return null;
                    }
                })
                .orElse(null);

        Boolean isLast = records.size() != request.getPageSize();

        return new CursorPageResp<>(cursor, isLast, records);
    }

    private static String toCursor(Object o){
        if (o instanceof Date) {
            return String.valueOf(((Date) o).getTime());
        } else {
            return o.toString();
        }
    }

    private static Object parseCursor(String cursor, Class<?> cursorClass) {
        if (Date.class.isAssignableFrom(cursorClass)) {
            return new Date(Long.parseLong(cursor));
        } else {
            return cursor;
        }
    }
}
