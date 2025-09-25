package org.com.modules.common.service.file.minio;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.tools.constant.UrlConstant;
import org.com.tools.template.MinioTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class DownloadService {
    private final MinioTemplate minioTemplate;

    public Map<String, Object> getAtomJson(String uid){
        return downloadJsonFile(UrlConstant.staticPath, uid);
    }

    public Map<String, Object> downloadJsonFile(String path, String fileName) {
        try {
            String objectName = path + fileName + ".json";
            return minioTemplate.getJsonObject(objectName);
        } catch (Exception e) {
            log.error("下载 {} 的 JSON 文件失败", fileName);
            return new HashMap<>();
        }
    }
}
