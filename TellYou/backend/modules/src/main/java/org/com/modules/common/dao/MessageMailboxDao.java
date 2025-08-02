package org.com.modules.common.dao;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.common.domain.document.MessageMailboxDocument;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Repository;

@Slf4j
@Repository
@RequiredArgsConstructor
public class MessageMailboxDao {
    private final MongoTemplate mongoTemplate;

    public MessageMailboxDocument save(MessageMailboxDocument document){
        return mongoTemplate.save(document);
    }
}
