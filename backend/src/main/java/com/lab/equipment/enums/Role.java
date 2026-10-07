package com.lab.equipment.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * 系统角色（按枚举名称存储到数据库）
 * 学生 / 教师统一为用户端角色 USER
 */
@Getter
@AllArgsConstructor
public enum Role {

    /** 管理员：拥有系统全部权限（设备/实验室/预约/用户/统计/配置管理） */
    ADMIN("管理员"),

    /** 普通用户：浏览设备并发起预约（原教师、学生统一） */
    USER("用户");

    /** 中文描述 */
    private final String desc;
}
