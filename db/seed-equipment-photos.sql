-- ============================================================
-- 演示设备配图（真实感产品图，统一实验室摄影风格）
-- 用法：mysql -uroot -p lab_equipment < seed-equipment-photos.sql
-- 配套：frontend/assets/equipment/ 下有 12 张 PNG 资源（AI 生成，本地离线）
-- 字段 image 存前端相对路径，el-image 自动通过前端静态服务器渲染
-- ============================================================
USE lab_equipment;
SET NAMES utf8mb4;
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
