package com.lab.equipment.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.lab.equipment.common.PageResult;
import com.lab.equipment.common.ResultCode;
import com.lab.equipment.entity.Equipment;
import com.lab.equipment.entity.Lab;
import com.lab.equipment.exception.BusinessException;
import com.lab.equipment.mapper.EquipmentMapper;
import com.lab.equipment.mapper.LabMapper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;

/**
 * 实验室服务
 */
@Service
public class LabService extends ServiceImpl<LabMapper, Lab> {

    private final EquipmentMapper equipmentMapper;

    public LabService(EquipmentMapper equipmentMapper) {
        this.equipmentMapper = equipmentMapper;
    }

    /**
     * 分页查询实验室
     */
    public PageResult<Lab> pageLabs(long current, long size, String keyword) {
        LambdaQueryWrapper<Lab> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(keyword)) {
            wrapper.and(w -> w.like(Lab::getName, keyword)
                    .or().like(Lab::getLocation, keyword));
        }
        wrapper.orderByAsc(Lab::getId);
        return PageResult.of(page(new Page<>(current, size), wrapper));
    }

    /**
     * 查询全部实验室（下拉选择用）
     */
    public List<Lab> listAll() {
        return list(new LambdaQueryWrapper<Lab>().orderByAsc(Lab::getId));
    }

    /**
     * 新增实验室
     */
    public Lab createLab(Lab lab) {
        validateLab(lab, null);
        lab.setId(null);
        save(lab);
        return lab;
    }

    /**
     * 更新实验室
     */
    public void updateLab(Long id, Lab lab) {
        Lab exist = getById(id);
        if (exist == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "实验室不存在");
        }
        lab.setId(id);
        validateLab(lab, id);
        updateById(lab);
    }

    /**
     * 删除实验室（存在关联设备时禁止删除）
     */
    public void deleteLab(Long id) {
        if (getById(id) == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "实验室不存在");
        }
        Long equipmentCount = equipmentCountByLab(id);
        if (equipmentCount != null && equipmentCount > 0) {
            throw new BusinessException("该实验室下存在设备，请先移除关联设备");
        }
        removeById(id);
    }

    private void validateLab(Lab lab, Long excludeId) {
        if (!StringUtils.hasText(lab.getName())) {
            throw new BusinessException("实验室名称不能为空");
        }
        if (lab.getOpenStartTime() != null && lab.getOpenEndTime() != null
                && !lab.getOpenStartTime().isBefore(lab.getOpenEndTime())) {
            throw new BusinessException("开放开始时间必须早于结束时间");
        }
        LambdaQueryWrapper<Lab> wrapper = new LambdaQueryWrapper<Lab>().eq(Lab::getName, lab.getName());
        if (excludeId != null) {
            wrapper.ne(Lab::getId, excludeId);
        }
        if (count(wrapper) > 0) {
            throw new BusinessException("实验室名称已存在");
        }
    }

    private Long equipmentCountByLab(Long labId) {
        return equipmentMapper.selectCount(new LambdaQueryWrapper<Equipment>()
                .eq(Equipment::getLabId, labId));
    }
}
