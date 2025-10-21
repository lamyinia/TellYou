package org.com.modules.media.service.sign;

import cn.hutool.core.util.ArrayUtil;
import cn.hutool.core.util.StrUtil;
import com.alibaba.fastjson.JSON;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.rocketmq.spring.core.RocketMQTemplate;
import org.com.modules.common.util.FileHashUtil;
import org.com.modules.common.util.RequestHolder;
import org.com.modules.common.util.UploadSecurityUtil;
import org.com.modules.common.util.UrlUtil;
import org.com.modules.contact.domain.enums.ContactTypeEnum;
import org.com.modules.mail.domain.dto.ChatDTO;
import org.com.modules.mail.domain.enums.MessageTypeEnum;
import org.com.modules.media.domain.enums.MediaTypeEnum;
import org.com.modules.media.domain.vo.req.*;
import org.com.modules.media.domain.vo.resp.*;
import org.com.modules.user.dao.UserInfoDao;
import org.com.modules.user.domain.entity.UserInfo;
import org.com.modules.user.service.adapter.UserInfoAdapter;
import org.com.tools.constant.MQConstant;
import org.com.tools.constant.UrlConstant;
import org.com.tools.constant.ValueConstant;
import org.com.tools.template.MinioTemplate;
import org.com.tools.utils.JsonUtils;
import org.redisson.api.RedissonClient;
import org.springframework.messaging.Message;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;


@Slf4j
@Service
@RequiredArgsConstructor
public class SignServiceImpl implements SignService {
    private final MinioTemplate minioTemplate;
    private final UserInfoDao userInfoDao;
    private final RedissonClient redissonClient;
    private final RocketMQTemplate rocketMQTemplate;

    private final String[] needThumbedSuffix = {".webp", ".gif", ".avif"};
    // 签名获取逻辑：拿哈希 -> 拿objectName -> 拿url -> 存redis
    @Override
    public AvatarUploadResp getUserAvatarUploadResp(AvatarUploadReq req) {
        Long userId = RequestHolder.get().getUid();
        String uid = String.valueOf(userId);

        String identifierJson = userInfoDao.getIdentifierById(userId);
        Map<String, Object> identifier = JsonUtils.toMap(identifierJson);
        if (identifier == null) {
            identifier = UserInfoAdapter.getDefaultIdentifier();
            userInfoDao.lambdaUpdate()
                    .eq(UserInfo::getUserId, userId)
                    .set(UserInfo::getIdentifier, identifier)
                    .update();
        }
        String next = String.valueOf((Integer) identifier.get(ValueConstant.DEFAULT_AVATAR_VERSION_KEY) + 1);
        String suffix1 = getOriginalImageSuffix(req.getFileSuffix());
        String suffix2 = getThumbedImageSuffix();

        // /avatar/[original|thumb]/{uid}/{version}/index{extension}
        String originalObjectName = UrlConstant.originalAvatarPath + uid + StrUtil.SLASH + next + StrUtil.SLASH
                + ValueConstant.SINGLE_FILE + suffix1;
        String thumbnailObjectName = UrlConstant.thumbedAvatarPath + uid + StrUtil.SLASH + next + StrUtil.SLASH
                + ValueConstant.SINGLE_FILE + suffix2;

        // 使用安全的预签名URL生成
        String originalContentType = UrlUtil.getMimeType(suffix1);
        String thumbnailContentType = UrlUtil.getMimeType(suffix2);

        String originalUploadUrl = minioTemplate.getSecurePreSignedObjectUrl(originalObjectName, originalContentType, req.getFileSize(), 300);
        String thumbnailUploadUrl = minioTemplate.getSecurePreSignedObjectUrl(thumbnailObjectName, thumbnailContentType, req.getFileSize(), 300);

        // 缓存上传请求信息，用于后续验证
        UploadSecurityUtil.cacheUploadRequest(originalObjectName, req.getFileSize(), suffix1,
                                            userId, UploadSecurityUtil.ResourceType.AVATAR, redissonClient);
        UploadSecurityUtil.cacheUploadRequest(thumbnailObjectName, req.getFileSize(), suffix2,
                                            userId, UploadSecurityUtil.ResourceType.AVATAR, redissonClient);

        log.info("生成头像上传URL成功，用户: {}, 原图: {}, 缩略图: {}", userId, originalObjectName, thumbnailObjectName);

        return new AvatarUploadResp(originalUploadUrl, thumbnailUploadUrl);
    }

