package com.lab.equipment.controller;

import com.lab.equipment.annotation.OperationLog;
import com.lab.equipment.annotation.RequireRole;
import com.lab.equipment.common.PageResult;
import com.lab.equipment.common.Result;
import com.lab.equipment.entity.Equipment;
import com.lab.equipment.enums.EquipmentStatus;
import com.lab.equipment.enums.Role;
import com.lab.equipment.service.EquipmentService;
import com.lab.equipment.vo.EquipmentVO;
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
 * 实验设备管理接口
 */
@Validated
@RestController
@RequestMapping("/api/equipment")
public class EquipmentController {

    private final EquipmentService equipmentService;

    public EquipmentController(EquipmentService equipmentService) {
        this.equipmentService = equipmentService;
    }

    /**
     * 分页查询设备（关键字 / 类别 / 实验室 / 状态筛选）
     */
    @GetMapping("/page")
    public Result<PageResult<EquipmentVO>> page(@RequestParam(defaultValue = "1") @Min(1) long current,
                                                @RequestParam(defaultValue = "10") long size,
                                                @RequestParam(required = false) String keyword,
                                                @RequestParam(required = false) Long categoryId,
                                                @RequestParam(required = false) Long labId,
                                                @RequestParam(required = false) String status) {
        return Result.success(equipmentService.pageEquipments(current, size, keyword, categoryId, labId, status));
    }

    /**
     * 查询全部设备（下拉选择用）
     */
    @GetMapping("/list")
    public Result<List<Equipment>> listAll() {
        return Result.success(equipmentService.listAll());
    }

    /**
     * 查询可预约设备（空闲状态）
     */
    @GetMapping("/list-bookable")
    public Result<List<Equipment>> listBookable() {
        return Result.success(equipmentService.listBookable());
    }

    /**
     * 设备详情
     */
    @GetMapping("/{id}")
    public Result<EquipmentVO> detail(@PathVariable Long id) {
        return Result.success(equipmentService.getEquipmentVO(id));
    }

    /**
     * 新增设备
     */
    @RequireRole(Role.ADMIN)
    @OperationLog("新增设备")
    @PostMapping
    public Result<Equipment> create(@RequestBody Equipment equipment) {
        return Result.success("创建成功", equipmentService.createEquipment(equipment));
    }

    /**
     * 更新设备基本信息
     */
    @RequireRole(Role.ADMIN)
    @OperationLog("更新设备")
    @PutMapping("/{id}")
    public Result<Void> update(@PathVariable Long id, @RequestBody Equipment equipment) {
        equipmentService.updateEquipment(id, equipment);
        return Result.success();
    }

    /**
     * 删除设备
     */
    @RequireRole(Role.ADMIN)
    @OperationLog("删除设备")
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        equipmentService.deleteEquipment(id);
        return Result.success();
    }

    /**
     * 变更设备状态（如标记维修）
     */
    @RequireRole(Role.ADMIN)
    @OperationLog("变更设备状态")
    @PutMapping("/{id}/status")
    public Result<Void> changeStatus(@PathVariable Long id,
                                     @RequestParam EquipmentStatus status) {
        equipmentService.changeStatus(id, status);
        return Result.success();
    }
}
