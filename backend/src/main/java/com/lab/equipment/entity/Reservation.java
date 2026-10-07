package com.lab.equipment.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.lab.equipment.enums.ReservationStatus;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * 设备预约表
 */
@Data
@TableName("reservation")
public class Reservation {

    /** 预约ID */
    @TableId(type = IdType.AUTO)
    private Long id;

    /** 预约人（用户）ID */
    private Long userId;

    /** 预约设备ID */
    private Long equipmentId;

    /** 所属实验室ID（冗余，便于按实验室统计） */
    private Long labId;

    /** 开始日期 */
    private LocalDate date;

    /** 结束日期（跨天预约的结束日；单日预约与 date 相同） */
    private LocalDate endDate;

    /** 开始时间（开始日时刻） */
    private LocalTime startTime;

    /** 结束时间（结束日时刻） */
    private LocalTime endTime;

    /** 预约用途说明 */
    private String purpose;

    /** 状态：PENDING / APPROVED / REJECTED / CANCELLED / COMPLETED / EXPIRED */
    private ReservationStatus status;

    /** 审批意见（驳回时填写） */
    private String approveComment;

    /** 审批人ID */
    private Long approverId;

    /** 归还照片：归还设备时拍照上传（图片 URL / base64 data URL） */
    private String returnImage;

    /** 归还备注 */
    private String returnNote;

    /** 归还时间（实际完成时间） */
    private LocalDateTime returnedAt;

    /** 创建时间 */
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    /** 更新时间 */
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}