    @Override
    public AvatarUploadResp getGroupAvatarUploadResp(AvatarUploadReq req) {
        return null;
    }

    @Override
    public PictureUploadResp getPictureUploadResp(PictureUploadReq req) {
        String hash1 = FileHashUtil.generateFileHash(req.getFromUserId(), req.getTargetId(), req.getFileSize(), "", FileHashUtil.HashStrategy.METADATA_BASED);
        String hash2 = FileHashUtil.generateFileHash(req.getFromUserId(), req.getTargetId(), req.getFileSize()+996, "", FileHashUtil.HashStrategy.METADATA_BASED);

        String suffix1 = getOriginalImageSuffix(req.getFileSuffix());
        String suffix2 = getThumbedImageSuffix();

        String originalContentType = UrlUtil.getMimeType(suffix1);
        String thumbnailContentType = UrlUtil.getMimeType(suffix2);

        String object1 = UrlUtil.generateObjectName(MediaTypeEnum.IMAGE.getValue(), req.getTargetId() + "_" + req.getContactType(), hash1, suffix1);
        String object2 = UrlUtil.generateObjectName(MediaTypeEnum.IMAGE.getValue(), req.getTargetId() + "_" + req.getContactType(), hash2, suffix2);

        String originalUploadUrl = minioTemplate.getSecurePreSignedObjectUrl(object1, originalContentType, req.getFileSize(), 300);
        String thumbnailUploadUrl = minioTemplate.getSecurePreSignedObjectUrl(object2, thumbnailContentType, req.getFileSize(), 300);

        UploadSecurityUtil.cacheUploadRequest(object1, req.getFileSize(), suffix1, req.getFromUserId(), UploadSecurityUtil.ResourceType.PICTURE, redissonClient);
        UploadSecurityUtil.cacheUploadRequest(object2, req.getFileSize(), suffix2, req.getFromUserId(), UploadSecurityUtil.ResourceType.PICTURE, redissonClient);

        return new PictureUploadResp(originalUploadUrl, thumbnailUploadUrl);
    }

    @Override
    public FileUploadResp getFileUploadResp(FileUploadReq req) {
        String hash = FileHashUtil.generateFileHash(req.getFromUserId(), req.getTargetId(), req.getFileSize(), "", FileHashUtil.HashStrategy.METADATA_BASED);
        String suffix = getOriginalFileSuffix(req.getFileSuffix());
        String contentType = UrlUtil.getMimeType(suffix);
        String object = UrlUtil.generateObjectName(MediaTypeEnum.FILE.getValue(), req.getTargetId() + "_" + req.getContactType(), hash, suffix);
        String uploadUrl = minioTemplate.getSecurePreSignedObjectUrl(object, contentType, req.getFileSize(), 300);
        UploadSecurityUtil.cacheUploadRequest(object, req.getFileSize(), suffix, req.getFromUserId(), UploadSecurityUtil.ResourceType.FILE, redissonClient);
        return new FileUploadResp(uploadUrl);
    }

