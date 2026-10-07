package com.lab.equipment.controller;

import com.lab.equipment.annotation.OperationLog;
import com.lab.equipment.annotation.RequireRole;
import com.lab.equipment.common.PageResult;
import com.lab.equipment.common.Result;
import com.lab.equipment.entity.RepairTicket;
import com.lab.equipment.enums.Role;
import com.lab.equipment.service.RepairService;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import javax.validation.constraints.Min;

/**
 * 设备报修工单接口
 */
@Validated
@RestController
@RequestMapping("/api/repair")
public class RepairController {

    private final RepairService repairService;

    public RepairController(RepairService repairService) {
        this.repairService = repairService;
    }

    /**
     * 提交报修（用户端）
     */
    @OperationLog("提交设备报修")
    @PostMapping
    public Result<RepairTicket> create(@RequestBody RepairTicket ticket) {
        return Result.success("报修已提交，管理员会尽快处理", repairService.create(ticket));
    }

    /**
     * 我的报修（用户端）
     */
    @GetMapping("/my")
    public Result<PageResult<RepairTicket>> my(@RequestParam(defaultValue = "1") @Min(1) long current,
                                               @RequestParam(defaultValue = "10") long size,
                                               @RequestParam(required = false) String status) {
        return Result.success(repairService.pageMine(current, size, status));
    }

    /**
     * 全部报修工单（管理端）
     */
    @RequireRole(Role.ADMIN)
    @GetMapping("/page")
    public Result<PageResult<RepairTicket>> page(@RequestParam(defaultValue = "1") @Min(1) long current,
                                                 @RequestParam(defaultValue = "10") long size,
                                                 @RequestParam(required = false) String status,
                                                 @RequestParam(required = false) Long equipmentId) {
        return Result.success(repairService.pageAll(current, size, status, equipmentId));
    }

    /**
     * 处理工单（受理 / 完成）
     */
    @RequireRole(Role.ADMIN)
    @OperationLog("处理报修工单")
    @PostMapping("/{id}/handle")
    public Result<Void> handle(@PathVariable Long id,
                               @RequestParam String status,
                               @RequestParam(required = false) String remark) {
        repairService.handle(id, status, remark);
        return Result.success();
    }
}
