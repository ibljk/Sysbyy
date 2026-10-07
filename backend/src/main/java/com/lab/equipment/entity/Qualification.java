package com.lab.equipment.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 设备操作资质（准入控制）：设备标记"需要资质"后，
 * 仅持有效资质的用户可发起预约
 */
@Data
@TableName("qualification")
public class Qualification {

    /** 资质ID */
    @TableId(type = IdType.AUTO)
    private Long id;

    /** 设备ID */
    private Long equipmentId;

    /** 持证人ID */
    private Long userId;

    /** 培训日期 */
    private LocalDate trainingDate;

    /** 有效期至（NULL=长期有效） */
    private LocalDate validUntil;

    /** 备注（培训成绩等） */
    private String remark;

    /** 状态：VALID=有效 REVOKED=已撤销 */
    private String status;

    /** 授予人ID */
    private Long grantorId;

    /** 授予时间 */
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

    /** 持证人账号 */
    @TableField(exist = false)
    private String username;

    /** 持证人姓名 */
    @TableField(exist = false)
    private String realName;

    /** 是否已过期（有效期早于今天） */
    @TableField(exist = false)
    private Boolean expired;
}
