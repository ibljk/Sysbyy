package com.lab.equipment.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 系统公告表
 */
@Data
@TableName("announcement")
public class Announcement {

    /** 公告ID */
    @TableId(type = IdType.AUTO)
    private Long id;

    /** 标题 */
    private String title;

    /** 内容 */
    private String content;

    /** 级别：NOTICE=通知 WARNING=注意 URGENT=紧急 */
    private String level;

    /** 状态：PUBLISHED=已发布 CLOSED=已关闭 */
    private String status;

    /** 发布人ID */
    private Long publisherId;

    /** 发布人姓名 */
    private String publisherName;

    /** 发布时间 */
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    /** 更新时间 */
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}