    @Override
    public VideoUploadResp getVideoUploadResp(VideoUploadReq req) {
        String hash1 = FileHashUtil.generateFileHash(req.getFromUserId(), req.getTargetId(), req.getFileSize(), "", FileHashUtil.HashStrategy.METADATA_BASED);
        String hash2 = FileHashUtil.generateFileHash(req.getFromUserId(), req.getTargetId(), req.getFileSize()+996, "thumbnail", FileHashUtil.HashStrategy.METADATA_BASED);

        String suffix1 = getOriginalVideoSuffix(req.getFileSuffix());
        String suffix2 = getThumbedVideoSuffix();

        String videoContentType = UrlUtil.getMimeType(suffix1);
        String thumbnailContentType = UrlUtil.getMimeType(suffix2);

        String object1 = UrlUtil.generateObjectName(MediaTypeEnum.VIDEO.getValue(), req.getTargetId() + "_" + req.getContactType(), hash1, suffix1);
        String object2 = UrlUtil.generateObjectName(MediaTypeEnum.VIDEO.getValue(), req.getTargetId() + "_" + req.getContactType(), hash2, suffix2);

        String videoUploadUrl = minioTemplate.getSecurePreSignedObjectUrl(object1, videoContentType, req.getFileSize(), 300);
        String thumbnailUploadUrl = minioTemplate.getSecurePreSignedObjectUrl(object2, thumbnailContentType, req.getFileSize(), 300);

        UploadSecurityUtil.cacheUploadRequest(object1, req.getFileSize(), suffix1, req.getFromUserId(), UploadSecurityUtil.ResourceType.VIDEO, redissonClient);
        UploadSecurityUtil.cacheUploadRequest(object2, req.getFileSize(), suffix2, req.getFromUserId(), UploadSecurityUtil.ResourceType.VIDEO, redissonClient);
        return new VideoUploadResp(videoUploadUrl, thumbnailUploadUrl);
    }

    @Override
    public VoiceUploadResp getVoiceUploadResp(VoiceUploadReq req) {
        // 生成语音文件哈希
        String hash = FileHashUtil.generateFileHash(req.getFromUserId(), req.getTargetId(), req.getFileSize(), "", FileHashUtil.HashStrategy.METADATA_BASED);

        // 语音文件统一转换为.ogg格式（Opus编码）
        String suffix = ".ogg";
        String contentType = UrlUtil.getMimeType(suffix);

        // 生成对象名：chat/voice/targetId_type/date/hash/index.ogg
        String objectName = UrlUtil.generateObjectName(MediaTypeEnum.VOICE.getValue(), req.getTargetId() + "_" + req.getContactType(), hash, suffix);

        // 生成预签名URL
        String uploadUrl = minioTemplate.getSecurePreSignedObjectUrl(objectName, contentType, req.getFileSize(), 300);

        // 缓存上传请求信息（包含语音时长）
        UploadSecurityUtil.cacheUploadRequest(objectName, req.getFileSize(), suffix, req.getFromUserId(), UploadSecurityUtil.ResourceType.VOICE, req.getDuration(), redissonClient);

        log.info("生成语音上传URL成功，用户: {}, 目标: {}, 时长: {}秒, 对象: {}", req.getFromUserId(), req.getTargetId(), req.getDuration(), objectName);

        return new VoiceUploadResp(uploadUrl);
    }

    @Override
    public void confirmPictureUpload(PictureUploadConfirmReq req) {

        UploadSecurityUtil.validateUploadSecurity(req.getOriginalObject(), req.getFromUserId(),
                UploadSecurityUtil.ResourceType.PICTURE, redissonClient, minioTemplate);
        UploadSecurityUtil.validateUploadSecurity(req.getThumbnailObject(), req.getFromUserId(),
                UploadSecurityUtil.ResourceType.PICTURE, redissonClient, minioTemplate);

        Message<String> message = buildPictureChatDTO(req);
        rocketMQTemplate.send(MQConstant.SESSION_TOPIC, message);
    }

    @Override
    public void confirmVoiceUpload(VoiceUploadConfirmReq req) {
        UploadSecurityUtil.validateUploadSecurity(req.getFileObject(), req.getFromUserId(),
                UploadSecurityUtil.ResourceType.VOICE, redissonClient, minioTemplate);

        Message<String> message = buildVoiceChatDTO(req);
        rocketMQTemplate.send(MQConstant.SESSION_TOPIC, message);
    }

    @Override
    public void confirmVideoUpload(VideoUploadConfirmReq req) {
        UploadSecurityUtil.validateUploadSecurity(req.getFileObject(), req.getFromUserId(),
                UploadSecurityUtil.ResourceType.VIDEO, redissonClient, minioTemplate);
        UploadSecurityUtil.validateUploadSecurity(req.getThumbnailObject(), req.getFromUserId(),
                UploadSecurityUtil.ResourceType.VIDEO, redissonClient, minioTemplate);

        Message<String> message = buildVideoChatDTO(req);
        rocketMQTemplate.send(MQConstant.SESSION_TOPIC, message);
    }

