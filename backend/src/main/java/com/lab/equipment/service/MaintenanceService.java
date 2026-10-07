package com.lab.equipment.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.lab.equipment.common.PageResult;
import com.lab.equipment.common.ResultCode;
import com.lab.equipment.entity.Equipment;
import com.lab.equipment.entity.MaintenanceWindow;
import com.lab.equipment.entity.Reservation;
import com.lab.equipment.exception.BusinessException;
import com.lab.equipment.mapper.EquipmentMapper;
import com.lab.equipment.mapper.MaintenanceWindowMapper;
import com.lab.equipment.mapper.ReservationMapper;
import com.lab.equipment.util.UserContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 设备维护窗口服务：
 * - 维护窗口代表一段"设备停机"时间，窗口内设备不可被预约
 * - 创建时若与已有预约（待审批/已通过）冲突则拒绝，保证数据一致
 * - 状态按时间自动流转：计划 → 执行中 → 已完成（进入查询时惰性刷新）
 */
@Service
public class MaintenanceService extends ServiceImpl<MaintenanceWindowMapper, MaintenanceWindow> {

    private final EquipmentMapper equipmentMapper;
    private final ReservationMapper reservationMapper;

    public MaintenanceService(EquipmentMapper equipmentMapper, ReservationMapper reservationMapper) {
        this.equipmentMapper = equipmentMapper;
        this.reservationMapper = reservationMapper;
    }

    /**
     * 按时间刷新窗口状态（惰性刷新，避免额外定时任务）
     */
    public void refreshStatus() {
        LocalDateTime now = LocalDateTime.now();
        update(new com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper<MaintenanceWindow>()
                .set(MaintenanceWindow::getStatus, "IN_PROGRESS")
                .eq(MaintenanceWindow::getStatus, "PLANNED")
                .le(MaintenanceWindow::getStartTime, now)
                .gt(MaintenanceWindow::getEndTime, now));
        update(new com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper<MaintenanceWindow>()
                .set(MaintenanceWindow::getStatus, "DONE")
                .eq(MaintenanceWindow::getStatus, "IN_PROGRESS")
                .le(MaintenanceWindow::getEndTime, now));
    }

    /**
     * 分页查询维护窗口
     */
    public PageResult<MaintenanceWindow> pageWindows(long current, long size, Long equipmentId, String status) {
        refreshStatus();
        LambdaQueryWrapper<MaintenanceWindow> wrapper = new LambdaQueryWrapper<>();
        if (equipmentId != null) {
            wrapper.eq(MaintenanceWindow::getEquipmentId, equipmentId);
        }
        if (StringUtils.hasText(status)) {
            wrapper.eq(MaintenanceWindow::getStatus, status);
        }
        wrapper.orderByDesc(MaintenanceWindow::getStartTime);
        Page<MaintenanceWindow> page = page(new Page<>(current, size), wrapper);
        enrich(page.getRecords());
        return PageResult.of(page);
    }

    /**
     * 创建维护窗口（与已有预约冲突则拒绝）
     */
    @Transactional(rollbackFor = Exception.class)
    public MaintenanceWindow create(MaintenanceWindow window) {
        if (window.getEquipmentId() == null) {
            throw new BusinessException("请选择需要维护的设备");
        }
        if (window.getStartTime() == null || window.getEndTime() == null) {
            throw new BusinessException("请选择维护开始与结束时间");
        }
        if (!window.getEndTime().isAfter(window.getStartTime())) {
            throw new BusinessException("维护结束时间必须晚于开始时间");
        }
        Equipment equipment = equipmentMapper.selectById(window.getEquipmentId());
        if (equipment == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "设备不存在");
        }

        // 与已有预约（待审批 / 已通过）冲突校验：直接拒绝，避免制造矛盾数据
        Long conflict = countReservationConflict(window.getEquipmentId(), window.getStartTime(), window.getEndTime(), null);
        if (conflict != null && conflict > 0) {
            throw new BusinessException("该时间段内已有 " + conflict + " 条预约（含待审批），请先调整预约或改期维护");
        }

        if (!StringUtils.hasText(window.getReasonType())) {
            window.setReasonType("ROUTINE");
        }
        window.setId(null);
        window.setStatus("PLANNED");
        window.setCreatorId(UserContext.getUserId());
        save(window);
        return window;
    }

    /**
     * 手动结束维护（提前完成）
     */
    public void complete(Long id) {
        MaintenanceWindow exist = getById(id);
        if (exist == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "维护窗口不存在");
        }
        if ("DONE".equals(exist.getStatus())) {
            throw new BusinessException("该维护窗口已完成");
        }
        exist.setStatus("DONE");
        updateById(exist);
    }

    /**
     * 删除维护窗口（仅"计划"状态可删除）
     */
    public void delete(Long id) {
        MaintenanceWindow exist = getById(id);
        if (exist == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "维护窗口不存在");
        }
        if (!"PLANNED".equals(exist.getStatus())) {
            throw new BusinessException("仅「计划」状态的维护窗口可以删除");
        }
        removeById(id);
    }

    /**
     * 判断设备在指定时段是否处于维护窗口内（供预约校验调用）
     */
    public boolean hasActiveWindow(Long equipmentId, LocalDateTime start, LocalDateTime end) {
        Long count = count(new LambdaQueryWrapper<MaintenanceWindow>()
                .eq(MaintenanceWindow::getEquipmentId, equipmentId)
                .ne(MaintenanceWindow::getStatus, "DONE")
                .lt(MaintenanceWindow::getStartTime, end)
                .gt(MaintenanceWindow::getEndTime, start));
        return count != null && count > 0;
    }

    /**
     * 统计与指定时段重叠的预约数（跨天兼容）
     */
    private Long countReservationConflict(Long equipmentId, LocalDateTime start, LocalDateTime end, Long excludeReservationId) {
        return reservationMapper.selectCount(new LambdaQueryWrapper<Reservation>()
                .eq(Reservation::getEquipmentId, equipmentId)
                .in(Reservation::getStatus, "PENDING", "APPROVED")
                .ne(excludeReservationId != null, Reservation::getId, excludeReservationId)
                .apply("CONCAT(IFNULL(end_date, date), ' ', end_time) > {0}", start)
                .apply("CONCAT(date, ' ', start_time) < {0}", end));
    }

    /**
     * 补充设备名称/编号
     */
    private void enrich(List<MaintenanceWindow> records) {
        if (records == null || records.isEmpty()) {
            return;
        }
        Set<Long> ids = records.stream().map(MaintenanceWindow::getEquipmentId)
                .filter(java.util.Objects::nonNull).collect(Collectors.toSet());
        if (ids.isEmpty()) {
            return;
        }
        Map<Long, Equipment> map = equipmentMapper.selectBatchIds(ids).stream()
                .collect(Collectors.toMap(Equipment::getId, Function.identity()));
        for (MaintenanceWindow w : records) {
            Equipment e = map.get(w.getEquipmentId());
            if (e != null) {
                w.setEquipmentName(e.getName());
                w.setEquipmentCode(e.getCode());
            }
        }
    }
}
