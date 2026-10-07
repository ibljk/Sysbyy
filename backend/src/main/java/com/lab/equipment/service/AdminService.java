package com.lab.equipment.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.lab.equipment.common.ResultCode;
import com.lab.equipment.entity.Equipment;
import com.lab.equipment.entity.EquipmentCategory;
import com.lab.equipment.entity.Lab;
import com.lab.equipment.entity.Reservation;
import com.lab.equipment.entity.SysConfig;
import com.lab.equipment.entity.User;
import com.lab.equipment.enums.EquipmentStatus;
import com.lab.equipment.enums.ReservationStatus;
import com.lab.equipment.exception.BusinessException;
import com.lab.equipment.mapper.EquipmentMapper;
import com.lab.equipment.mapper.ReservationMapper;
import com.lab.equipment.mapper.SysConfigMapper;
import com.lab.equipment.vo.DashboardVO;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * 系统管理服务：数据统计看板、系统配置
 */
@Service
public class AdminService extends ServiceImpl<SysConfigMapper, SysConfig> {

    private final ReservationMapper reservationMapper;
    private final EquipmentMapper equipmentMapper;
    private final UserService userService;
    private final LabService labService;

    public AdminService(ReservationMapper reservationMapper, EquipmentMapper equipmentMapper,
                        UserService userService, LabService labService) {
        this.reservationMapper = reservationMapper;
        this.equipmentMapper = equipmentMapper;
        this.userService = userService;
        this.labService = labService;
    }

    /* ==================== 数据统计看板 ==================== */

    /**
     * 组装统计看板数据
     */
    public DashboardVO dashboard() {
        LocalDate today = LocalDate.now();
        DashboardVO vo = new DashboardVO();

        // 今日预约统计
        vo.setTodayReservations(countReservationByDateAndStatus(today, null));
        vo.setTodayPending(countReservationByDateAndStatus(today, ReservationStatus.PENDING));
        vo.setTodayApproved(countReservationByDateAndStatus(today, ReservationStatus.APPROVED));

        // 设备统计（按台数口径：总台数 / 当前占用 / 维修停用 / 空闲）
        Map<String, Object> stats = equipmentMapper.selectStockStats();
        long total = toLong(stats.get("total"));
        long occupied = toLong(stats.get("occupied"));
        long repair = toLong(stats.get("repair"));
        vo.setTotalEquipments(total);
        vo.setUsingEquipments(occupied);
        vo.setRepairEquipments(repair);
        vo.setIdleEquipments(Math.max(total - occupied - repair, 0));

        // 用户与实验室统计
        vo.setTotalUsers(userService.count(new LambdaQueryWrapper<>()));
        vo.setTotalLabs(labService.count(new LambdaQueryWrapper<>()));

        // 趋势 / 分布 / 排行
        vo.setWeekTrend(reservationMapper.selectWeekTrend());
        vo.setStatusDist(reservationMapper.selectStatusDist());
        vo.setLabRank(reservationMapper.selectLabRank(5));
        vo.setTopEquipUsage(equipmentMapper.selectTopUsage(5));

        return vo;
    }

    private long toLong(Object o) {
        return o == null ? 0L : ((Number) o).longValue();
    }

    private Long countReservationByDateAndStatus(LocalDate date, ReservationStatus status) {
        LambdaQueryWrapper<Reservation> wrapper = new LambdaQueryWrapper<Reservation>()
                .eq(Reservation::getDate, date);
        if (status != null) {
            wrapper.eq(Reservation::getStatus, status);
        }
        return reservationMapper.selectCount(wrapper);
    }

    /* ==================== 系统配置 ==================== */

    /**
     * 查询全部配置
     */
    public List<SysConfig> listConfigs() {
        return list(new LambdaQueryWrapper<SysConfig>().orderByAsc(SysConfig::getId));
    }

    /**
     * 更新配置值
     */
    public void updateConfig(Long id, String value) {
        SysConfig config = getById(id);
        if (config == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "配置不存在");
        }
        if (!StringUtils.hasText(value)) {
            throw new BusinessException("配置值不能为空");
        }
        config.setConfigValue(value.trim());
        updateById(config);
    }

    /**
     * 按配置键查询配置值
     */
    public String getConfigValue(String key) {
        SysConfig config = getOne(new LambdaQueryWrapper<SysConfig>().eq(SysConfig::getConfigKey, key));
        return config == null ? null : config.getConfigValue();
    }

    /* ==================== 类别统计辅助 ==================== */

    @SuppressWarnings("unused")
    public List<Map<String, Object>> categoryEquipmentCount() {
        return equipmentMapper.selectMaps(new LambdaQueryWrapper<Equipment>()
                .select(Equipment::getCategoryId)
                .groupBy(Equipment::getCategoryId));
    }
}
