-- ============================================================
-- 智云实验设备预约管理系统 数据库初始化脚本
-- MySQL 8.0+  utf8mb4
-- 表数量：7 张（user / equipment_category / lab / equipment /
--         reservation / sys_log / sys_config）
-- 说明：设备真实感配图见 seed-equipment-photos.sql（AI 生成产品图），并需将 frontend/assets/equipment/*.png 部署到前端静态目录
-- ============================================================

CREATE DATABASE IF NOT EXISTS `lab_equipment`
    DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `lab_equipment`;

SET NAMES utf8mb4;

-- ------------------------------------------------------------
-- 1. 用户表（角色：ADMIN 管理员 / USER 普通用户）
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `user`;
CREATE TABLE `user` (
    `id`          BIGINT       NOT NULL AUTO_INCREMENT COMMENT '用户ID',
    `username`    VARCHAR(32)  NOT NULL COMMENT '用户名（登录账号）',
    `password`    VARCHAR(100) NOT NULL COMMENT '密码（BCrypt 加密）',
    `real_name`   VARCHAR(32)  NOT NULL COMMENT '姓名',
    `role`        VARCHAR(16)  NOT NULL DEFAULT 'USER' COMMENT '角色：ADMIN/USER',
    `email`       VARCHAR(64)  DEFAULT NULL COMMENT '邮箱',
    `phone`       VARCHAR(20)  DEFAULT NULL COMMENT '手机号',
    `status`      TINYINT      NOT NULL DEFAULT 1 COMMENT '状态：1启用 0禁用',
    `create_time` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_username` (`username`),
    KEY `idx_role` (`role`)
) ENGINE = InnoDB AUTO_INCREMENT = 100 COMMENT = '用户表';

-- ------------------------------------------------------------
-- 2. 设备类别表
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `equipment_category`;
CREATE TABLE `equipment_category` (
    `id`          BIGINT       NOT NULL AUTO_INCREMENT COMMENT '类别ID',
    `name`        VARCHAR(50)  NOT NULL COMMENT '类别名称',
    `description` VARCHAR(200) DEFAULT NULL COMMENT '类别描述',
    `create_time` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_name` (`name`)
) ENGINE = InnoDB AUTO_INCREMENT = 200 COMMENT = '设备类别表';

-- ------------------------------------------------------------
-- 3. 实验室表
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `lab`;
CREATE TABLE `lab` (
    `id`              BIGINT       NOT NULL AUTO_INCREMENT COMMENT '实验室ID',
    `name`            VARCHAR(50)  NOT NULL COMMENT '实验室名称',
    `location`        VARCHAR(100) DEFAULT NULL COMMENT '位置',
    `capacity`        INT          DEFAULT NULL COMMENT '可容纳人数',
    `open_start_time` TIME         DEFAULT NULL COMMENT '开放开始时间',
    `open_end_time`   TIME         DEFAULT NULL COMMENT '开放结束时间',
    `description`     VARCHAR(200) DEFAULT NULL COMMENT '描述',
    `create_time`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_name` (`name`)
) ENGINE = InnoDB AUTO_INCREMENT = 300 COMMENT = '实验室表';

-- ------------------------------------------------------------
-- 4. 实验设备表（image 存图片：SVG data URL / URL / base64）
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `equipment`;
CREATE TABLE `equipment` (
    `id`            BIGINT       NOT NULL AUTO_INCREMENT COMMENT '设备ID',
    `category_id`   BIGINT       NOT NULL COMMENT '所属类别ID',
    `lab_id`        BIGINT       NOT NULL COMMENT '所属实验室ID',
    `name`          VARCHAR(50)  NOT NULL COMMENT '设备名称',
    `model`         VARCHAR(50)  DEFAULT NULL COMMENT '设备型号',
    `code`          VARCHAR(50)  NOT NULL COMMENT '设备编号',
    `status`        VARCHAR(16)  NOT NULL DEFAULT 'IDLE' COMMENT '维护状态：REPAIR=维修停用；IDLE/USING为历史兼容，空闲/占用按预约实时统计',
    `stock`         INT          NOT NULL DEFAULT 1 COMMENT '设备总台数（同型号数量，可多人同时预约，单次预约占用1台）',
    `min_minutes`   INT          DEFAULT NULL COMMENT '本机最短预约时长（分钟），NULL=沿用全局配置',
    `max_days`      INT          DEFAULT NULL COMMENT '本机单次最长跨度（天，含首尾），NULL=沿用全局配置',
    `allow_cross_day` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '本机是否允许跨天预约：1=允许 0=禁止',
    `need_qualification` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '预约本机是否需要操作资质：1=需要 0=不需要',
    `purchase_date` DATE         DEFAULT NULL COMMENT '购入日期',
    `description`   VARCHAR(200) DEFAULT NULL COMMENT '设备描述',
    `image`         LONGTEXT     DEFAULT NULL COMMENT '设备图片(SVG data URL/URL/base64)',
    `version`       INT          NOT NULL DEFAULT 0 COMMENT '乐观锁版本号',
    `create_time`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_code` (`code`),
    KEY `idx_category` (`category_id`),
    KEY `idx_lab` (`lab_id`),
    KEY `idx_status` (`status`)
) ENGINE = InnoDB AUTO_INCREMENT = 400 COMMENT = '实验设备表';

-- ------------------------------------------------------------
-- 5. 设备预约表（return_* 为归还时拍照留痕字段）
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `reservation`;
CREATE TABLE `reservation` (
    `id`              BIGINT       NOT NULL AUTO_INCREMENT COMMENT '预约ID',
    `user_id`         BIGINT       NOT NULL COMMENT '预约人ID',
    `equipment_id`    BIGINT       NOT NULL COMMENT '预约设备ID',
    `lab_id`          BIGINT       DEFAULT NULL COMMENT '所属实验室ID（冗余）',
    `date`            DATE         NOT NULL COMMENT '开始日期',
    `end_date`        DATE         DEFAULT NULL COMMENT '结束日期（跨天预约的结束日；单日预约与 date 相同）',
    `start_time`      TIME         NOT NULL COMMENT '开始时间（开始日时刻）',
    `end_time`        TIME         NOT NULL COMMENT '结束时间（结束日时刻）',
    `purpose`         VARCHAR(200) DEFAULT NULL COMMENT '预约用途',
    `status`          VARCHAR(16)  NOT NULL DEFAULT 'PENDING' COMMENT '状态：PENDING/APPROVED/REJECTED/CANCELLED/COMPLETED/EXPIRED',
    `approve_comment` VARCHAR(200) DEFAULT NULL COMMENT '审批意见',
    `approver_id`     BIGINT       DEFAULT NULL COMMENT '审批人ID',
    `return_image`    LONGTEXT     DEFAULT NULL COMMENT '归还照片(归还时拍照上传)',
    `return_note`     VARCHAR(255) DEFAULT NULL COMMENT '归还备注',
    `returned_at`     DATETIME     DEFAULT NULL COMMENT '归还时间',
    `create_time`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    KEY `idx_user` (`user_id`),
    KEY `idx_equipment_date` (`equipment_id`, `date`),
    KEY `idx_status` (`status`),
    KEY `idx_date` (`date`)
) ENGINE = InnoDB AUTO_INCREMENT = 500 COMMENT = '设备预约表';

-- ------------------------------------------------------------
-- 6. 系统操作日志表
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `sys_log`;
CREATE TABLE `sys_log` (
    `id`          BIGINT       NOT NULL AUTO_INCREMENT COMMENT '日志ID',
    `user_id`     BIGINT       DEFAULT NULL COMMENT '操作用户ID',
    `username`    VARCHAR(32)  DEFAULT NULL COMMENT '操作用户名',
    `action`      VARCHAR(50)  NOT NULL COMMENT '操作类型',
    `detail`      VARCHAR(500) DEFAULT NULL COMMENT '操作详情',
    `ip`          VARCHAR(50)  DEFAULT NULL COMMENT '操作IP',
    `create_time` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
    PRIMARY KEY (`id`),
    KEY `idx_action` (`action`),
    KEY `idx_create_time` (`create_time`)
) ENGINE = InnoDB AUTO_INCREMENT = 600 COMMENT = '系统操作日志表';

-- ------------------------------------------------------------
-- 7. 系统配置表
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `sys_config`;
CREATE TABLE `sys_config` (
    `id`          BIGINT       NOT NULL AUTO_INCREMENT COMMENT '配置ID',
    `config_key`  VARCHAR(64)  NOT NULL COMMENT '配置键',
    `config_value` VARCHAR(200) NOT NULL COMMENT '配置值',
    `description` VARCHAR(200) DEFAULT NULL COMMENT '配置说明',
    `create_time` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_config_key` (`config_key`)
) ENGINE = InnoDB AUTO_INCREMENT = 700 COMMENT = '系统配置表';

-- ------------------------------------------------------------
-- 8. 公告表
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `announcement`;
CREATE TABLE `announcement` (
    `id`             BIGINT        NOT NULL AUTO_INCREMENT COMMENT '公告ID',
    `title`          VARCHAR(80)   NOT NULL COMMENT '标题',
    `content`        VARCHAR(1000) NOT NULL COMMENT '内容',
    `level`          VARCHAR(16)   NOT NULL DEFAULT 'NOTICE' COMMENT '级别：NOTICE=通知 WARNING=注意 URGENT=紧急',
    `status`         VARCHAR(16)   NOT NULL DEFAULT 'PUBLISHED' COMMENT '状态：PUBLISHED=已发布 CLOSED=已关闭',
    `publisher_id`   BIGINT        DEFAULT NULL COMMENT '发布人ID',
    `publisher_name` VARCHAR(32)   DEFAULT NULL COMMENT '发布人姓名',
    `create_time`    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '发布时间',
    `update_time`    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    KEY `idx_status` (`status`),
    KEY `idx_create_time` (`create_time`)
) ENGINE = InnoDB AUTO_INCREMENT = 800 COMMENT = '系统公告表';

-- ------------------------------------------------------------
-- 9. 设备维护窗口表（停机保养/校准排期）
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `maintenance_window`;
CREATE TABLE `maintenance_window` (
    `id`           BIGINT       NOT NULL AUTO_INCREMENT COMMENT '维护窗口ID',
    `equipment_id` BIGINT       NOT NULL COMMENT '设备ID',
    `start_time`   DATETIME     NOT NULL COMMENT '维护开始时间',
    `end_time`     DATETIME     NOT NULL COMMENT '维护结束时间',
    `reason_type`  VARCHAR(32)  NOT NULL DEFAULT 'ROUTINE' COMMENT '维护原因：ROUTINE=例行保养 CALIBRATION=设备校准 CONSUMABLE=耗材更换 SAFETY=安全检查 TROUBLESHOOT=故障排查 UPGRADE=软件升级',
    `remark`       VARCHAR(200) DEFAULT NULL COMMENT '原因说明',
    `status`       VARCHAR(16)  NOT NULL DEFAULT 'PLANNED' COMMENT '状态：PLANNED=计划 IN_PROGRESS=执行中 DONE=已完成',
    `creator_id`   BIGINT       DEFAULT NULL COMMENT '创建人ID',
    `create_time`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    KEY `idx_equipment_time` (`equipment_id`, `start_time`, `end_time`),
    KEY `idx_status` (`status`)
) ENGINE = InnoDB AUTO_INCREMENT = 900 COMMENT = '设备维护窗口表';

-- ------------------------------------------------------------
-- 10. 操作资质表（准入控制）
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `qualification`;
CREATE TABLE `qualification` (
    `id`            BIGINT       NOT NULL AUTO_INCREMENT COMMENT '资质ID',
    `equipment_id`  BIGINT       NOT NULL COMMENT '设备ID',
    `user_id`       BIGINT       NOT NULL COMMENT '持证人ID',
    `training_date` DATE         DEFAULT NULL COMMENT '培训日期',
    `valid_until`   DATE         DEFAULT NULL COMMENT '有效期至，NULL=长期有效',
    `remark`        VARCHAR(200) DEFAULT NULL COMMENT '备注（培训成绩等）',
    `status`        VARCHAR(16)  NOT NULL DEFAULT 'VALID' COMMENT '状态：VALID=有效 REVOKED=已撤销',
    `grantor_id`    BIGINT       DEFAULT NULL COMMENT '授予人ID',
    `create_time`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '授予时间',
    `update_time`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_equipment_user` (`equipment_id`, `user_id`),
    KEY `idx_user` (`user_id`),
    KEY `idx_status` (`status`)
) ENGINE = InnoDB AUTO_INCREMENT = 1000 COMMENT = '设备操作资质表';

-- ------------------------------------------------------------
-- 11. 报修工单表
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `repair_ticket`;
CREATE TABLE `repair_ticket` (
    `id`            BIGINT       NOT NULL AUTO_INCREMENT COMMENT '工单ID',
    `equipment_id`  BIGINT       NOT NULL COMMENT '设备ID',
    `reporter_id`   BIGINT       NOT NULL COMMENT '报修人ID',
    `reporter_name` VARCHAR(32)  DEFAULT NULL COMMENT '报修人姓名',
    `fault_desc`    VARCHAR(500) NOT NULL COMMENT '故障描述',
    `status`        VARCHAR(16)  NOT NULL DEFAULT 'PENDING' COMMENT '状态：PENDING=待处理 PROCESSING=处理中 DONE=已完成',
    `handler_id`    BIGINT       DEFAULT NULL COMMENT '处理人ID',
    `handle_remark` VARCHAR(500) DEFAULT NULL COMMENT '处理说明',
    `handle_time`   DATETIME     DEFAULT NULL COMMENT '处理时间',
    `create_time`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '报修时间',
    `update_time`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    KEY `idx_equipment` (`equipment_id`),
    KEY `idx_reporter` (`reporter_id`),
    KEY `idx_status` (`status`)
) ENGINE = InnoDB AUTO_INCREMENT = 1100 COMMENT = '设备报修工单表';

-- ============================================================
-- 演示数据（所有账号初始密码均为 123456）
-- ============================================================

-- 用户：admin 管理员，其余统一为普通用户（原教师/学生合并）
INSERT INTO `user` (`id`, `username`, `password`, `real_name`, `role`, `email`, `phone`, `status`) VALUES
(1, 'admin',    '$2b$12$.gZLCiGZ6l9DIsPkyJwSZeVzNWpLZ6XL03NVjbjwOfk/lV5egp40m', '系统管理员', 'ADMIN', 'admin@lab.edu.cn',    '13800000001', 1),
(2, 'teacher1', '$2b$12$.gZLCiGZ6l9DIsPkyJwSZeVzNWpLZ6XL03NVjbjwOfk/lV5egp40m', '张伟老师',   'USER',   'zhangwei@lab.edu.cn', '13800000002', 1),
(3, 'teacher2', '$2b$12$.gZLCiGZ6l9DIsPkyJwSZeVzNWpLZ6XL03NVjbjwOfk/lV5egp40m', '李娜老师',   'USER',   'lina@lab.edu.cn',      '13800000003', 1),
(4, 'student1', '$2b$12$.gZLCiGZ6l9DIsPkyJwSZeVzNWpLZ6XL03NVjbjwOfk/lV5egp40m', '王小明',     'USER',   'wangxm@lab.edu.cn',    '13800000004', 1),
(5, 'student2', '$2b$12$.gZLCiGZ6l9DIsPkyJwSZeVzNWpLZ6XL03NVjbjwOfk/lV5egp40m', '赵丽丽',     'USER',   'zhaoll@lab.edu.cn',    '13800000005', 1);

-- 设备类别
INSERT INTO `equipment_category` (`id`, `name`, `description`) VALUES
(1, '电子测量仪器', '示波器、万用表、信号发生器等'),
(2, '计算机设备',   '台式机、工作站、服务器等'),
(3, '机械加工设备', '车床、铣床、3D打印机等'),
(4, '化学实验设备', '分析天平、离心机、PH计等');

-- 实验室
INSERT INTO `lab` (`id`, `name`, `location`, `capacity`, `open_start_time`, `open_end_time`, `description`) VALUES
(1, '综合楼A101 电子实验室', '综合楼 A 区 101', 40, '08:00:00', '22:00:00', '电子电路实验、单片机实验'),
(2, '综合楼B203 计算机实验室', '综合楼 B 区 203', 60, '08:30:00', '21:30:00', '程序设计、软件工程课程实验'),
(3, '实验楼C305 机械实验室', '实验楼 C 区 305', 30, '09:00:00', '17:30:00', '机械加工与3D打印实践');

-- 实验设备（image 为空，配合 seed-equipment-photos.sql 与 frontend/assets/equipment/ 部署）
-- 预约规则列说明：min_minutes 最短时长(分钟)、max_days 最长跨度(天)、allow_cross_day 是否允许跨天、need_qualification 是否需要资质
INSERT INTO `equipment` (`id`, `category_id`, `lab_id`, `name`, `model`, `code`, `status`, `stock`, `min_minutes`, `max_days`, `allow_cross_day`, `need_qualification`, `purchase_date`, `description`, `version`) VALUES
(1,  1, 1, '数字示波器',        'DS1102Z',      'EQ-0001', 'IDLE',  5, 60,  14,   0, 0, '2024-03-01', '100MHz 双通道数字示波器', 0),
(2,  1, 1, '信号发生器',        'DG1022Z',      'EQ-0002', 'IDLE',  4, 30,  30,   1, 0, '2024-03-01', '双通道任意波形信号发生器', 0),
(3,  1, 1, '数字万用表',        'UT61E',        'EQ-0003', 'IDLE',  6, NULL, NULL, 1, 0, '2023-09-15', '高精度台式数字万用表', 0),
(4,  2, 2, '高性能工作站',      'ThinkStation P3', 'EQ-0004', 'IDLE', 2, 120, 7,   0, 0, '2024-05-20', '深度学习训练工作站', 0),
(5,  2, 2, '台式计算机',        'OptiPlex 7010', 'EQ-0005', 'IDLE', 8, 60,  30,   1, 0, '2023-11-01', '标准教学用台式机', 0),
(6,  2, 2, '网络服务器',        'PowerEdge R450', 'EQ-0006', 'IDLE', 1, 120, NULL, 0, 1, '2022-08-10', '机架式服务器（需系统管理资质）', 0),
(7,  3, 3, '桌面3D打印机',      'Ender-3 V3',   'EQ-0007', 'IDLE',  3, 60,  3,    1, 0, '2024-01-15', 'FDM 3D打印机', 0),
(8,  3, 3, '小型数控铣床',      'XK7124',       'EQ-0008', 'IDLE',  1, 120, 5,    0, 1, '2021-06-30', '小型数控铣床（需机床操作资质）', 0),
(9,  3, 3, '激光切割机',        'RE3-60W',      'EQ-0009', 'IDLE',  1, 60,  3,    0, 1, '2023-04-18', 'CO2 激光切割机（需激光安全资质）', 0),
(10, 4, 1, '电子分析天平',      'FA2004N',      'EQ-0010', 'IDLE',  3, 30,  NULL, 1, 0, '2022-12-05', '万分之一电子分析天平', 0),
(11, 4, 1, '台式离心机',        'TDZ5-WS',      'EQ-0011', 'IDLE',  4, 30,  7,    1, 1, '2023-07-22', '低速台式离心机（需生物安全资质）', 0),
(12, 1, 1, '逻辑分析仪',        'LA5016',       'EQ-0012', 'IDLE',  2, NULL, NULL, 1, 0, '2024-09-01', '16通道逻辑分析仪', 0);

-- 预约记录（日期基于当前时间相对生成，保证演示数据始终"新鲜"）
INSERT INTO `reservation` (`id`, `user_id`, `equipment_id`, `lab_id`, `date`, `start_time`, `end_time`, `purpose`, `status`, `approve_comment`, `approver_id`, `create_time`) VALUES
-- 过去几天：已完成（含归还信息）
(1,  4, 3, 1, DATE_SUB(CURDATE(), INTERVAL 5 DAY), '10:00:00', '11:30:00', '数字电路实验课测量', 'COMPLETED', '同意', 1, DATE_SUB(NOW(), INTERVAL 5 DAY)),
(2,  4, 5, 2, DATE_SUB(CURDATE(), INTERVAL 4 DAY), '14:00:00', '16:00:00', 'Java课程设计',        'COMPLETED', '同意', 1, DATE_SUB(NOW(), INTERVAL 4 DAY)),
(3,  5, 1, 1, DATE_SUB(CURDATE(), INTERVAL 3 DAY), '09:00:00', '11:00:00', '信号处理课程实验',    'COMPLETED', '同意', 1, DATE_SUB(NOW(), INTERVAL 3 DAY)),
-- 过去几天：被驳回 / 已取消 / 已过期
(4,  5, 7, 3, DATE_SUB(CURDATE(), INTERVAL 3 DAY), '15:00:00', '17:00:00', '3D打印毕设零件',      'REJECTED',  '设备维护，暂不开放', 1, DATE_SUB(NOW(), INTERVAL 3 DAY)),
(5,  4, 8, 3, DATE_SUB(CURDATE(), INTERVAL 2 DAY), '10:00:00', '12:00:00', '数控加工实训',        'CANCELLED', NULL, NULL, DATE_SUB(NOW(), INTERVAL 2 DAY)),
(6,  2, 4, 2, DATE_SUB(CURDATE(), INTERVAL 2 DAY), '09:00:00', '11:00:00', '机器学习课程演示',    'EXPIRED',   NULL, NULL, DATE_SUB(NOW(), INTERVAL 2 DAY)),
-- 今天：已开始（将触发自动完成）/ 待审批 / 已通过未开始
(7,  4, 1, 1, CURDATE(), '08:30:00', '10:00:00', '数字电路实验',          'APPROVED', '同意', 1, NOW() - INTERVAL 2 HOUR),
(8,  5, 4, 2, CURDATE(), '13:00:00', '15:00:00', '深度学习模型训练',      'APPROVED', '同意', 1, NOW() - INTERVAL 3 HOUR),
(9,  3, 9, 3, CURDATE(), '15:30:00', '17:00:00', '课程展示海报激光雕刻',  'PENDING',  NULL, NULL, NOW() - INTERVAL 1 HOUR),
(10, 2, 2, 1, CURDATE(), '16:00:00', '18:00:00', '电路实验波形测试',      'PENDING',  NULL, NULL, NOW() - INTERVAL 30 MINUTE),
-- 未来几天：已通过 / 待审批
(11, 4, 7, 3, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '10:00:00', '12:00:00', '毕设结构件打印',      'APPROVED', '同意', 1, NOW() - INTERVAL 1 DAY),
(12, 5, 10, 1, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '09:30:00', '10:30:00', '材料称量实验',        'APPROVED', '同意', 1, NOW() - INTERVAL 1 DAY),
(13, 3, 5, 2, DATE_ADD(CURDATE(), INTERVAL 2 DAY), '14:00:00', '16:00:00', '软件测试课程上机',    'PENDING',  NULL, NULL, NOW() - INTERVAL 12 HOUR),
(14, 4, 12, 1, DATE_ADD(CURDATE(), INTERVAL 2 DAY), '09:00:00', '10:30:00', '嵌入式课程设计',      'PENDING',  NULL, NULL, NOW() - INTERVAL 8 HOUR),
(15, 2, 11, 1, DATE_ADD(CURDATE(), INTERVAL 3 DAY), '13:30:00', '15:00:00', '生物样本离心处理',    'PENDING',  NULL, NULL, NOW() - INTERVAL 6 HOUR);

-- 历史单日预约回填 end_date = date；#15 作为跨天连续预约演示（跨度 10 天，含首尾）
UPDATE `reservation` SET `end_date` = `date` WHERE `end_date` IS NULL;
UPDATE `reservation` SET `end_date` = DATE_ADD(`date`, INTERVAL 9 DAY) WHERE `id` = 15;

-- 系统配置
INSERT INTO `sys_config` (`id`, `config_key`, `config_value`, `description`) VALUES
(1, 'reservation_max_days_ahead', '30',  '最多可提前预约的天数'),
(2, 'reservation_min_minutes',    '30',  '单次预约最短时长（分钟）'),
(3, 'reservation_max_duration_days', '30', '单次预约最大跨度（天），支持跨天连续预约'),
(4, 'auto_complete_enabled',      'true','预约到期自动完成开关'),
(5, 'remind_before_minutes',      '30',  '预约开始前提醒时间（分钟）');

-- 示例操作日志
INSERT INTO `sys_log` (`id`, `user_id`, `username`, `action`, `detail`, `ip`, `create_time`) VALUES
(1, 1, 'admin', '登录', '用户登录系统', '127.0.0.1', NOW() - INTERVAL 1 DAY),
(2, 1, 'admin', '审批预约', '通过预约#1', '127.0.0.1', DATE_SUB(NOW(), INTERVAL 4 DAY)),
(3, 1, 'admin', '新增设备', '新增设备：逻辑分析仪', '127.0.0.1', NOW() - INTERVAL 2 HOUR),
(4, 1, 'admin', '归还设备', '归还设备：预约#3', '127.0.0.1', DATE_SUB(NOW(), INTERVAL 3 DAY));

-- 提示：演示设备真实感配图请执行 db/seed-equipment-photos.sql（12 台 AI 生成产品图，浅灰底实验室摄影风格，纯本地离线）

-- ============================================================
-- 新增模块演示数据（公告 / 维护窗口 / 资质 / 报修工单）
-- ============================================================

-- 公告
INSERT INTO `announcement` (`id`, `title`, `content`, `level`, `status`, `publisher_id`, `publisher_name`, `create_time`) VALUES
(1, '国庆假期实验室开放安排', '10 月 1 日至 3 日实验室闭馆，期间所有预约自动取消；10 月 4 日起恢复正常开放（8:00-22:00）。请各位同学提前调整实验计划。', 'URGENT', 'PUBLISHED', 1, '系统管理员', NOW() - INTERVAL 6 HOUR),
(2, '新设备上线：逻辑分析仪 LA5016', '16 通道逻辑分析仪已完成安装调试，即日起开放预约。该设备位于电子技术实验室，共 2 台，支持 16 路信号同时采集。', 'NOTICE', 'PUBLISHED', 1, '系统管理员', NOW() - INTERVAL 1 DAY),
(3, '激光切割机与数控铣床需持证预约', '为保障操作安全，激光切割机（EQ-0009）与小型数控铣床（EQ-0008）自本周起启用资质准入：需先通过安全培训并取得资质后方可预约。', 'WARNING', 'PUBLISHED', 1, '系统管理员', NOW() - INTERVAL 2 DAY),
(4, '设备管理系统上线试运行', '本系统已完成部署，进入试运行阶段，欢迎大家反馈使用问题。', 'NOTICE', 'CLOSED', 1, '系统管理员', NOW() - INTERVAL 20 DAY);

-- 维护窗口（未来排期 + 一条已完成）
INSERT INTO `maintenance_window` (`id`, `equipment_id`, `start_time`, `end_time`, `reason_type`, `remark`, `status`, `creator_id`, `create_time`) VALUES
(1, 8,  CONCAT(DATE_ADD(CURDATE(), INTERVAL 2 DAY), ' 09:00:00'), CONCAT(DATE_ADD(CURDATE(), INTERVAL 2 DAY), ' 12:00:00'), 'CALIBRATION',   '年度精度校准，厂商工程师上门', 'PLANNED', 1, NOW() - INTERVAL 5 HOUR),
(2, 9,  CONCAT(DATE_ADD(CURDATE(), INTERVAL 5 DAY), ' 14:00:00'), CONCAT(DATE_ADD(CURDATE(), INTERVAL 5 DAY), ' 17:00:00'), 'ROUTINE',       '激光管例行保养，检查冷却水路', 'PLANNED', 1, NOW() - INTERVAL 3 HOUR),
(3, 2,  CONCAT(DATE_SUB(CURDATE(), INTERVAL 3 DAY), ' 09:00:00'), CONCAT(DATE_SUB(CURDATE(), INTERVAL 3 DAY), ' 11:00:00'), 'TROUBLESHOOT',  '输出波形失真，排查输出级电路', 'DONE',    1, NOW() - INTERVAL 4 DAY);

-- 操作资质
INSERT INTO `qualification` (`id`, `equipment_id`, `user_id`, `training_date`, `valid_until`, `remark`, `status`, `grantor_id`, `create_time`) VALUES
(1, 9,  4, DATE_SUB(CURDATE(), INTERVAL 30 DAY), DATE_ADD(CURDATE(), INTERVAL 335 DAY), '激光安全培训结业，成绩 92 分', 'VALID', 1, NOW() - INTERVAL 30 DAY),
(2, 8,  5, DATE_SUB(CURDATE(), INTERVAL 60 DAY), DATE_ADD(CURDATE(), INTERVAL 305 DAY), '数控机床操作培训通过',           'VALID', 1, NOW() - INTERVAL 60 DAY),
(3, 11, 4, DATE_SUB(CURDATE(), INTERVAL 15 DAY), DATE_ADD(CURDATE(), INTERVAL 350 DAY), '生物安全与离心机操作培训',       'VALID', 1, NOW() - INTERVAL 15 DAY),
(4, 9,  5, DATE_SUB(CURDATE(), INTERVAL 200 DAY), DATE_SUB(CURDATE(), INTERVAL 20 DAY), '培训已到期，待复审',             'REVOKED', 1, NOW() - INTERVAL 200 DAY);

-- 报修工单
INSERT INTO `repair_ticket` (`id`, `equipment_id`, `reporter_id`, `reporter_name`, `fault_desc`, `status`, `handler_id`, `handle_remark`, `handle_time`, `create_time`) VALUES
(1, 2, 4, '李小华', '信号发生器 CH2 输出波形失真，频率高于 1MHz 时明显。', 'PENDING', NULL, NULL, NULL, NOW() - INTERVAL 4 HOUR),
(2, 6, 5, '王思远', '服务器风扇异响，机箱温度偏高。', 'DONE', 1, '已更换散热风扇并清理除尘，温度恢复正常。', NOW() - INTERVAL 2 DAY, NOW() - INTERVAL 3 DAY),
(3, 5, 4, '李小华', '第 12 号台式机无法开机，电源指示灯不亮。', 'PROCESSING', 1, '已报修厂商，等待电源配件到货。', NOW() - INTERVAL 1 DAY, NOW() - INTERVAL 2 DAY);
