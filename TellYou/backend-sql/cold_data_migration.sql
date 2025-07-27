-- 冷数据迁移相关表结构更新
-- 执行时间：2024-01-01

-- 1. 为im_message表添加冷数据迁移相关字段
ALTER TABLE `im_message` 
ADD COLUMN `server_message_id` VARCHAR(64) NULL COMMENT '服务端消息ID（用于关联MongoDB）' AFTER `message_id`,
ADD COLUMN `extra_data` JSON NULL COMMENT '扩展字段（JSON格式）' AFTER `read_time`,
ADD COLUMN `source_type` TINYINT DEFAULT 1 COMMENT '消息来源：1-用户发送 2-系统消息' AFTER `extra_data`,
ADD COLUMN `created_time` BIGINT NULL COMMENT '创建时间戳' AFTER `source_type`,
ADD COLUMN `updated_time` BIGINT NULL COMMENT '更新时间戳' AFTER `created_time`,
ADD INDEX `idx_server_message_id` (`server_message_id`),
ADD INDEX `idx_created_time` (`created_time`);

-- 2. 创建冷数据迁移日志表
CREATE TABLE `im_migration_log` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `migration_type` varchar(32) NOT NULL COMMENT '迁移类型：scheduled/force/processing',
  `batch_id` varchar(64) NOT NULL COMMENT '批次ID',
  `start_time` bigint NOT NULL COMMENT '开始时间戳',
  `end_time` bigint NULL COMMENT '结束时间戳',
  `total_count` int DEFAULT 0 COMMENT '总数量',
  `success_count` int DEFAULT 0 COMMENT '成功数量',
  `fail_count` int DEFAULT 0 COMMENT '失败数量',
  `status` tinyint DEFAULT 0 COMMENT '状态：0-进行中 1-成功 2-失败',
  `error_message` text NULL COMMENT '错误信息',
  `created_time` bigint NOT NULL COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_batch_id` (`batch_id`),
  KEY `idx_migration_type` (`migration_type`),
  KEY `idx_start_time` (`start_time`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='冷数据迁移日志表';

-- 3. 创建冷数据迁移统计表
CREATE TABLE `im_migration_stats` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `stat_date` date NOT NULL COMMENT '统计日期',
  `migration_type` varchar(32) NOT NULL COMMENT '迁移类型',
  `total_messages` bigint DEFAULT 0 COMMENT '总消息数',
  `migrated_messages` bigint DEFAULT 0 COMMENT '已迁移消息数',
  `pending_messages` bigint DEFAULT 0 COMMENT '待迁移消息数',
  `mysql_messages` bigint DEFAULT 0 COMMENT 'MySQL消息数',
  `created_time` bigint NOT NULL COMMENT '创建时间',
  `updated_time` bigint NOT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_date_type` (`stat_date`, `migration_type`),
  KEY `idx_stat_date` (`stat_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='冷数据迁移统计表';

-- 4. 创建存储过程：清理过期迁移日志
DELIMITER $$
CREATE PROCEDURE `cleanup_migration_logs`()
BEGIN
    -- 删除30天前的迁移日志
    DELETE FROM `im_migration_log` 
    WHERE `start_time` < UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL 30 DAY)) * 1000;
    
    -- 删除90天前的迁移统计
    DELETE FROM `im_migration_stats` 
    WHERE `stat_date` < DATE_SUB(CURDATE(), INTERVAL 90 DAY);
    
    SELECT ROW_COUNT() as deleted_count;
END$$
DELIMITER ;

-- 5. 创建事件：自动清理过期数据
CREATE EVENT `cleanup_migration_data_event`
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP
DO
    CALL cleanup_migration_logs();

-- 6. 创建视图：迁移状态概览
CREATE VIEW `v_migration_overview` AS
SELECT 
    DATE(FROM_UNIXTIME(created_time/1000)) as stat_date,
    COUNT(*) as total_messages,
    SUM(CASE WHEN server_message_id IS NOT NULL THEN 1 ELSE 0 END) as migrated_messages,
    SUM(CASE WHEN server_message_id IS NULL THEN 1 ELSE 0 END) as pending_messages
FROM `im_message`
WHERE created_time >= UNIX_TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 7 DAY)) * 1000
GROUP BY DATE(FROM_UNIXTIME(created_time/1000))
ORDER BY stat_date DESC;

-- 7. 创建索引优化查询性能
CREATE INDEX `idx_session_created_time` ON `im_message` (`session_id`, `created_time`);
CREATE INDEX `idx_sender_created_time` ON `im_message` (`sender_id`, `created_time`);
CREATE INDEX `idx_read_status_created_time` ON `im_message` (`read_status`, `created_time`);

-- 8. 插入初始统计数据
INSERT INTO `im_migration_stats` (`stat_date`, `migration_type`, `total_messages`, `migrated_messages`, `pending_messages`, `mysql_messages`, `created_time`, `updated_time`)
SELECT 
    CURDATE() as stat_date,
    'initial' as migration_type,
    COUNT(*) as total_messages,
    SUM(CASE WHEN server_message_id IS NOT NULL THEN 1 ELSE 0 END) as migrated_messages,
    SUM(CASE WHEN server_message_id IS NULL THEN 1 ELSE 0 END) as pending_messages,
    COUNT(*) as mysql_messages,
    UNIX_TIMESTAMP() * 1000 as created_time,
    UNIX_TIMESTAMP() * 1000 as updated_time
FROM `im_message`
ON DUPLICATE KEY UPDATE
    `total_messages` = VALUES(`total_messages`),
    `migrated_messages` = VALUES(`migrated_messages`),
    `pending_messages` = VALUES(`pending_messages`),
    `mysql_messages` = VALUES(`mysql_messages`),
    `updated_time` = VALUES(`updated_time`);

-- 9. 创建触发器：更新迁移统计
DELIMITER $$
CREATE TRIGGER `tr_migration_stats_update` 
AFTER INSERT ON `im_message`
FOR EACH ROW
BEGIN
    INSERT INTO `im_migration_stats` (`stat_date`, `migration_type`, `total_messages`, `migrated_messages`, `pending_messages`, `mysql_messages`, `created_time`, `updated_time`)
    VALUES (
        CURDATE(),
        'auto_update',
        1,
        CASE WHEN NEW.server_message_id IS NOT NULL THEN 1 ELSE 0 END,
        CASE WHEN NEW.server_message_id IS NULL THEN 1 ELSE 0 END,
        1,
        UNIX_TIMESTAMP() * 1000,
        UNIX_TIMESTAMP() * 1000
    )
    ON DUPLICATE KEY UPDATE
        `total_messages` = `total_messages` + 1,
        `migrated_messages` = `migrated_messages` + CASE WHEN NEW.server_message_id IS NOT NULL THEN 1 ELSE 0 END,
        `pending_messages` = `pending_messages` + CASE WHEN NEW.server_message_id IS NULL THEN 1 ELSE 0 END,
        `mysql_messages` = `mysql_messages` + 1,
        `updated_time` = UNIX_TIMESTAMP() * 1000;
END$$
DELIMITER ;

-- 10. 创建函数：获取迁移进度
DELIMITER $$
CREATE FUNCTION `get_migration_progress`(p_date DATE)
RETURNS DECIMAL(5,2)
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE v_total BIGINT DEFAULT 0;
    DECLARE v_migrated BIGINT DEFAULT 0;
    DECLARE v_progress DECIMAL(5,2) DEFAULT 0.00;
    
    SELECT 
        COALESCE(SUM(total_messages), 0),
        COALESCE(SUM(migrated_messages), 0)
    INTO v_total, v_migrated
    FROM `im_migration_stats`
    WHERE `stat_date` = p_date;
    
    IF v_total > 0 THEN
        SET v_progress = (v_migrated / v_total) * 100;
    END IF;
    
    RETURN v_progress;
END$$
DELIMITER ;

-- 执行完成提示
SELECT '冷数据迁移表结构更新完成' as message; 