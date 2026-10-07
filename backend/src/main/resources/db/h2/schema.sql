-- ============================================================
-- 智云实验设备预约管理系统 · 嵌入式数据库（H2, MODE=MySQL）建表脚本
-- 本文件由 db/init.sql 自动转换生成，供「单端口免配置运行」模式使用
-- 转换要点：去 MySQL 专有语法 / 索引独立建 / 自增序列重置
-- ============================================================

DROP TABLE IF EXISTS user;
CREATE TABLE user (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    username    VARCHAR(32)  NOT NULL,
    password    VARCHAR(100) NOT NULL,
    real_name   VARCHAR(32)  NOT NULL,
    role        VARCHAR(16)  NOT NULL DEFAULT 'USER',
    email       VARCHAR(64)  DEFAULT NULL,
    phone       VARCHAR(20)  DEFAULT NULL,
    status      TINYINT      NOT NULL DEFAULT 1,
    create_time DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT user_uk_username UNIQUE (username)
);
CREATE INDEX user_idx_role ON user(role);
ALTER TABLE user ALTER COLUMN id RESTART WITH 100;

DROP TABLE IF EXISTS equipment_category;
CREATE TABLE equipment_category (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    name        VARCHAR(50)  NOT NULL,
    description VARCHAR(200) DEFAULT NULL,
    create_time DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT equipment_category_uk_name UNIQUE (name)
);
ALTER TABLE equipment_category ALTER COLUMN id RESTART WITH 200;

DROP TABLE IF EXISTS lab;
CREATE TABLE lab (
    id              BIGINT       NOT NULL AUTO_INCREMENT,
    name            VARCHAR(50)  NOT NULL,
    location        VARCHAR(100) DEFAULT NULL,
    capacity        INT          DEFAULT NULL,
    open_start_time TIME         DEFAULT NULL,
    open_end_time   TIME         DEFAULT NULL,
    description     VARCHAR(200) DEFAULT NULL,
    create_time     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT lab_uk_name UNIQUE (name)
);
ALTER TABLE lab ALTER COLUMN id RESTART WITH 300;

DROP TABLE IF EXISTS equipment;
CREATE TABLE equipment (
    id            BIGINT       NOT NULL AUTO_INCREMENT,
    category_id   BIGINT       NOT NULL,
    lab_id        BIGINT       NOT NULL,
    name          VARCHAR(50)  NOT NULL,
    model         VARCHAR(50)  DEFAULT NULL,
    code          VARCHAR(50)  NOT NULL,
    status        VARCHAR(16)  NOT NULL DEFAULT 'IDLE',
    stock         INT          NOT NULL DEFAULT 1,
    min_minutes   INT          DEFAULT NULL,
    max_days      INT          DEFAULT NULL,
    allow_cross_day TINYINT NOT NULL DEFAULT 1,
    need_qualification TINYINT NOT NULL DEFAULT 0,
    purchase_date DATE         DEFAULT NULL,
    description   VARCHAR(200) DEFAULT NULL,
    image         VARCHAR     DEFAULT NULL,
    version       INT          NOT NULL DEFAULT 0,
    create_time   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT equipment_uk_code UNIQUE (code)
);
CREATE INDEX equipment_idx_category ON equipment(category_id);
CREATE INDEX equipment_idx_lab ON equipment(lab_id);
CREATE INDEX equipment_idx_status ON equipment(status);
ALTER TABLE equipment ALTER COLUMN id RESTART WITH 400;

DROP TABLE IF EXISTS reservation;
CREATE TABLE reservation (
    id              BIGINT       NOT NULL AUTO_INCREMENT,
    user_id         BIGINT       NOT NULL,
    equipment_id    BIGINT       NOT NULL,
    lab_id          BIGINT       DEFAULT NULL,
    date            DATE         NOT NULL,
    end_date        DATE         DEFAULT NULL,
    start_time      TIME         NOT NULL,
    end_time        TIME         NOT NULL,
    purpose         VARCHAR(200) DEFAULT NULL,
    status          VARCHAR(16)  NOT NULL DEFAULT 'PENDING',
    approve_comment VARCHAR(200) DEFAULT NULL,
    approver_id     BIGINT       DEFAULT NULL,
    return_image    VARCHAR     DEFAULT NULL,
    return_note     VARCHAR(255) DEFAULT NULL,
    returned_at     DATETIME     DEFAULT NULL,
    create_time     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);
CREATE INDEX reservation_idx_user ON reservation(user_id);
CREATE INDEX reservation_idx_equipment_date ON reservation(equipment_id, date);
CREATE INDEX reservation_idx_status ON reservation(status);
CREATE INDEX reservation_idx_date ON reservation(date);
ALTER TABLE reservation ALTER COLUMN id RESTART WITH 500;

