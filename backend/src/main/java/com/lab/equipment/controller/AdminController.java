package com.lab.equipment.controller;

import com.lab.equipment.annotation.OperationLog;
import com.lab.equipment.annotation.RequireRole;
import com.lab.equipment.common.PageResult;
import com.lab.equipment.common.Result;
import com.lab.equipment.entity.SysConfig;
import com.lab.equipment.entity.SysLog;
import com.lab.equipment.enums.Role;
import com.lab.equipment.service.AdminService;
import com.lab.equipment.service.SysLogService;
import com.lab.equipment.vo.DashboardVO;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import javax.validation.constraints.Min;
import java.util.List;
import java.util.Map;

/**
 * 系统管理接口：数据统计看板、操作日志、系统配置
 */
@Validated
@RequireRole(Role.ADMIN)
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;
    private final SysLogService sysLogService;

    public AdminController(AdminService adminService, SysLogService sysLogService) {
        this.adminService = adminService;
        this.sysLogService = sysLogService;
    }

    /**
     * 数据统计看板
     */
    @GetMapping("/dashboard")
    public Result<DashboardVO> dashboard() {
        return Result.success(adminService.dashboard());
    }

    /**
     * 分页查询操作日志
     */
    @GetMapping("/logs/page")
    public Result<PageResult<SysLog>> logs(@RequestParam(defaultValue = "1") @Min(1) long current,
                                           @RequestParam(defaultValue = "10") long size,
                                           @RequestParam(required = false) String keyword,
                                           @RequestParam(required = false) String action) {
        return Result.success(sysLogService.pageLogs(current, size, keyword, action));
    }

    /**
     * 查询已有的操作类型（日志页下拉筛选用）
     */
    @GetMapping("/logs/actions")
    public Result<List<String>> logActions() {
        return Result.success(sysLogService.listActions());
    }

    /**
     * 查询全部系统配置
     */
    @GetMapping("/config/list")
    public Result<List<SysConfig>> configs() {
        return Result.success(adminService.listConfigs());
    }

    /**
     * 更新系统配置
     */
    @OperationLog("更新系统配置")
    @PutMapping("/config/{id}")
    public Result<Void> updateConfig(@PathVariable Long id, @RequestParam String value) {
        adminService.updateConfig(id, value);
        return Result.success();
    }

    /**
     * 查询配置键值（供前端读取，如预约规则提示）
     */
    @GetMapping("/config/{key}")
    public Result<Map<String, String>> configByKey(@PathVariable String key) {
        return Result.success(java.util.Collections.singletonMap("value", adminService.getConfigValue(key)));
    }
}
