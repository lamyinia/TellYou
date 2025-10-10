package org.com.modules.user.domain.vo.resp;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class SimpleApplyInfoList {
    private List<SimpleApplyInfo> applyInfoList;
}
