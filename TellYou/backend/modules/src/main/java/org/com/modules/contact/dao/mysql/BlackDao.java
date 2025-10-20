package org.com.modules.contact.dao.mysql;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.com.modules.contact.domain.entity.Black;
import org.com.modules.contact.mapper.BlackMapper;
import org.springframework.stereotype.Service;

/**
* @author lanye
* @createDate 2025-08-04 17:31:06
*/
@Service
public class BlackDao extends ServiceImpl<BlackMapper, Black>{
    public Black findBlack(Long fromId, Long target, Integer type){
        return lambdaQuery()
                .eq(Black::getFromId, fromId).eq(Black::getTarget, target)
                .eq(Black::getType, type).one();
    }
}




