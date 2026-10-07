package com.lab.equipment.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * 预约状态机（按枚举名称存储到数据库）：
 * PENDING(待审批) → APPROVED(已通过) → COMPLETED(已完成)
 *                    ↘ REJECTED(已驳回)
 * PENDING/APPROVED → CANCELLED(已取消)
 * 超时未审批/未开始 → EXPIRED(已过期)
 */
@Getter
@AllArgsConstructor
public enum ReservationStatus {

    /** 待审批 */
    PENDING("待审批"),

    /** 已通过 */
    APPROVED("已通过"),

    /** 已驳回 */
    REJECTED("已驳回"),

    /** 已取消 */
    CANCELLED("已取消"),

    /** 已完成 */
    COMPLETED("已完成"),

    /** 已过期 */
    EXPIRED("已过期");

    private final String desc;
}
