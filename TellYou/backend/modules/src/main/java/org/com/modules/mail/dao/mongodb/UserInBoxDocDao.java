package org.com.modules.mail.dao.mongodb;

import com.mongodb.client.result.DeleteResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.mail.domain.document.UserInBoxDoc;
import org.com.modules.deliver.domain.vo.push.PushedChat;
import org.com.modules.mail.domain.vo.resp.PullMessageResp;
import org.com.modules.group.service.adapter.MessageAdapter;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Slf4j
@Repository
@RequiredArgsConstructor
public class UserInBoxDocDao {
    private final MongoTemplate mongoTemplate;

    public int ackConfirm(Long userId, String msgId){
        Query query = new Query(Criteria
                .where("userId").is(userId)
                .and("quoteId").is(msgId));

        DeleteResult result = mongoTemplate.remove(query, UserInBoxDoc.class);

        if (result.getDeletedCount() > 0) {
            log.info("用户[{}]确认消息[{}]，已从信箱中删除", userId, msgId);
        } else {
            log.warn("用户[{}]确认消息[{}]失败，消息不存在或已被删除", userId, msgId);
        }

        return (int) result.getDeletedCount();
    }

    public int ackBatchConfirm(Long userId, List<String> msgIds) {
        if (msgIds == null || msgIds.isEmpty()) {
            return 0;
        }

        Query query = new Query(Criteria
                .where("userId").is(userId)
                .and("quoteId").in(msgIds));

        DeleteResult result = mongoTemplate.remove(query, UserInBoxDoc.class);
        log.info("用户[{}]批量确认消息，共删除 {} 条记录", userId, result.getDeletedCount());

        return (int) result.getDeletedCount();
    }

    /**
     * 拉取用户信箱消息
     *
     * @param userId 用户ID
     * @param size 拉取数量
     * @return 拉取结果
     */
    public PullMessageResp pull(Long userId, Integer size) {
        log.info("拉取用户[{}]信箱消息，数量: {}", userId, size);
        Query query = new Query(Criteria.where("userId").is(userId));
        query.limit(size + 1);
        query.with(org.springframework.data.domain.Sort.by(
                org.springframework.data.domain.Sort.Direction.DESC, "adjustedTimestamp"));
        query.fields()
                .include("userId")
                .include("senderId")
                .include("sessionId")
                .include("quoteId")
                .include("quoteType")
                .include("content")
                .include("adjustedTimestamp")
                .include("extra");
        List<UserInBoxDoc> docs = mongoTemplate.find(query, UserInBoxDoc.class);
        boolean hasMore = docs.size() == size + 1;
        if (hasMore) docs.removeLast();

        List<PushedChat> messageList = docs.stream()
                .map(MessageAdapter::mailToMessageResp)
                .collect(java.util.stream.Collectors.toList());

        log.info("拉取用户[{}]信箱消息完成，实际返回{}条，是否还有更多: {}",
                userId, messageList.size(), hasMore);

        return new PullMessageResp(messageList, hasMore);
    }
}
