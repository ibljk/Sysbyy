package com.lab.equipment.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * 实验室表
 */
@Data
@TableName("lab")
public class Lab {

    /** 实验室ID */
    @TableId(type = IdType.AUTO)
    private Long id;

    /** 实验室名称 */
    private String name;

    /** 位置 */
    private String location;

    /** 可容纳人数 */
    private Integer capacity;

    /** 开放开始时间 */
    private LocalTime openStartTime;

    /** 开放结束时间 */
    private LocalTime openEndTime;

    /** 实验室描述 */
    private String description;

    /** 创建时间 */
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    /** 更新时间 */
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}
