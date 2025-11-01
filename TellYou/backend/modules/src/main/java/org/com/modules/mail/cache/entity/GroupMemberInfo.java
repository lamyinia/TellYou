package org.com.modules.mail.cache.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.util.Objects;

@Getter
@Setter
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class GroupMemberInfo {
    private Long userId;

    private Integer role;

    /**
     * 只根据 userId 进行比较
     * 使得在 Set<GroupMemberInfo> 中，相同 userId 的对象被认为是相等的
     */
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        GroupMemberInfo that = (GroupMemberInfo) o;
        return Objects.equals(userId, that.userId);
    }

    /**
     * 只根据 userId 计算 hashCode
     * 确保相同 userId 的对象有相同的 hashCode
     */
    @Override
    public int hashCode() {
        return Objects.hash(userId);
    }
}
