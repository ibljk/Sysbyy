package com.lab.equipment.vo;

import lombok.Data;

import java.util.List;
import java.util.Map;

/**
 * 数据统计看板视图对象
 */
@Data
public class DashboardVO {

    /** 今日预约总数 */
    private Long todayReservations;

    /** 今日待审批数 */
    private Long todayPending;

    /** 今日已通过数 */
    private Long todayApproved;

    /** 设备总数 */
    private Long totalEquipments;

    /** 空闲设备数 */
    private Long idleEquipments;

    /** 使用中设备数 */
    private Long usingEquipments;

    /** 维修中设备数 */
    private Long repairEquipments;

    /** 用户总数 */
    private Long totalUsers;

    /** 实验室总数 */
    private Long totalLabs;

    /** 近7日预约趋势：[{date, count, approved}] */
    private List<Map<String, Object>> weekTrend;

    /** 预约状态分布：[{status, count}] */
    private List<Map<String, Object>> statusDist;

    /** 实验室预约量排行：[{labName, count}] */
    private List<Map<String, Object>> labRank;

    /** 设备使用时长 TOP5：[{name, totalMinutes}] */
    private List<Map<String, Object>> topEquipUsage;
}
