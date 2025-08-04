package org.com.modules.session.dao;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.common.domain.enums.YesOrNoEnum;
import org.com.modules.session.domain.document.SessionDocument;
import org.com.modules.session.domain.entity.Session;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Repository;
import org.springframework.data.mongodb.core.query.Query;

import java.util.Date;

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
            SessionDocument newSession = SessionDocument.builder()
                            .sessionId(sessionId).sequenceId(0L).isDeleted(YesOrNoEnum.NO.getStatus()).build();
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
     * @param session 会话文档
     * @return 保存后的会话文档
     */
    public SessionDocument insert(Session session) {
        SessionDocument document = SessionDocument.builder().sessionId(session.getSessionId()).sessionType(session.getSessionType())
                .createdAt(session.getCreatedAt()).sequenceId(0L).isDeleted(YesOrNoEnum.NO.getStatus()).build();

        return mongoTemplate.save(document);
    }

    public void updateLastMessage(Long sessionId, Long lastMsgId, String lastMsgContent, Date lastMsgTime) {
        Query query = new Query(Criteria.where("sessionId").is(sessionId));
        Update update = new Update()
                .set("lastMsgId", lastMsgId)
                .set("lastMsgContent", lastMsgContent)
                .set("lastMsgTime", lastMsgTime)
                .set("updatedAt", new Date());

        mongoTemplate.updateFirst(query, update, SessionDocument.class);
    }

}