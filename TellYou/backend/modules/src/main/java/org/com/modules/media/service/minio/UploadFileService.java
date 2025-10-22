package org.com.modules.media.service.minio;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.tools.constant.UrlConstant;
import org.com.tools.template.MinioTemplate;
import org.com.tools.template.domain.OssReq;
import org.com.tools.utils.JsonUtils;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class UploadFileService {
    private final MinioTemplate minioTemplate;

    public void writeDefaultUserAvatar(String objectName){
		try (InputStream inputStream = new ClassPathResource("avatar/user-default.avif").getInputStream()){
			minioTemplate.putObject(objectName, inputStream, "image/avif");
		} catch (Exception e){
			throw new RuntimeException("上传用户默认头像失败", e);
		}
    }
    public void writeDefaultGroupAvatar(String objectName){
        try (InputStream inputStream = new ClassPathResource("avatar/group-default.avif").getInputStream()){
            minioTemplate.putObject(objectName, inputStream, "image/avif");
        } catch (Exception e){
            throw new RuntimeException("上传群组默认头像失败", e);
        }
    }
    public void writeAtomJson(String uid, Map<String, Object> data){
        uploadJsonFile(UrlConstant.staticPath, uid, JsonUtils.toStr(data));
    }

    /**
     * 创建并上传JSON文件到MinIO
     *
     * @param path 文件路径（不包含文件名）
     * @param fileName 文件名（不包含.json后缀）
     * @param jsonData 要写入的JSON数据
     * @return 文件在MinIO中的完整路径
     */
    public void uploadJsonFile(String path, String fileName, String jsonData) {
        try {
            String objectName = path + fileName + ".json";
            minioTemplate.putJsonObject(objectName, jsonData);
        } catch (Exception e) {
            throw new RuntimeException("上传JSON文件失败", e);
        }
    }

    /**
     * 使用自动生成的路径上传JSON文件
     *
     * @param jsonData 要写入的JSON数据
     * @param req 包含文件信息的请求对象
     * @return 文件在MinIO中的完整路径
     */
    public String uploadJsonFileAutoPath(Object jsonData, OssReq req) {
        try {
            if (!req.getFileName().endsWith(".json")) {
                req.setFileName(req.getFileName() + ".json");
            }
            String objectName = minioTemplate.generateAutoPath(req);
            String jsonContent = JsonUtils.toStr(jsonData);
            minioTemplate.putJsonObject(objectName, jsonContent);
            return objectName;
        } catch (Exception e) {
            throw new RuntimeException("上传JSON文件失败", e);
        }
    }
}
