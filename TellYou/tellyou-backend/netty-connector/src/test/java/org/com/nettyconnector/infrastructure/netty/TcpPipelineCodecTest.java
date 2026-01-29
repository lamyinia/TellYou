package org.com.nettyconnector.infrastructure.netty;

import io.netty.buffer.ByteBuf;
import io.netty.channel.embedded.EmbeddedChannel;
import io.netty.handler.codec.protobuf.ProtobufDecoder;
import io.netty.handler.codec.protobuf.ProtobufEncoder;
import io.netty.util.ReferenceCountUtil;
import org.com.nettyconnector.proto.connector.tcp.v1.Envelope;
import org.com.nettyconnector.proto.connector.tcp.v1.Ping;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

public class TcpPipelineCodecTest {

    @Test
    void shouldEncodeAndDecodeEnvelopeWithTcpHeader() {
        Envelope outbound = Envelope.newBuilder()
                .setVersion(1)
                .setStreamId(42)
                .setTimestampMs(1_700_000_000_000L)
                .setTraceId("t-1")
                .setPing(Ping.newBuilder().build())
                .build();

        EmbeddedChannel ch = new EmbeddedChannel(
                new TcpFrameDecoder(TcpProtocolConstants.DEFAULT_MAX_BODY_LEN),
                new ProtobufDecoder(Envelope.getDefaultInstance()),
                new TcpFrameEncoder(),
                new ProtobufEncoder()
        );

        ByteBuf encoded = null;
        try {
            Assertions.assertTrue(ch.writeOutbound(outbound));
            encoded = ch.readOutbound();
            Assertions.assertNotNull(encoded);

            ch.writeInbound(encoded.retain());
            Envelope inbound = ch.readInbound();
            Assertions.assertNotNull(inbound);

            Assertions.assertEquals(outbound.getVersion(), inbound.getVersion());
            Assertions.assertEquals(outbound.getStreamId(), inbound.getStreamId());
            Assertions.assertEquals(outbound.getTimestampMs(), inbound.getTimestampMs());
            Assertions.assertEquals(outbound.getTraceId(), inbound.getTraceId());
            Assertions.assertEquals(Envelope.PayloadCase.PING, inbound.getPayloadCase());
        } finally {
            ReferenceCountUtil.release(encoded);
            ch.finishAndReleaseAll();
        }
    }
}
