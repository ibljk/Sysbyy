package com.lab.equipment.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.annotation.Version;
import com.lab.equipment.enums.EquipmentStatus;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 实验设备表
 */
@Data
@TableName("equipment")
public class Equipment {

    /** 设备ID */
    @TableId(type = IdType.AUTO)
    private Long id;

    /** 所属类别ID */
    private Long categoryId;

    /** 所属实验室ID */
    private Long labId;

    /** 设备名称 */
    private String name;

    /** 设备型号 */
    private String model;

    /** 设备编号（唯一） */
    private String code;

    /** 当前状态：IDLE / USING / REPAIR（REPAIR=维修停用；IDLE/USING 为历史兼容，占用按预约实时统计） */
    private EquipmentStatus status;

    /** 设备总台数（同型号数量，可多人同时预约，单次预约占用 1 台） */
    private Integer stock;

    /* ==================== 仪器级预约规则（为空时沿用全局配置） ==================== */

    /** 本机最短预约时长（分钟），NULL=沿用全局配置 */
    private Integer minMinutes;

    /** 本机单次最长跨度（天，含首尾），NULL=沿用全局配置 */
    private Integer maxDays;

    /** 本机是否允许跨天预约：1=允许 0=禁止 */
    private Integer allowCrossDay;

    /** 预约本机是否需要操作资质：1=需要 0=不需要 */
    private Integer needQualification;

    /** 购入日期 */
    private LocalDate purchaseDate;

    /** 设备描述 */
    private String description;

    /** 设备图片：图片 URL / SVG data URL / base64 均可，为空时前端自动生成占位图 */
    private String image;

    /** 乐观锁版本号（并发预约时使用） */
    @Version
    private Integer version;

    /** 创建时间 */
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    /** 更新时间 */
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}
