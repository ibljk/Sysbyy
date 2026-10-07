-- ============================================================
-- 智云实验设备预约管理系统 · 嵌入式数据库（H2, MODE=MySQL）演示数据
-- 本文件由 db/init.sql 自动转换生成
-- ============================================================

-- 演示数据（所有账号初始密码均为 123456）
-- ============================================================

-- 用户：admin 管理员，其余统一为普通用户（原教师/学生合并）
INSERT INTO user (id, username, password, real_name, role, email, phone, status) VALUES
(1, 'admin',    '$2b$12$.gZLCiGZ6l9DIsPkyJwSZeVzNWpLZ6XL03NVjbjwOfk/lV5egp40m', '系统管理员', 'ADMIN', 'admin@lab.edu.cn',    '13800000001', 1),
(2, 'teacher1', '$2b$12$.gZLCiGZ6l9DIsPkyJwSZeVzNWpLZ6XL03NVjbjwOfk/lV5egp40m', '张伟老师',   'USER',   'zhangwei@lab.edu.cn', '13800000002', 1),
(3, 'teacher2', '$2b$12$.gZLCiGZ6l9DIsPkyJwSZeVzNWpLZ6XL03NVjbjwOfk/lV5egp40m', '李娜老师',   'USER',   'lina@lab.edu.cn',      '13800000003', 1),
(4, 'student1', '$2b$12$.gZLCiGZ6l9DIsPkyJwSZeVzNWpLZ6XL03NVjbjwOfk/lV5egp40m', '王小明',     'USER',   'wangxm@lab.edu.cn',    '13800000004', 1),
(5, 'student2', '$2b$12$.gZLCiGZ6l9DIsPkyJwSZeVzNWpLZ6XL03NVjbjwOfk/lV5egp40m', '赵丽丽',     'USER',   'zhaoll@lab.edu.cn',    '13800000005', 1);

-- 设备类别
INSERT INTO equipment_category (id, name, description) VALUES
(1, '电子测量仪器', '示波器、万用表、信号发生器等'),
(2, '计算机设备',   '台式机、工作站、服务器等'),
(3, '机械加工设备', '车床、铣床、3D打印机等'),
(4, '化学实验设备', '分析天平、离心机、PH计等');

-- 实验室
INSERT INTO lab (id, name, location, capacity, open_start_time, open_end_time, description) VALUES
(1, '综合楼A101 电子实验室', '综合楼 A 区 101', 40, '08:00:00', '22:00:00', '电子电路实验、单片机实验'),
(2, '综合楼B203 计算机实验室', '综合楼 B 区 203', 60, '08:30:00', '21:30:00', '程序设计、软件工程课程实验'),
(3, '实验楼C305 机械实验室', '实验楼 C 区 305', 30, '09:00:00', '17:30:00', '机械加工与3D打印实践');

