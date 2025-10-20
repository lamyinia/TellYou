package org.com.modules.contact.domain.vo.resp;

import lombok.*;
import org.com.modules.group.domain.vo.resp.ContactResp;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class PullFriendContactResp {
    List<ContactResp> contactList;
}
