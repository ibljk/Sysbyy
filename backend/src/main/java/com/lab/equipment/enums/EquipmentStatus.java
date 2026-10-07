package com.lab.equipment.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * 设备状态（按枚举名称存储到数据库）
 */
@Getter
@AllArgsConstructor
public enum EquipmentStatus {

    /** 空闲 */
    IDLE("空闲"),

    /** 使用中（存在已审批且未结束的预约） */
    USING("使用中"),

    /** 维修中 */
    REPAIR("维修中");

    private final String desc;
}
