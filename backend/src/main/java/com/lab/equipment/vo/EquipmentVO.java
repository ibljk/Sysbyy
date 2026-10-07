package com.lab.equipment.vo;

import lombok.Data;

import java.time.LocalDate;

/**
 * 设备列表视图对象（关联查询：类别名、实验室名）
 */
@Data
public class EquipmentVO {

    private Long id;
    private Long categoryId;
    private String categoryName;
    private Long labId;
    private String labName;
    private String name;
    private String model;
    private String code;
    private String status;
    /** 设备总台数 */
    private Integer stock;
    /** 当前进行中占用台数（APPROVED 且当前时刻落在其预约时段内） */
    private Integer occupiedNow;
    /** 本机最短预约时长（分钟），null=沿用全局配置 */
    private Integer minMinutes;
    /** 本机单次最长跨度（天），null=沿用全局配置 */
    private Integer maxDays;
    /** 本机是否允许跨天预约：1=允许 0=禁止 */
    private Integer allowCrossDay;
    /** 预约本机是否需要操作资质：1=需要 0=不需要 */
    private Integer needQualification;
    private LocalDate purchaseDate;
    private String description;
    private String image;
    private Integer version;
}
