package org.com.modules.session.dao;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.session.domain.document.MessageDoc;
import org.com.modules.session.domain.document.UserInBoxDoc;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

@Slf4j
@Repository
@RequiredArgsConstructor
public class MessageDocDao {
    private final MongoTemplate mongoTemplate;

    public void save(MessageDoc messageDoc){
        mongoTemplate.save(messageDoc);
    }

    public void batchSave(List<UserInBoxDoc> messageMailList) {
        if (messageMailList == null || messageMailList.isEmpty()) {
            return;
        }
        mongoTemplate.insert(messageMailList, UserInBoxDoc.class);
    }
}
