package com.lab.equipment.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.lab.equipment.common.ResultCode;
import com.lab.equipment.entity.Equipment;
import com.lab.equipment.entity.EquipmentCategory;
import com.lab.equipment.exception.BusinessException;
import com.lab.equipment.mapper.EquipmentCategoryMapper;
import com.lab.equipment.mapper.EquipmentMapper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;

/**
 * 设备类别服务
 */
@Service
public class CategoryService extends ServiceImpl<EquipmentCategoryMapper, EquipmentCategory> {

    private final EquipmentMapper equipmentMapper;

    public CategoryService(EquipmentMapper equipmentMapper) {
        this.equipmentMapper = equipmentMapper;
    }

    /**
     * 查询全部类别
     */
    public List<EquipmentCategory> listAll() {
        return list(new LambdaQueryWrapper<EquipmentCategory>().orderByAsc(EquipmentCategory::getId));
    }

    /**
     * 新增类别
     */
    public EquipmentCategory create(EquipmentCategory category) {
        if (!StringUtils.hasText(category.getName())) {
            throw new BusinessException("类别名称不能为空");
        }
        checkNameUnique(category.getName(), null);
        category.setId(null);
        save(category);
        return category;
    }

    /**
     * 更新类别
     */
    public void update(Long id, EquipmentCategory category) {
        if (getById(id) == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "类别不存在");
        }
        if (StringUtils.hasText(category.getName())) {
            checkNameUnique(category.getName(), id);
        }
        category.setId(id);
        updateById(category);
    }

    /**
     * 删除类别（存在关联设备时禁止删除）
     */
    public void delete(Long id) {
        Long equipmentCount = equipmentMapper.selectCount(new LambdaQueryWrapper<Equipment>()
                .eq(Equipment::getCategoryId, id));
        if (equipmentCount != null && equipmentCount > 0) {
            throw new BusinessException("该类别下存在设备，请先移除关联设备");
        }
        removeById(id);
    }

    private void checkNameUnique(String name, Long excludeId) {
        LambdaQueryWrapper<EquipmentCategory> wrapper =
                new LambdaQueryWrapper<EquipmentCategory>().eq(EquipmentCategory::getName, name);
        if (excludeId != null) {
            wrapper.ne(EquipmentCategory::getId, excludeId);
        }
        if (count(wrapper) > 0) {
            throw new BusinessException("类别名称已存在");
        }
    }
}
