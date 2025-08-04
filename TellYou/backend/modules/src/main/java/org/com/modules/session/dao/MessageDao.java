package org.com.modules.session.dao;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.com.modules.session.domain.entity.Message;
import org.com.modules.session.mapper.MessageMapper;
import org.springframework.stereotype.Service;

@Service
public class MessageDao extends ServiceImpl<MessageMapper, Message> {
}
