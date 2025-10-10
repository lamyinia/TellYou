package org.com.modules.session.domain.vo.resp;

import lombok.*;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class PullFriendContactResp {
    List<ContactResp> contactList;
}
