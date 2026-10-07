package com.lab.equipment.controller;

import com.lab.equipment.annotation.OperationLog;
import com.lab.equipment.annotation.RequireRole;
import com.lab.equipment.common.PageResult;
import com.lab.equipment.common.Result;
import com.lab.equipment.entity.Qualification;
import com.lab.equipment.enums.Role;
import com.lab.equipment.service.QualificationService;
import com.lab.equipment.util.UserContext;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import javax.validation.constraints.Min;
import java.util.List;

/**
 * 设备操作资质接口（准入控制）
 */
@Validated
@RestController
@RequestMapping("/api/qualification")
public class QualificationController {

    private final QualificationService qualificationService;

    public QualificationController(QualificationService qualificationService) {
        this.qualificationService = qualificationService;
    }

    /**
     * 分页查询已授予资质（管理端）
     */
    @RequireRole(Role.ADMIN)
    @GetMapping("/page")
    public Result<PageResult<Qualification>> page(@RequestParam(defaultValue = "1") @Min(1) long current,
                                                  @RequestParam(defaultValue = "10") long size,
                                                  @RequestParam(required = false) String keyword,
                                                  @RequestParam(required = false) String status,
                                                  @RequestParam(required = false) Long equipmentId) {
        return Result.success(qualificationService.pageQualifications(current, size, keyword, status, equipmentId));
    }

    /**
     * 授予资质
     */
    @RequireRole(Role.ADMIN)
    @OperationLog("授予设备资质")
    @PostMapping
    public Result<Qualification> grant(@RequestBody Qualification qualification) {
        return Result.success("资质已授予", qualificationService.grant(qualification));
    }

    /**
     * 撤销资质
     */
    @RequireRole(Role.ADMIN)
    @OperationLog("撤销设备资质")
    @PostMapping("/{id}/revoke")
    public Result<Void> revoke(@PathVariable Long id) {
        qualificationService.revoke(id);
        return Result.success();
    }

    /**
     * 我的资质（用户端）
     */
    @GetMapping("/my")
    public Result<List<Qualification>> my() {
        return Result.success(qualificationService.listByUser(UserContext.getUserId()));
    }
}
