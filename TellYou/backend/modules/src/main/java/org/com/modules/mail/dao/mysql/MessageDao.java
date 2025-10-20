package org.com.modules.mail.dao.mysql;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.com.modules.mail.domain.entity.Message;
import org.com.modules.mail.mapper.MessageMapper;
import org.springframework.stereotype.Service;

@Service
public class MessageDao extends ServiceImpl<MessageMapper, Message> {
}
