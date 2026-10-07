package com.lab.equipment.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 设备报修工单：用户报修 → 管理员处理 → 关闭
 */
@Data
@TableName("repair_ticket")
public class RepairTicket {

    /** 工单ID */
    @TableId(type = IdType.AUTO)
    private Long id;

    /** 设备ID */
    private Long equipmentId;

    /** 报修人ID */
    private Long reporterId;

    /** 报修人姓名 */
    private String reporterName;

    /** 故障描述 */
    private String faultDesc;

    /** 状态：PENDING=待处理 PROCESSING=处理中 DONE=已完成 */
    private String status;

    /** 处理人ID */
    private Long handlerId;

    /** 处理说明 */
    private String handleRemark;

    /** 处理时间 */
    private LocalDateTime handleTime;

    /** 报修时间 */
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

    /** 处理人姓名 */
    @TableField(exist = false)
    private String handlerName;
}
