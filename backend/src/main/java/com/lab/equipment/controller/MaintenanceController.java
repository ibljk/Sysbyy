package com.lab.equipment.controller;

import com.lab.equipment.annotation.OperationLog;
import com.lab.equipment.annotation.RequireRole;
import com.lab.equipment.common.PageResult;
import com.lab.equipment.common.Result;
import com.lab.equipment.entity.MaintenanceWindow;
import com.lab.equipment.enums.Role;
import com.lab.equipment.service.MaintenanceService;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import javax.validation.constraints.Min;

/**
 * 设备维护窗口接口（管理端）
 */
@Validated
@RestController
@RequestMapping("/api/maintenance")
@RequireRole(Role.ADMIN)
public class MaintenanceController {

    private final MaintenanceService maintenanceService;

    public MaintenanceController(MaintenanceService maintenanceService) {
        this.maintenanceService = maintenanceService;
    }

    /**
     * 分页查询维护窗口
     */
    @GetMapping("/page")
    public Result<PageResult<MaintenanceWindow>> page(@RequestParam(defaultValue = "1") @Min(1) long current,
                                                      @RequestParam(defaultValue = "10") long size,
                                                      @RequestParam(required = false) Long equipmentId,
                                                      @RequestParam(required = false) String status) {
        return Result.success(maintenanceService.pageWindows(current, size, equipmentId, status));
    }

    /**
     * 创建维护窗口（与已有预约冲突则拒绝）
     */
    @OperationLog("创建维护窗口")
    @PostMapping
    public Result<MaintenanceWindow> create(@RequestBody MaintenanceWindow window) {
        return Result.success("维护窗口已创建", maintenanceService.create(window));
    }

    /**
     * 结束维护（提前完成）
     */
    @OperationLog("结束设备维护")
    @PostMapping("/{id}/complete")
    public Result<Void> complete(@PathVariable Long id) {
        maintenanceService.complete(id);
        return Result.success();
    }

    /**
     * 删除维护窗口（仅计划状态）
     */
    @OperationLog("删除维护窗口")
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        maintenanceService.delete(id);
        return Result.success();
    }
}