-- 实验设备（image 为空，配合 seed-equipment-photos.sql 与 frontend/assets/equipment/ 部署）
-- 预约规则列说明：min_minutes 最短时长(分钟)、max_days 最长跨度(天)、allow_cross_day 是否允许跨天、need_qualification 是否需要资质
INSERT INTO equipment (id, category_id, lab_id, name, model, code, status, stock, min_minutes, max_days, allow_cross_day, need_qualification, purchase_date, description, version) VALUES
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
INSERT INTO reservation (id, user_id, equipment_id, lab_id, date, start_time, end_time, purpose, status, approve_comment, approver_id, create_time) VALUES
-- 过去几天：已完成（含归还信息）
(1,  4, 3, 1, DATEADD('DAY', -5, CURRENT_DATE), '10:00:00', '11:30:00', '数字电路实验课测量', 'COMPLETED', '同意', 1, DATEADD('DAY', -5, CURRENT_TIMESTAMP)),
(2,  4, 5, 2, DATEADD('DAY', -4, CURRENT_DATE), '14:00:00', '16:00:00', 'Java课程设计',        'COMPLETED', '同意', 1, DATEADD('DAY', -4, CURRENT_TIMESTAMP)),
(3,  5, 1, 1, DATEADD('DAY', -3, CURRENT_DATE), '09:00:00', '11:00:00', '信号处理课程实验',    'COMPLETED', '同意', 1, DATEADD('DAY', -3, CURRENT_TIMESTAMP)),
-- 过去几天：被驳回 / 已取消 / 已过期
(4,  5, 7, 3, DATEADD('DAY', -3, CURRENT_DATE), '15:00:00', '17:00:00', '3D打印毕设零件',      'REJECTED',  '设备维护，暂不开放', 1, DATEADD('DAY', -3, CURRENT_TIMESTAMP)),
(5,  4, 8, 3, DATEADD('DAY', -2, CURRENT_DATE), '10:00:00', '12:00:00', '数控加工实训',        'CANCELLED', NULL, NULL, DATEADD('DAY', -2, CURRENT_TIMESTAMP)),
(6,  2, 4, 2, DATEADD('DAY', -2, CURRENT_DATE), '09:00:00', '11:00:00', '机器学习课程演示',    'EXPIRED',   NULL, NULL, DATEADD('DAY', -2, CURRENT_TIMESTAMP)),
-- 今天：已开始（将触发自动完成）/ 待审批 / 已通过未开始
(7,  4, 1, 1, CURRENT_DATE, '08:30:00', '10:00:00', '数字电路实验',          'APPROVED', '同意', 1, DATEADD('HOUR', -2, CURRENT_TIMESTAMP)),
(8,  5, 4, 2, CURRENT_DATE, '13:00:00', '15:00:00', '深度学习模型训练',      'APPROVED', '同意', 1, DATEADD('HOUR', -3, CURRENT_TIMESTAMP)),
(9,  3, 9, 3, CURRENT_DATE, '15:30:00', '17:00:00', '课程展示海报激光雕刻',  'PENDING',  NULL, NULL, DATEADD('HOUR', -1, CURRENT_TIMESTAMP)),
(10, 2, 2, 1, CURRENT_DATE, '16:00:00', '18:00:00', '电路实验波形测试',      'PENDING',  NULL, NULL, DATEADD('MINUTE', -30, CURRENT_TIMESTAMP)),
-- 未来几天：已通过 / 待审批
(11, 4, 7, 3, DATEADD('DAY', 1, CURRENT_DATE), '10:00:00', '12:00:00', '毕设结构件打印',      'APPROVED', '同意', 1, DATEADD('DAY', -1, CURRENT_TIMESTAMP)),
(12, 5, 10, 1, DATEADD('DAY', 1, CURRENT_DATE), '09:30:00', '10:30:00', '材料称量实验',        'APPROVED', '同意', 1, DATEADD('DAY', -1, CURRENT_TIMESTAMP)),
(13, 3, 5, 2, DATEADD('DAY', 2, CURRENT_DATE), '14:00:00', '16:00:00', '软件测试课程上机',    'PENDING',  NULL, NULL, DATEADD('HOUR', -12, CURRENT_TIMESTAMP)),
(14, 4, 12, 1, DATEADD('DAY', 2, CURRENT_DATE), '09:00:00', '10:30:00', '嵌入式课程设计',      'PENDING',  NULL, NULL, DATEADD('HOUR', -8, CURRENT_TIMESTAMP)),
(15, 2, 11, 1, DATEADD('DAY', 3, CURRENT_DATE), '13:30:00', '15:00:00', '生物样本离心处理',    'PENDING',  NULL, NULL, DATEADD('HOUR', -6, CURRENT_TIMESTAMP));

-- 历史单日预约回填 end_date = date；#15 作为跨天连续预约演示（跨度 10 天，含首尾）
UPDATE reservation SET end_date = date WHERE end_date IS NULL;
UPDATE reservation SET end_date = DATEADD('DAY', 9, date) WHERE id = 15;

