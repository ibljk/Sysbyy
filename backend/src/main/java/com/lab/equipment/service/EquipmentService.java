package com.lab.equipment.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.lab.equipment.common.PageResult;
import com.lab.equipment.common.ResultCode;
import com.lab.equipment.entity.Equipment;
import com.lab.equipment.entity.Reservation;
import com.lab.equipment.enums.EquipmentStatus;
import com.lab.equipment.enums.ReservationStatus;
import com.lab.equipment.exception.BusinessException;
import com.lab.equipment.mapper.EquipmentMapper;
import com.lab.equipment.mapper.ReservationMapper;
import com.lab.equipment.vo.EquipmentVO;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;

/**
 * 设备服务
 */
@Service
public class EquipmentService extends ServiceImpl<EquipmentMapper, Equipment> {

    private final ReservationMapper reservationMapper;

    public EquipmentService(ReservationMapper reservationMapper) {
        this.reservationMapper = reservationMapper;
    }

    /**
     * 分页查询设备（关键字/类别/实验室/状态筛选）
     */
    public PageResult<EquipmentVO> pageEquipments(long current, long size, String keyword,
                                                  Long categoryId, Long labId, String status) {
        Page<EquipmentVO> page = new Page<>(current, size);
        return PageResult.of(baseMapper.selectEquipmentVOPage(page, keyword, categoryId, labId, status));
    }

    /**
     * 查询全部设备（下拉选择用）
     */
    public List<Equipment> listAll() {
        return list(new LambdaQueryWrapper<Equipment>().orderByAsc(Equipment::getId));
    }

    /**
     * 查询可预约设备（非维修停用即可选择，是否仍有空位按所选时段在提交时校验）
     */
    public List<Equipment> listBookable() {
        return list(new LambdaQueryWrapper<Equipment>()
                .ne(Equipment::getStatus, EquipmentStatus.REPAIR)
                .orderByAsc(Equipment::getId));
    }

    /**
     * 新增设备
     */
    public Equipment createEquipment(Equipment equipment) {
        validateEquipment(equipment, null);
        equipment.setId(null);
        equipment.setStatus(equipment.getStatus() == null ? EquipmentStatus.IDLE : equipment.getStatus());
        if (equipment.getStock() == null || equipment.getStock() < 1) {
            equipment.setStock(1);
        }
        if (equipment.getAllowCrossDay() == null) {
            equipment.setAllowCrossDay(1);
        }
        if (equipment.getNeedQualification() == null) {
            equipment.setNeedQualification(0);
        }
        equipment.setVersion(0);
        save(equipment);
        return equipment;
    }

    /**
     * 更新设备
     */
    public void updateEquipment(Long id, Equipment equipment) {
        Equipment exist = getById(id);
        if (exist == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "设备不存在");
        }
        equipment.setId(id);
        // 状态与版本号不允许通过普通更新接口修改
        equipment.setStatus(null);
        equipment.setVersion(exist.getVersion());
        validateEquipment(equipment, id);
        updateById(equipment);
        // 预约规则允许"清空回退全局配置"，需显式赋值（updateById 默认忽略 null）
        update(new com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper<Equipment>()
                .eq(Equipment::getId, id)
                .set(Equipment::getMinMinutes, equipment.getMinMinutes())
                .set(Equipment::getMaxDays, equipment.getMaxDays())
                .set(Equipment::getAllowCrossDay,
                        equipment.getAllowCrossDay() == null ? 1 : equipment.getAllowCrossDay())
                .set(Equipment::getNeedQualification,
                        equipment.getNeedQualification() == null ? 0 : equipment.getNeedQualification()));
    }

    /**
     * 删除设备（存在未完成预约时禁止删除）
     */
    public void deleteEquipment(Long id) {
        Long active = reservationMapper.selectCount(new LambdaQueryWrapper<Reservation>()
                .eq(Reservation::getEquipmentId, id)
                .in(Reservation::getStatus, ReservationStatus.PENDING, ReservationStatus.APPROVED));
        if (active != null && active > 0) {
            throw new BusinessException("该设备存在未完成的预约，请先处理后再删除");
        }
        removeById(id);
    }

    /**
     * 管理员变更设备状态（如标记维修）
     */
    public void changeStatus(Long id, EquipmentStatus status) {
        Equipment equipment = getById(id);
        if (equipment == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "设备不存在");
        }
        if (status == null) {
            throw new BusinessException("请选择设备状态");
        }
        equipment.setStatus(status);
        updateById(equipment);
    }

    /**
     * 查询单个设备
     */
    public EquipmentVO getEquipmentVO(Long id) {
        Equipment equipment = getById(id);
        if (equipment == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "设备不存在");
        }
        Page<EquipmentVO> page = new Page<>(1, 1);
        PageResult<EquipmentVO> result =
                PageResult.of(baseMapper.selectEquipmentVOPage(page, equipment.getCode(), null, null, null));
        List<EquipmentVO> records = result.getRecords();
        return records.isEmpty() ? null : records.get(0);
    }

    private void validateEquipment(Equipment equipment, Long excludeId) {
        if (!StringUtils.hasText(equipment.getName())) {
            throw new BusinessException("设备名称不能为空");
        }
        if (!StringUtils.hasText(equipment.getCode())) {
            throw new BusinessException("设备编号不能为空");
        }
        if (equipment.getCategoryId() == null || equipment.getLabId() == null) {
            throw new BusinessException("请选择设备类别与所属实验室");
        }
        if (equipment.getStock() != null && (equipment.getStock() < 1 || equipment.getStock() > 999)) {
            throw new BusinessException("设备台数需在 1 ~ 999 之间");
        }
        LambdaQueryWrapper<Equipment> wrapper = new LambdaQueryWrapper<Equipment>().eq(Equipment::getCode, equipment.getCode());
        if (excludeId != null) {
            wrapper.ne(Equipment::getId, excludeId);
        }
        if (count(wrapper) > 0) {
            throw new BusinessException("设备编号已存在");
        }
    }
}
