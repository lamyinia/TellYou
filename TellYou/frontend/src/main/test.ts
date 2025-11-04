/* eslint-disable */

import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import { mediaUtil } from "./util/media-util";
import log from 'electron-log'

const measureTime = (label: string) => {
  const startTime = Date.now();
  console.log(`[${label}] 开始时间:`, new Date(startTime).toLocaleTimeString());
  return {
    end: (additionalInfo?: any) => {
      const endTime = Date.now();
      const duration = endTime - startTime;
      console.log(
        `[${label}] 结束时间:`,
        new Date(endTime).toLocaleTimeString(),
      );
      console.log(`[${label}] 总耗时:`, duration, "ms");
      console.log(`[${label}] 总耗时:`, (duration / 1000).toFixed(2), "秒");
      if (additionalInfo) {
        console.log(`[${label}] 性能统计:`, additionalInfo);
      }
      return duration;
    },
  };
};
const calculatePerformance = (
  duration: number,
  fileSize: number,
  originalSize?: number,
) => {
  const compressionRatio = originalSize
    ? (((originalSize - fileSize) / originalSize) * 100).toFixed(1)
    : "N/A";
  const processingSpeed = (fileSize / (duration / 1000) / 1024).toFixed(2); // KB/s

  return {
    duration: `${duration}ms`,
    fileSize: `${(fileSize / 1024).toFixed(2)}KB`,
    compressionRatio: originalSize ? `${compressionRatio}%` : "N/A",
    processingSpeed: `${processingSpeed}KB/s`,
  };
};

const check_input_file = async (filePath: string): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        console.error("检查文件信息失败:", err);
        reject(err);
        return;
      }
      console.log("=== 输入文件信息 ===");
      console.log("格式:", metadata.format.format_name);
      console.log("时长:", metadata.format.duration, "秒");
      console.log("比特率:", metadata.format.bit_rate);
      console.log("流数量:", metadata.streams.length);
      metadata.streams.forEach((stream, index) => {
        console.log(`流 ${index}:`);
        console.log("  类型:", stream.codec_type);
        console.log("  编码器:", stream.codec_name);
        console.log("  分辨率:", stream.width + "x" + stream.height);
        if (stream.codec_type === "video") {
          console.log("  帧率:", stream.r_frame_rate);
          console.log("  总帧数:", stream.nb_frames);
          console.log("  像素格式:", stream.pix_fmt);
        }
      });
      resolve();
    });
  });
};
const t_ffmpeg_compress_gif = (originalSize?: number): void => {
  /*  await sharp(tempInputPath)
    .toFormat('avif')
    .toFile('D:/各种素材/compress/sharp.avif', (err, info) => { // 指定输出文件路径
      if (err) {
        console.error('生成 AVIF 文件失败:', err);
      } else {
        console.log('sharp 成功生成 AVIF 文件:', info);
      }
    });
  console.log('开始测试')
  const inputPath: string = 'D:/各种素材/gif/f0b20537c1f3489b5bcff1df219fc23fd9d67865.gif'
  const outputPath: string = 'D:/各种素材/compress/out7.avif'
  const buffer = fs.readFileSync(inputPath)
  console.log(buffer.length / 1024)
  const result = await mediaUtil.processMotion({mimeType: 'image/gif', buffer: buffer, originalName: 'test', size: buffer.length}, 'thumb')
  console.log(result.compressedBuffer.length / 1024)
  fs.writeFileSync(outputPath, result.compressedBuffer)*/

  const inputPath: string =
    "D:/各种素材/gif/37f77871d417c76a08a9467527e9670810c4c442.gif";
  const outputPath: string = "D:/各种素材/compress/out.avif";
  const timer = measureTime("AVIF转换");
  ffmpeg(inputPath)
    .outputOptions([
      "-c:v libaom-av1", // 使用 libaom-av1 编码器
      "-crf 45",
      "-b:v 0", // 使用 CRF 模式
      "-cpu-used 8", // 最高速度模式 (0-8, 8最快)
      "-threads 0", // 使用所有可用线程
      "-pix_fmt yuv420p", // 像素格式
      "-movflags +faststart",
      "-f avif", // 输出 AVIF 格式
    ])
    .on("start", (commandLine) => {
      console.log("FFmpeg 命令:", commandLine);
    })
    .on("end", () => {
      const stats = fs.statSync(outputPath);
      console.log("AVIF 文件生成成功:", outputPath);
      console.log("文件大小:", (stats.size / 1024).toFixed(2), "KB");
      const duration = timer.end();
      const performance = calculatePerformance(
        duration,
        stats.size,
        originalSize,
      );
      console.log("性能统计:", performance);
    })
    .on("error", (err) => {
      console.error("AVIF 转换失败:", err.message);
    })
    .save(outputPath);
};

const test_video_preview = async () => {
  const inputPath: string = "D:/multi-media-material/video/ailun.mp4";
  const outPutPath: string = "D:/multi-media-material/compress/videoNail.png";
  console.log(path.dirname(outPutPath) + ":" + path.basename(outPutPath));

  const snap = Math.floor(Math.random() * 100);
  console.log(snap);

  await new Promise<void>((resolve, reject) => {
    ffmpeg(inputPath)
      .screenshots({
        timestamps: [`${snap}%`],
        folder: path.dirname(outPutPath),
        filename: path.basename(outPutPath),
        size: "800x?",
      })
      .on("end", () => {
        try {
          fs.readFileSync(outPutPath);
          resolve();
        } catch (_err) {
          console.log(_err);
          reject();
        }
      })
      .on("error", reject);
  })
    .then(() => {
      console.info("缩略图生成成功");
    })
    .catch(() => {
      console.info("缩略图生成失败");
    });
};

export const test = async (blob: ArrayBuffer): Promise<void> => {
  try {
    const inputPath = 'D:\\multi-media-material\\video\\ailun.mp4'
    const outputPath = 'D:\\multi-media-material\\compress\\ailun_out.avif'

    console.log('开始处理视频文件:', inputPath)
    const mediaFile = await mediaUtil.getNormal(inputPath)
    console.log('媒体文件信息:', {
      size: mediaFile.buffer.length,
      mimeType: mediaFile.mimeType
    })

    const result = await mediaUtil.generateVideoThumbnail(mediaFile)


    fs.writeFileSync(outputPath, result.thumbnailBuffer)
    console.log('缩略图已保存到:', outputPath)

  } catch (error) {
    console.error('测试失败:', error)
    throw error
  }
}