-- 系统配置
INSERT INTO sys_config (id, config_key, config_value, description) VALUES
(1, 'reservation_max_days_ahead', '30',  '最多可提前预约的天数'),
(2, 'reservation_min_minutes',    '30',  '单次预约最短时长（分钟）'),
(3, 'reservation_max_duration_days', '30', '单次预约最大跨度（天），支持跨天连续预约'),
(4, 'auto_complete_enabled',      'true','预约到期自动完成开关'),
(5, 'remind_before_minutes',      '30',  '预约开始前提醒时间（分钟）');

-- 示例操作日志
INSERT INTO sys_log (id, user_id, username, action, detail, ip, create_time) VALUES
(1, 1, 'admin', '登录', '用户登录系统', '127.0.0.1', DATEADD('DAY', -1, CURRENT_TIMESTAMP)),
(2, 1, 'admin', '审批预约', '通过预约#1', '127.0.0.1', DATEADD('DAY', -4, CURRENT_TIMESTAMP)),
(3, 1, 'admin', '新增设备', '新增设备：逻辑分析仪', '127.0.0.1', DATEADD('HOUR', -2, CURRENT_TIMESTAMP)),
(4, 1, 'admin', '归还设备', '归还设备：预约#3', '127.0.0.1', DATEADD('DAY', -3, CURRENT_TIMESTAMP));

-- 提示：演示设备真实感配图请执行 db/seed-equipment-photos.sql（12 台 AI 生成产品图，浅灰底实验室摄影风格，纯本地离线）

-- ============================================================
-- 新增模块演示数据（公告 / 维护窗口 / 资质 / 报修工单）
-- ============================================================

-- 公告
INSERT INTO announcement (id, title, content, level, status, publisher_id, publisher_name, create_time) VALUES
(1, '国庆假期实验室开放安排', '10 月 1 日至 3 日实验室闭馆，期间所有预约自动取消；10 月 4 日起恢复正常开放（8:00-22:00）。请各位同学提前调整实验计划。', 'URGENT', 'PUBLISHED', 1, '系统管理员', DATEADD('HOUR', -6, CURRENT_TIMESTAMP)),
(2, '新设备上线：逻辑分析仪 LA5016', '16 通道逻辑分析仪已完成安装调试，即日起开放预约。该设备位于电子技术实验室，共 2 台，支持 16 路信号同时采集。', 'NOTICE', 'PUBLISHED', 1, '系统管理员', DATEADD('DAY', -1, CURRENT_TIMESTAMP)),
(3, '激光切割机与数控铣床需持证预约', '为保障操作安全，激光切割机（EQ-0009）与小型数控铣床（EQ-0008）自本周起启用资质准入：需先通过安全培训并取得资质后方可预约。', 'WARNING', 'PUBLISHED', 1, '系统管理员', DATEADD('DAY', -2, CURRENT_TIMESTAMP)),
(4, '设备管理系统上线试运行', '本系统已完成部署，进入试运行阶段，欢迎大家反馈使用问题。', 'NOTICE', 'CLOSED', 1, '系统管理员', DATEADD('DAY', -20, CURRENT_TIMESTAMP));

-- 维护窗口（未来排期 + 一条已完成）
INSERT INTO maintenance_window (id, equipment_id, start_time, end_time, reason_type, remark, status, creator_id, create_time) VALUES
(1, 8,  CONCAT(DATEADD('DAY', 2, CURRENT_DATE), ' 09:00:00'), CONCAT(DATEADD('DAY', 2, CURRENT_DATE), ' 12:00:00'), 'CALIBRATION',   '年度精度校准，厂商工程师上门', 'PLANNED', 1, DATEADD('HOUR', -5, CURRENT_TIMESTAMP)),
(2, 9,  CONCAT(DATEADD('DAY', 5, CURRENT_DATE), ' 14:00:00'), CONCAT(DATEADD('DAY', 5, CURRENT_DATE), ' 17:00:00'), 'ROUTINE',       '激光管例行保养，检查冷却水路', 'PLANNED', 1, DATEADD('HOUR', -3, CURRENT_TIMESTAMP)),
(3, 2,  CONCAT(DATEADD('DAY', -3, CURRENT_DATE), ' 09:00:00'), CONCAT(DATEADD('DAY', -3, CURRENT_DATE), ' 11:00:00'), 'TROUBLESHOOT',  '输出波形失真，排查输出级电路', 'DONE',    1, DATEADD('DAY', -4, CURRENT_TIMESTAMP));