DROP TABLE IF EXISTS sys_log;
CREATE TABLE sys_log (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    user_id     BIGINT       DEFAULT NULL,
    username    VARCHAR(32)  DEFAULT NULL,
    action      VARCHAR(50)  NOT NULL,
    detail      VARCHAR(500) DEFAULT NULL,
    ip          VARCHAR(50)  DEFAULT NULL,
    create_time DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);
CREATE INDEX sys_log_idx_action ON sys_log(action);
CREATE INDEX sys_log_idx_create_time ON sys_log(create_time);
ALTER TABLE sys_log ALTER COLUMN id RESTART WITH 600;

DROP TABLE IF EXISTS sys_config;
CREATE TABLE sys_config (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    config_key  VARCHAR(64)  NOT NULL,
    config_value VARCHAR(200) NOT NULL,
    description VARCHAR(200) DEFAULT NULL,
    create_time DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT sys_config_uk_config_key UNIQUE (config_key)
);
ALTER TABLE sys_config ALTER COLUMN id RESTART WITH 700;

DROP TABLE IF EXISTS announcement;
CREATE TABLE announcement (
    id             BIGINT        NOT NULL AUTO_INCREMENT,
    title          VARCHAR(80)   NOT NULL,
    content        VARCHAR(1000) NOT NULL,
    level          VARCHAR(16)   NOT NULL DEFAULT 'NOTICE',
    status         VARCHAR(16)   NOT NULL DEFAULT 'PUBLISHED',
    publisher_id   BIGINT        DEFAULT NULL,
    publisher_name VARCHAR(32)   DEFAULT NULL,
    create_time    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);
CREATE INDEX announcement_idx_status ON announcement(status);
CREATE INDEX announcement_idx_create_time ON announcement(create_time);
ALTER TABLE announcement ALTER COLUMN id RESTART WITH 800;

DROP TABLE IF EXISTS maintenance_window;
CREATE TABLE maintenance_window (
    id           BIGINT       NOT NULL AUTO_INCREMENT,
    equipment_id BIGINT       NOT NULL,
    start_time   DATETIME     NOT NULL,
    end_time     DATETIME     NOT NULL,
    reason_type  VARCHAR(32)  NOT NULL DEFAULT 'ROUTINE',
    remark       VARCHAR(200) DEFAULT NULL,
    status       VARCHAR(16)  NOT NULL DEFAULT 'PLANNED',
    creator_id   BIGINT       DEFAULT NULL,
    create_time  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);
CREATE INDEX maintenance_window_idx_equipment_time ON maintenance_window(equipment_id, start_time, end_time);
CREATE INDEX maintenance_window_idx_status ON maintenance_window(status);
ALTER TABLE maintenance_window ALTER COLUMN id RESTART WITH 900;

DROP TABLE IF EXISTS qualification;
CREATE TABLE qualification (
    id            BIGINT       NOT NULL AUTO_INCREMENT,
    equipment_id  BIGINT       NOT NULL,
    user_id       BIGINT       NOT NULL,
    training_date DATE         DEFAULT NULL,
    valid_until   DATE         DEFAULT NULL,
    remark        VARCHAR(200) DEFAULT NULL,
    status        VARCHAR(16)  NOT NULL DEFAULT 'VALID',
    grantor_id    BIGINT       DEFAULT NULL,
    create_time   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT qualification_uk_equipment_user UNIQUE (equipment_id, user_id)
);
CREATE INDEX qualification_idx_user ON qualification(user_id);
CREATE INDEX qualification_idx_status ON qualification(status);
ALTER TABLE qualification ALTER COLUMN id RESTART WITH 1000;

DROP TABLE IF EXISTS repair_ticket;
CREATE TABLE repair_ticket (
    id            BIGINT       NOT NULL AUTO_INCREMENT,
    equipment_id  BIGINT       NOT NULL,
    reporter_id   BIGINT       NOT NULL,
    reporter_name VARCHAR(32)  DEFAULT NULL,
    fault_desc    VARCHAR(500) NOT NULL,
    status        VARCHAR(16)  NOT NULL DEFAULT 'PENDING',
    handler_id    BIGINT       DEFAULT NULL,
    handle_remark VARCHAR(500) DEFAULT NULL,
    handle_time   DATETIME     DEFAULT NULL,
    create_time   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);
CREATE INDEX repair_ticket_idx_equipment ON repair_ticket(equipment_id);
CREATE INDEX repair_ticket_idx_reporter ON repair_ticket(reporter_id);
CREATE INDEX repair_ticket_idx_status ON repair_ticket(status);
ALTER TABLE repair_ticket ALTER COLUMN id RESTART WITH 1100;
