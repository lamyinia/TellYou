package org.com.modules.common.dao;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.common.domain.document.SessionDocument;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Repository;
import org.springframework.data.mongodb.core.query.Query;

/**
 * 会话数据访问层
 * @author lanye
 * @date 2025/08/01
 */
@Slf4j
@Repository
@RequiredArgsConstructor
public class MongoSessionDao {

    private final MongoTemplate mongoTemplate;

    /**
     * 根据sessionId查询并自增sequenceId
     * @param sessionId 会话ID
     * @return 自增后的sequenceId
     */
    public Long getAndIncrementSequenceId(Long sessionId) {
        Query query = new Query(Criteria.where("sessionId").is(sessionId));
        Update update = new Update().inc("sequenceId", 1);

        SessionDocument result = mongoTemplate.findAndModify(
                query,
                update,
                SessionDocument.class
        );

        if (result == null) {
            SessionDocument newSession = new SessionDocument();
            newSession.setSessionId(sessionId);
            newSession.setSequenceId(1L);
            newSession.setIsDeleted(0);
            mongoTemplate.save(newSession);
            return 1L;
        }

        return result.getSequenceId() + 1;
    }

    /**
     * 根据sessionId查询会话
     * @param sessionId 会话ID
     * @return 会话文档
     */
    public SessionDocument findBySessionId(Long sessionId) {
        Query query = new Query(Criteria.where("sessionId").is(sessionId));
        return mongoTemplate.findOne(query, SessionDocument.class);
    }

    /**
     * 保存会话
     * @param sessionDocument 会话文档
     * @return 保存后的会话文档
     */
    public SessionDocument save(SessionDocument sessionDocument) {
        return mongoTemplate.save(sessionDocument);
    }
/*
    *//**
     * 更新会话的最后消息信息
     * @param sessionId 会话ID
     * @param lastMsgId 最后消息ID
     * @param lastMsgContent 最后消息内容
     * @param lastMsgTime 最后消息时间
     *//*
    public void updateLastMessage(Long sessionId, Long lastMsgId, String lastMsgContent, LocalDateTime lastMsgTime) {
        Query query = new Query(Criteria.where("sessionId").is(sessionId));
        Update update = new Update()
                .set("lastMsgId", lastMsgId)
                .set("lastMsgContent", lastMsgContent)
                .set("lastMsgTime", lastMsgTime)
                .set("updatedAt", LocalDateTime.now());

        mongoTemplate.updateFirst(query, update, SessionDocument.class);
    }
    */
}