    @Override
    public void confirmFileUpload(FileUploadConfirmReq req) {
        UploadSecurityUtil.validateUploadSecurity(req.getFileObject(), req.getFromUserId(),
                UploadSecurityUtil.ResourceType.FILE, redissonClient, minioTemplate);

        Message<String> message = buildFileChatDTO(req);
        rocketMQTemplate.send(MQConstant.SESSION_TOPIC, message);
    }

    //  动图头像转化为 .avif
    private String getOriginalImageSuffix(String suffix){
        if (ArrayUtil.contains(needThumbedSuffix, suffix)) return ".avif";  // 就算是原图，动图也需要压缩
        else return suffix;
    }
    //  缩略头像统一用 .avif 后缀
    private String getThumbedImageSuffix(){
        return ".avif";
    }
    private String getOriginalFileSuffix(String suffix){
        return suffix;
    }
    private String getOriginalVideoSuffix(String suffix){
        return suffix;
    }
    private String getThumbedVideoSuffix(){
        return ".avif";
    }

    private Message<String> buildPictureChatDTO(PictureUploadConfirmReq req){
        Map<String, Object> map = new HashMap<>();
        map.put("originalObject", req.getOriginalObject());
        map.put("thumbnailObject", req.getThumbnailObject());
        Integer type = req.getContactType() == ContactTypeEnum.FRIEND.getStatus() ? MessageTypeEnum.PRIVATE_IMAGE.getType() : MessageTypeEnum.GROUP_IMAGE.getType();
        ChatDTO chatDTO = ChatDTO.builder()
            .fromUserId(req.getFromUserId())
            .targetId(req.getTargetId())
            .sessionId(req.getSessionId())
            .extra(map)
            .type(type)
            .build();
        return MessageBuilder.withPayload(JSON.toJSONString(chatDTO)).build();
    }
    private Message<String> buildVoiceChatDTO(VoiceUploadConfirmReq req){
        Map<String, Object> map = new HashMap<>();
        map.put("fileObject", req.getFileObject());
        Integer type = req.getContactType() == ContactTypeEnum.FRIEND.getStatus() ? MessageTypeEnum.PRIVATE_VOICE.getType() : MessageTypeEnum.GROUP_VOICE.getType();
        ChatDTO chatDTO = ChatDTO.builder()
            .fromUserId(req.getFromUserId())
            .targetId(req.getTargetId())
            .sessionId(req.getSessionId())
            .extra(map)
            .type(type)
            .build();
        return MessageBuilder.withPayload(JSON.toJSONString(chatDTO)).build();
    }
    private Message<String> buildVideoChatDTO(VideoUploadConfirmReq req){
        Map<String, Object> map = new HashMap<>();
        map.put("fileObject", req.getFileObject());
        map.put("thumbnailObject", req.getThumbnailObject());
        Integer type = req.getContactType() == ContactTypeEnum.FRIEND.getStatus() ? MessageTypeEnum.PRIVATE_VIDEO.getType() : MessageTypeEnum.GROUP_VIDEO.getType();
        ChatDTO chatDTO = ChatDTO.builder()
            .fromUserId(req.getFromUserId())
            .targetId(req.getTargetId())
            .sessionId(req.getSessionId())
            .extra(map)
            .type(type)
            .build();
        return MessageBuilder.withPayload(JSON.toJSONString(chatDTO)).build();
    }
    private Message<String> buildFileChatDTO(FileUploadConfirmReq req){
        Map<String, Object> map = new HashMap<>();
        map.put("fileObject", req.getFileObject());
        Integer type = req.getContactType() == ContactTypeEnum.FRIEND.getStatus() ? MessageTypeEnum.PRIVATE_FILE.getType() : MessageTypeEnum.GROUP_FILE.getType();
        ChatDTO chatDTO = ChatDTO.builder()
            .fromUserId(req.getFromUserId())
            .targetId(req.getTargetId())
            .sessionId(req.getSessionId())
            .extra(map)
            .type(type)
            .build();
        return MessageBuilder.withPayload(JSON.toJSONString(chatDTO)).build();
    }
}
