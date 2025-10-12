package org.com.modules.user.domain.vo.resp;

import lombok.*;
import org.com.modules.session.domain.vo.resp.ContactResp;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class PullFriendContactResp {
    List<ContactResp> contactList;
}
