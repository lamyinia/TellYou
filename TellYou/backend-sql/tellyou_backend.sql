-- MySQL dump 10.13  Distrib 8.0.40, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: tell_you
-- ------------------------------------------------------
-- Server version	8.0.40

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `contact_apply`
--

DROP TABLE IF EXISTS `contact_apply`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contact_apply` (
  `apply_id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '自增ID',
  `apply_user_id` bigint unsigned NOT NULL COMMENT '申请人 id',
  `target_id` bigint unsigned NOT NULL COMMENT '目标 id',
  `contact_type` tinyint(1) NOT NULL COMMENT '联系人类型 0:好友 1:群组',
  `last_apply_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '最后申请时间',
  `status` tinyint(1) DEFAULT NULL COMMENT '状态0: 待处理 1:已同意  2:已拒绝  3:已拉黑',
  `apply_info` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '申请信息',
  PRIMARY KEY (`apply_id`),
  UNIQUE KEY `idx_key` (`apply_user_id`,`target_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='联系人申请';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contact_apply`
--

LOCK TABLES `contact_apply` WRITE;
/*!40000 ALTER TABLE `contact_apply` DISABLE KEYS */;
/*!40000 ALTER TABLE `contact_apply` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `im_friend_contact`
--

DROP TABLE IF EXISTS `im_friend_contact`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `im_friend_contact` (
  `user_id` bigint unsigned NOT NULL COMMENT '用户id',
  `session_id` bigint unsigned NOT NULL COMMENT '会话id',
  `contact_id` bigint unsigned NOT NULL COMMENT '联系人id',
  `status` enum('active','doDeleted','wasDeleted','doBlocked','wasBlocked') COLLATE utf8mb4_general_ci DEFAULT 'active' COMMENT '关系状态',
  `created_at` timestamp(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` timestamp(3) NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`user_id`,`contact_id`),
  KEY `idx_session` (`session_id`),
  KEY `idx_status` (`status`),
  KEY `idx_contact` (`contact_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='用户好友会话关系'
/*!50100 PARTITION BY HASH ((`user_id` % 64))
PARTITIONS 64 */;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `im_friend_contact`
--

LOCK TABLES `im_friend_contact` WRITE;
/*!40000 ALTER TABLE `im_friend_contact` DISABLE KEYS */;
/*!40000 ALTER TABLE `im_friend_contact` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `im_group_contact`
--

DROP TABLE IF EXISTS `im_group_contact`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `im_group_contact` (
  `member_id` bigint unsigned NOT NULL COMMENT '成员关系id',
  `group_id` bigint unsigned NOT NULL COMMENT '群组id',
  `user_id` bigint unsigned NOT NULL COMMENT '成员id',
  `role` tinyint NOT NULL COMMENT '1=成员 2=管理员 3=群主',
  `join_time` timestamp(3) NOT NULL COMMENT '加入时间',
  `last_active` timestamp(3) NULL DEFAULT NULL COMMENT '最后活跃时间',
  `mute_expire` timestamp(3) NULL DEFAULT NULL COMMENT '禁言到期时间',
  `card_name` varchar(100) DEFAULT NULL COMMENT '群名片',
  PRIMARY KEY (`member_id`),
  UNIQUE KEY `uk_group_user` (`group_id`,`user_id`),
  KEY `idx_user_groups` (`user_id`),
  KEY `idx_group_active` (`group_id`,`last_active` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='群组成员表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `im_group_contact`
--

LOCK TABLES `im_group_contact` WRITE;
/*!40000 ALTER TABLE `im_group_contact` DISABLE KEYS */;
/*!40000 ALTER TABLE `im_group_contact` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `im_group_info`
--

DROP TABLE IF EXISTS `im_group_info`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `im_group_info` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT 'id',
  `session_id` bigint NOT NULL COMMENT '会话id',
  `group_owner_id` bigint unsigned DEFAULT NULL COMMENT '群主id',
  `name` varchar(16) COLLATE utf8mb4_general_ci NOT NULL COMMENT '群名称',
  `avatar` varchar(256) COLLATE utf8mb4_general_ci NOT NULL COMMENT '群头像',
  `max_members` int unsigned DEFAULT '500' COMMENT '最大成员数',
  `member_count` int unsigned DEFAULT '0' COMMENT '当前成员数',
  `ext_json` json DEFAULT NULL COMMENT '额外信息（根据不同类型房间有不同存储的东西）',
  `join_mode` tinyint DEFAULT '1' COMMENT '1=自由加入 2=需审核 3=邀请加入',
  `msg_mode` tinyint DEFAULT '1' COMMENT '1=所有人可发言 2=仅管理员',
  `delete_status` int NOT NULL DEFAULT '1' COMMENT '逻辑删除(1-正常,0-删除)',
  `version` int unsigned DEFAULT '0' COMMENT '乐观锁版本',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '修改时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='群聊信息表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `im_group_info`
--

LOCK TABLES `im_group_info` WRITE;
/*!40000 ALTER TABLE `im_group_info` DISABLE KEYS */;
/*!40000 ALTER TABLE `im_group_info` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `im_message`
--

DROP TABLE IF EXISTS `im_message`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `im_message` (
  `session_id` bigint NOT NULL,
  `message_id` bigint NOT NULL COMMENT '会话内自增id',
  `msg_type` tinyint NOT NULL COMMENT '消息类型：1文本 2图片 3语音 4视频 5文件 6红包',
  `sender_id` bigint NOT NULL COMMENT '发送者uid',
  `send_time` timestamp(3) NOT NULL COMMENT '发送时间（毫秒精度）',
  `read_status` tinyint DEFAULT '0' COMMENT '0未读 1已读',
  `read_time` timestamp(3) NULL DEFAULT NULL COMMENT '首次阅读时间',
  PRIMARY KEY (`session_id`,`message_id`),
  KEY `idx_sender_time` (`sender_id`,`send_time`),
  KEY `idx_send_time` (`send_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='策略消息表'
/*!50100 PARTITION BY HASH ((`session_id` % 64))
PARTITIONS 64 */;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `im_message`
--

LOCK TABLES `im_message` WRITE;
/*!40000 ALTER TABLE `im_message` DISABLE KEYS */;
/*!40000 ALTER TABLE `im_message` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `im_message_media`
--

DROP TABLE IF EXISTS `im_message_media`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `im_message_media` (
  `message_id` bigint unsigned NOT NULL,
  `media_type` tinyint unsigned NOT NULL COMMENT '1=图片 2=语音 3=视频',
  `file_id` bigint unsigned NOT NULL COMMENT '文件唯一id',
  `file_size` int unsigned NOT NULL COMMENT '文件大小（字节）',
  `duration` int unsigned DEFAULT NULL COMMENT '音视频时长（毫秒）',
  `thumbnail_id` bigint unsigned DEFAULT NULL COMMENT '缩略图id',
  `width` smallint unsigned DEFAULT NULL COMMENT '视频/图片宽度',
  `height` smallint unsigned DEFAULT NULL COMMENT '视频/图片高度',
  `extra_info` json DEFAULT NULL COMMENT '扩展信息（如视频编码、采样率等）',
  PRIMARY KEY (`message_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='媒体消息表'
/*!50100 PARTITION BY HASH ((`message_id` % 64))
PARTITIONS 64 */;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `im_message_media`
--

LOCK TABLES `im_message_media` WRITE;
/*!40000 ALTER TABLE `im_message_media` DISABLE KEYS */;
/*!40000 ALTER TABLE `im_message_media` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `im_message_redpacket`
--

DROP TABLE IF EXISTS `im_message_redpacket`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `im_message_redpacket` (
  `message_id` bigint unsigned NOT NULL,
  `packet_id` bigint unsigned NOT NULL COMMENT '红包业务id',
  `packet_type` tinyint unsigned NOT NULL COMMENT '1=普通红包 2=拼手气红包',
  `total_amount` decimal(12,2) unsigned NOT NULL COMMENT '总金额',
  `total_count` smallint unsigned NOT NULL COMMENT '红包个数',
  `note` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '祝福语',
  `expire_time` timestamp NULL DEFAULT NULL COMMENT '过期时间',
  `receive_status` json DEFAULT NULL COMMENT '领取状态 {userid:amount, ...}',
  PRIMARY KEY (`message_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='红包消息表'
/*!50100 PARTITION BY HASH ((`message_id` % 64))
PARTITIONS 64 */;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `im_message_redpacket`
--

LOCK TABLES `im_message_redpacket` WRITE;
/*!40000 ALTER TABLE `im_message_redpacket` DISABLE KEYS */;
/*!40000 ALTER TABLE `im_message_redpacket` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `im_message_text`
--

DROP TABLE IF EXISTS `im_message_text`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `im_message_text` (
  `message_id` bigint unsigned NOT NULL COMMENT '关联消息id',
  `content` text COLLATE utf8mb4_general_ci NOT NULL COMMENT '消息内容（加密存储SHA-3）',
  `content_hash` char(32) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '内容哈希值（防篡改）',
  `at_user_ids` json DEFAULT NULL COMMENT '@的用户id列表',
  `format_version` tinyint DEFAULT '1' COMMENT '内容格式版本',
  PRIMARY KEY (`message_id`),
  FULLTEXT KEY `idx_content_fulltext` (`content`) /*!50100 WITH PARSER `ngram` */ 
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8 COMMENT='文本消息内容';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `im_message_text`
--

LOCK TABLES `im_message_text` WRITE;
/*!40000 ALTER TABLE `im_message_text` DISABLE KEYS */;
/*!40000 ALTER TABLE `im_message_text` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `im_session`
--

DROP TABLE IF EXISTS `im_session`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `im_session` (
  `session_id` bigint unsigned NOT NULL COMMENT '会话id（雪花算法）',
  `session_type` tinyint NOT NULL COMMENT '会话类型：1单聊 2群聊 3系统',
  `last_msg_id` bigint NOT NULL COMMENT '最后一条消息id',
  `last_msg_content` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '最后消息摘要',
  `last_msg_time` timestamp(3) NOT NULL COMMENT '最后消息时间（毫秒精度）',
  `version` int DEFAULT '0' COMMENT '乐观锁版本',
  `deleted_status` tinyint DEFAULT '1' COMMENT '软删除标记',
  `created_at` timestamp(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` timestamp(3) NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`session_id`),
  KEY `idx_last_time` (`last_msg_time` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='会话表'
/*!50100 PARTITION BY HASH ((`session_id` % 64))
PARTITIONS 64 */;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `im_session`
--

LOCK TABLES `im_session` WRITE;
/*!40000 ALTER TABLE `im_session` DISABLE KEYS */;
/*!40000 ALTER TABLE `im_session` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_info`
--

DROP TABLE IF EXISTS `user_info`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_info` (
  `user_id` bigint unsigned NOT NULL COMMENT '用户ID',
  `email` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '邮箱',
  `nick_name` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '昵称',
  `avatar` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '用户头像',
  `sex` int DEFAULT NULL COMMENT '性别 0:女 1:男',
  `password` varchar(32) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '密码',
  `personal_signature` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '个性签名',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态 1正常 0封号',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `last_login_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '最后登录时间',
  `area_name` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '地区',
  `area_code` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '地区编号',
  `ip_info` json DEFAULT NULL COMMENT 'ip信息',
  `last_off_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '最后离开时间',
  `remaining_name_change` int NOT NULL DEFAULT '3' COMMENT '剩余改名次数',
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `idx_key_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='用户信息';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_info`
--

LOCK TABLES `user_info` WRITE;
/*!40000 ALTER TABLE `user_info` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_info` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-07-20 23:19:10