-- 操作资质
INSERT INTO qualification (id, equipment_id, user_id, training_date, valid_until, remark, status, grantor_id, create_time) VALUES
(1, 9,  4, DATEADD('DAY', -30, CURRENT_DATE), DATEADD('DAY', 335, CURRENT_DATE), '激光安全培训结业，成绩 92 分', 'VALID', 1, DATEADD('DAY', -30, CURRENT_TIMESTAMP)),
(2, 8,  5, DATEADD('DAY', -60, CURRENT_DATE), DATEADD('DAY', 305, CURRENT_DATE), '数控机床操作培训通过',           'VALID', 1, DATEADD('DAY', -60, CURRENT_TIMESTAMP)),
(3, 11, 4, DATEADD('DAY', -15, CURRENT_DATE), DATEADD('DAY', 350, CURRENT_DATE), '生物安全与离心机操作培训',       'VALID', 1, DATEADD('DAY', -15, CURRENT_TIMESTAMP)),
(4, 9,  5, DATEADD('DAY', -200, CURRENT_DATE), DATEADD('DAY', -20, CURRENT_DATE), '培训已到期，待复审',             'REVOKED', 1, DATEADD('DAY', -200, CURRENT_TIMESTAMP));

-- 报修工单
INSERT INTO repair_ticket (id, equipment_id, reporter_id, reporter_name, fault_desc, status, handler_id, handle_remark, handle_time, create_time) VALUES
(1, 2, 4, '李小华', '信号发生器 CH2 输出波形失真，频率高于 1MHz 时明显。', 'PENDING', NULL, NULL, NULL, DATEADD('HOUR', -4, CURRENT_TIMESTAMP)),
(2, 6, 5, '王思远', '服务器风扇异响，机箱温度偏高。', 'DONE', 1, '已更换散热风扇并清理除尘，温度恢复正常。', DATEADD('DAY', -2, CURRENT_TIMESTAMP), DATEADD('DAY', -3, CURRENT_TIMESTAMP)),
(3, 5, 4, '李小华', '第 12 号台式机无法开机，电源指示灯不亮。', 'PROCESSING', 1, '已报修厂商，等待电源配件到货。', DATEADD('DAY', -1, CURRENT_TIMESTAMP), DATEADD('DAY', -2, CURRENT_TIMESTAMP));


-- 设备配图（image 字段存前端相对路径，随 jar 内的 static/assets/equipment 提供）
UPDATE equipment SET image = '/assets/equipment/EQ-0001.png' WHERE code = 'EQ-0001';
UPDATE equipment SET image = '/assets/equipment/EQ-0002.png' WHERE code = 'EQ-0002';
UPDATE equipment SET image = '/assets/equipment/EQ-0003.png' WHERE code = 'EQ-0003';
UPDATE equipment SET image = '/assets/equipment/EQ-0004.png' WHERE code = 'EQ-0004';
UPDATE equipment SET image = '/assets/equipment/EQ-0005.png' WHERE code = 'EQ-0005';
UPDATE equipment SET image = '/assets/equipment/EQ-0006.png' WHERE code = 'EQ-0006';
UPDATE equipment SET image = '/assets/equipment/EQ-0007.png' WHERE code = 'EQ-0007';
UPDATE equipment SET image = '/assets/equipment/EQ-0008.png' WHERE code = 'EQ-0008';
UPDATE equipment SET image = '/assets/equipment/EQ-0009.png' WHERE code = 'EQ-0009';
UPDATE equipment SET image = '/assets/equipment/EQ-0010.png' WHERE code = 'EQ-0010';
UPDATE equipment SET image = '/assets/equipment/EQ-0011.png' WHERE code = 'EQ-0011';
UPDATE equipment SET image = '/assets/equipment/EQ-0012.png' WHERE code = 'EQ-0012';
