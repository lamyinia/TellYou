package org.com.nettyconnector.domain.connection;

public record SendResult(int delivered, int offline, int notWritable, int errors) {
}
