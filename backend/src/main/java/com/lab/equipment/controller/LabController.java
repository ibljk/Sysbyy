package com.lab.equipment.controller;

import com.lab.equipment.annotation.OperationLog;
import com.lab.equipment.annotation.RequireRole;
import com.lab.equipment.common.PageResult;
import com.lab.equipment.common.Result;
import com.lab.equipment.entity.Lab;
import com.lab.equipment.enums.Role;
import com.lab.equipment.service.LabService;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import javax.validation.constraints.Min;
import java.util.List;

/**
 * 实验室管理接口
 */
@Validated
@RestController
@RequestMapping("/api/lab")
public class LabController {

    private final LabService labService;

    public LabController(LabService labService) {
        this.labService = labService;
    }

    /**
     * 查询全部实验室（下拉选择用）
     */
    @GetMapping("/list")
    public Result<List<Lab>> listAll() {
        return Result.success(labService.listAll());
    }

    /**
     * 分页查询实验室
     */
    @GetMapping("/page")
    public Result<PageResult<Lab>> page(@RequestParam(defaultValue = "1") @Min(1) long current,
                                        @RequestParam(defaultValue = "10") long size,
                                        @RequestParam(required = false) String keyword) {
        return Result.success(labService.pageLabs(current, size, keyword));
    }

    /**
     * 新增实验室
     */
    @RequireRole(Role.ADMIN)
    @OperationLog("新增实验室")
    @PostMapping
    public Result<Lab> create(@RequestBody Lab lab) {
        return Result.success("创建成功", labService.createLab(lab));
    }

    /**
     * 更新实验室
     */
    @RequireRole(Role.ADMIN)
    @OperationLog("更新实验室")
    @PutMapping("/{id}")
    public Result<Void> update(@PathVariable Long id, @RequestBody Lab lab) {
        labService.updateLab(id, lab);
        return Result.success();
    }

    /**
     * 删除实验室
     */
    @RequireRole(Role.ADMIN)
    @OperationLog("删除实验室")
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        labService.deleteLab(id);
        return Result.success();
    }
}
