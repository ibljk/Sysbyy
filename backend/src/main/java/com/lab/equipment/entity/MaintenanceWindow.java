package com.lab.equipment.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 设备维护窗口（停机保养 / 校准排期）
 * 维护时间段内该设备不可预约
 */
@Data
@TableName("maintenance_window")
public class MaintenanceWindow {

    /** 维护窗口ID */
    @TableId(type = IdType.AUTO)
    private Long id;

    /** 设备ID */
    private Long equipmentId;

    /** 维护开始时间 */
    private LocalDateTime startTime;

    /** 维护结束时间 */
    private LocalDateTime endTime;

    /** 维护原因：ROUTINE=例行保养 CALIBRATION=设备校准 CONSUMABLE=耗材更换 SAFETY=安全检查 TROUBLESHOOT=故障排查 UPGRADE=软件升级 */
    private String reasonType;

    /** 原因说明 */
    private String remark;

    /** 状态：PLANNED=计划 IN_PROGRESS=执行中 DONE=已完成 */
    private String status;

    /** 创建人ID */
    private Long creatorId;

    /** 创建时间 */
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    /** 更新时间 */
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;

    /* ==================== 展示字段（不落库） ==================== */

    /** 设备名称 */
    @TableField(exist = false)
    private String equipmentName;

    /** 设备编号 */
    @TableField(exist = false)
    private String equipmentCode;
}
