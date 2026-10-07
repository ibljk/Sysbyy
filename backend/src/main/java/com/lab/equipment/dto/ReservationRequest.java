package com.lab.equipment.dto;

import lombok.Data;

import javax.validation.constraints.FutureOrPresent;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Size;
import java.time.LocalDate;
import java.time.LocalTime;

/**
 * 预约申请请求
 */
@Data
public class ReservationRequest {

    /** 预约设备ID */
    @NotNull(message = "请选择要预约的设备")
    private Long equipmentId;

    /** 开始日期 */
    @NotNull(message = "请选择开始日期")
    @FutureOrPresent(message = "预约日期不能早于今天")
    private LocalDate date;

    /** 结束日期（跨天连续预约的结束日；不传则视为单日预约，与开始日期相同） */
    private LocalDate endDate;

    /** 开始时间（开始日时刻） */
    @NotNull(message = "请选择开始时间")
    private LocalTime startTime;

    /** 结束时间（结束日时刻） */
    @NotNull(message = "请选择结束时间")
    private LocalTime endTime;

    /** 预约用途 */
    @Size(max = 200, message = "用途说明不能超过 200 个字符")
    private String purpose;
}
