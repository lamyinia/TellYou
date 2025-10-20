package org.com.modules.contact.domain.document.callback;

import org.com.modules.common.util.SnowFlakeUtil;
import org.com.modules.contact.domain.document.SessionDoc;
import org.springframework.data.mongodb.core.mapping.event.BeforeConvertCallback;
import org.springframework.stereotype.Component;

@Component
public class SessionDocCallback implements BeforeConvertCallback<SessionDoc> {
    private final SnowFlakeUtil snowFlakeUtil;

    public SessionDocCallback(SnowFlakeUtil snowFlakeUtil) {
        this.snowFlakeUtil = snowFlakeUtil;
    }

    @Override
    public SessionDoc onBeforeConvert(SessionDoc source, String collection) {
        if (source.getSessionId() == null) {
            source.setSessionId(snowFlakeUtil.nextId());
        }
        return source;
    }
}
