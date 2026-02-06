package org.com.nettyconnector.domain.connection;

import java.util.Set;

public record SendFilter(Set<String> deviceIds, String excludeDeviceId) {

    public boolean matchesDeviceId(String deviceId) {
        if (deviceId == null) {
            return false;
        }
        if (excludeDeviceId != null && excludeDeviceId.equals(deviceId)) {
            return false;
        }
        if (deviceIds == null || deviceIds.isEmpty()) {
            return true;
        }
        return deviceIds.contains(deviceId);
    }
}
