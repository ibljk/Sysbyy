package com.lab.equipment.vo;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * 预约列表视图对象（关联查询：设备名、实验室名、用户信息）
 */
@Data
public class ReservationVO {

    private Long id;
    private Long userId;
    private String username;
    private String realName;
    private Long equipmentId;
    private String equipmentName;
    private String equipmentCode;
    /** 设备图片（关联设备表） */
    private String equipmentImage;
    private Long labId;
    private String labName;
    private LocalDate date;
    /** 结束日期（跨天预约的结束日；单日预约与 date 相同） */
    private LocalDate endDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private String purpose;
    private String status;
    private String approveComment;
    /** 归还照片（仅详情接口返回，列表接口为空避免传输过大） */
    private String returnImage;
    private String returnNote;
    private LocalDateTime returnedAt;
    private LocalDateTime createTime;
}
