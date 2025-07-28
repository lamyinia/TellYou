package org.com.modules.chat.utils;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.chat.domain.document.MessageMailBox;
import org.com.modules.chat.domain.dto.MessageDTO;
import org.com.modules.chat.domain.vo.MessageVO;
import org.com.modules.chat.service.MessageMailBoxService;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class MessageConvertUtil {
    private final MessageMailBoxService messageMailBoxService;

    public MessageMailBox covertToDocumentAndSave(MessageDTO dto) {
        return messageMailBoxService.save(dto);
    }

    public MessageVO covertToVO(MessageMailBox document) {
        return null;
    }
}
