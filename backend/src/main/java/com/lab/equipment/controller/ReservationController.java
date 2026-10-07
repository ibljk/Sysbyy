package com.lab.equipment.controller;

import com.lab.equipment.annotation.OperationLog;
import com.lab.equipment.annotation.RequireRole;
import com.lab.equipment.common.PageResult;
import com.lab.equipment.common.Result;
import com.lab.equipment.dto.ApprovalRequest;
import com.lab.equipment.dto.CompleteRequest;
import com.lab.equipment.dto.ReservationRequest;
import com.lab.equipment.enums.Role;
import com.lab.equipment.service.ReservationService;
import com.lab.equipment.vo.ReservationVO;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import javax.validation.Valid;
import javax.validation.constraints.Min;
import java.time.LocalDate;

/**
 * 设备预约接口
 */
@Validated
@RestController
@RequestMapping("/api/reservation")
public class ReservationController {

    private final ReservationService reservationService;

    public ReservationController(ReservationService reservationService) {
        this.reservationService = reservationService;
    }

    /**
     * 发起预约申请
     */
    @OperationLog("发起预约")
    @PostMapping
    public Result<Long> create(@Valid @RequestBody ReservationRequest request) {
        return Result.success("预约申请已提交，等待审批", reservationService.createReservation(request));
    }

    /**
     * 查询本人预约
     */
    @GetMapping("/my")
    public Result<PageResult<ReservationVO>> my(@RequestParam(defaultValue = "1") @Min(1) long current,
                                                @RequestParam(defaultValue = "10") long size,
                                                @RequestParam(required = false) String status) {
        return Result.success(reservationService.pageMyReservations(current, size, status));
    }

    /**
     * 预约详情
     */
    @GetMapping("/{id}")
    public Result<ReservationVO> detail(@PathVariable Long id) {
        return Result.success(reservationService.getReservationVO(id));
    }

    /**
     * 取消预约（本人或管理员）
     */
    @OperationLog("取消预约")
    @PostMapping("/{id}/cancel")
    public Result<Void> cancel(@PathVariable Long id) {
        reservationService.cancel(id);
        return Result.<Void>success("预约已取消", null);
    }

    /* ==================== 管理员接口 ==================== */

    /**
     * 分页查询全部预约（支持状态 / 关键字 / 日期范围筛选）
     */
    @RequireRole(Role.ADMIN)
    @GetMapping("/page")
    public Result<PageResult<ReservationVO>> page(@RequestParam(defaultValue = "1") @Min(1) long current,
                                                  @RequestParam(defaultValue = "10") long size,
                                                  @RequestParam(required = false) String status,
                                                  @RequestParam(required = false) String keyword,
                                                  @RequestParam(required = false)
                                                  @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate dateFrom,
                                                  @RequestParam(required = false)
                                                  @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate dateTo) {
        return Result.success(reservationService.pageAllReservations(current, size, status, keyword, dateFrom, dateTo));
    }

    /**
     * 审批预约（通过 / 驳回）
     */
    @RequireRole(Role.ADMIN)
    @OperationLog("审批预约")
    @PostMapping("/{id}/approve")
    public Result<Void> approve(@PathVariable Long id, @Valid @RequestBody ApprovalRequest request) {
        reservationService.approve(id, request);
        return Result.<Void>success("审批完成", null);
    }

    /**
     * 用户归还设备：预约人拍照上传归还凭证并完成预约（也允许管理员代操作）。
     * 仅已通过（APPROVED）的预约可办理；归还后设备回刷为空闲。
     */
    @OperationLog("用户归还设备")
    @PostMapping("/{id}/complete")
    public Result<Void> complete(@PathVariable Long id, @RequestBody CompleteRequest request) {
        reservationService.complete(id, request.getReturnImage(), request.getReturnNote());
        return Result.<Void>success("设备已归还并完成", null);
    }
}
