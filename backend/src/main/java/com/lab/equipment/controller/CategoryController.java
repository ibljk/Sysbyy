package com.lab.equipment.controller;

import com.lab.equipment.annotation.OperationLog;
import com.lab.equipment.annotation.RequireRole;
import com.lab.equipment.common.Result;
import com.lab.equipment.entity.EquipmentCategory;
import com.lab.equipment.enums.Role;
import com.lab.equipment.service.CategoryService;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 设备类别接口
 */
@RestController
@RequestMapping("/api/category")
public class CategoryController {

    private final CategoryService categoryService;

    public CategoryController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    /**
     * 查询全部类别
     */
    @GetMapping("/list")
    public Result<List<EquipmentCategory>> listAll() {
        return Result.success(categoryService.listAll());
    }

    /**
     * 新增类别
     */
    @RequireRole(Role.ADMIN)
    @OperationLog("新增设备类别")
    @PostMapping
    public Result<EquipmentCategory> create(@RequestBody EquipmentCategory category) {
        return Result.success("创建成功", categoryService.create(category));
    }

    /**
     * 更新类别
     */
    @RequireRole(Role.ADMIN)
    @OperationLog("更新设备类别")
    @PutMapping("/{id}")
    public Result<Void> update(@PathVariable Long id, @RequestBody EquipmentCategory category) {
        categoryService.update(id, category);
        return Result.success();
    }

    /**
     * 删除类别
     */
    @RequireRole(Role.ADMIN)
    @OperationLog("删除设备类别")
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        categoryService.delete(id);
        return Result.success();
    }
}
