package com.lab.equipment.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.lab.equipment.common.PageResult;
import com.lab.equipment.common.ResultCode;
import com.lab.equipment.dto.ApprovalRequest;
import com.lab.equipment.dto.ReservationRequest;
import com.lab.equipment.entity.Equipment;
import com.lab.equipment.entity.Lab;
import com.lab.equipment.entity.Reservation;
import com.lab.equipment.enums.EquipmentStatus;
import com.lab.equipment.enums.ReservationStatus;
import com.lab.equipment.exception.BusinessException;
import com.lab.equipment.mapper.EquipmentMapper;
import com.lab.equipment.mapper.LabMapper;
import com.lab.equipment.mapper.ReservationMapper;
import com.lab.equipment.mapper.SysConfigMapper;
import com.lab.equipment.util.UserContext;
import com.lab.equipment.vo.ReservationVO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * 预约服务（系统核心）：
 * - 预约申请：悲观锁 + 时间冲突校验
 * - 审批：通过 / 驳回
 * - 取消 / 完成
 * - 定时任务：逾期预约自动完成 / 过期自动取消
 */
@Slf4j
@Service
public class ReservationService extends ServiceImpl<ReservationMapper, Reservation> {

    private final EquipmentMapper equipmentMapper;
    private final LabMapper labMapper;
    private final SysConfigMapper sysConfigMapper;
    private final SysLogService sysLogService;
    /** 维护窗口校验（设备停机期间不可预约） */
    private final MaintenanceService maintenanceService;
    /** 资质准入校验（需持证的设备） */
    private final QualificationService qualificationService;

    public ReservationService(EquipmentMapper equipmentMapper, LabMapper labMapper,
                              SysConfigMapper sysConfigMapper, SysLogService sysLogService,
                              MaintenanceService maintenanceService,
                              QualificationService qualificationService) {
        this.equipmentMapper = equipmentMapper;
        this.labMapper = labMapper;
        this.sysConfigMapper = sysConfigMapper;
        this.sysLogService = sysLogService;
        this.maintenanceService = maintenanceService;
        this.qualificationService = qualificationService;
    }

    /* ==================== 预约申请 ==================== */

    /**
     * 发起预约申请（核心业务：并发安全的冲突校验）
     */
    @Transactional(rollbackFor = Exception.class)
    public Long createReservation(ReservationRequest request) {
        Long userId = UserContext.getUserId();

        // 1. 基础参数校验（支持跨天连续预约：开始日期~结束日期）
        LocalDate date = request.getDate();
        LocalDate endDate = request.getEndDate() != null ? request.getEndDate() : date; // 单日预约默认同日
        LocalTime start = request.getStartTime();
        LocalTime end = request.getEndTime();
        if (endDate.isBefore(date)) {
            throw new BusinessException("结束日期不能早于开始日期");
        }
        if (date.equals(endDate) && !start.isBefore(end)) {
            throw new BusinessException("开始时间必须早于结束时间");
        }
        LocalDateTime startDt = date.atTime(start);
        LocalDateTime endDt = endDate.atTime(end);
        long minutes = Duration.between(startDt, endDt).toMinutes();
        long spanDays = ChronoUnit.DAYS.between(date, endDate) + 1;
        long maxDaysAhead = getConfigLong("reservation_max_days_ahead", 30L);
        if (date.isAfter(LocalDate.now().plusDays(maxDaysAhead))) {
            throw new BusinessException("最多只能提前 " + maxDaysAhead + " 天预约");
        }

        // 2. 悲观锁锁定设备行，保证并发预约时冲突校验的原子性
        Equipment equipment = equipmentMapper.selectByIdForUpdate(request.getEquipmentId());
        if (equipment == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "设备不存在");
        }
        if (equipment.getStatus() == EquipmentStatus.REPAIR) {
            throw new BusinessException("该设备正在维修中，暂不可预约");
        }

        // 3. 仪器级预约规则校验：设备单独配置优先，未配置则沿用全局配置
        long minMinutes = equipment.getMinMinutes() != null
                ? equipment.getMinMinutes() : getConfigLong("reservation_min_minutes", 30L);
        long maxDurationDays = equipment.getMaxDays() != null
                ? equipment.getMaxDays() : getConfigLong("reservation_max_duration_days", 30L);
        if (minutes < minMinutes) {
            throw new BusinessException("该设备单次预约不能少于 " + minMinutes + " 分钟");
        }
        if (spanDays > maxDurationDays) {
            throw new BusinessException("该设备单次预约最长不超过 " + maxDurationDays
                    + " 天（含首尾），请缩短预约区间");
        }
        if (equipment.getAllowCrossDay() != null && equipment.getAllowCrossDay() == 0 && !date.equals(endDate)) {
            throw new BusinessException("该设备不支持跨天预约，请将预约控制在同一天内");
        }

        // 4. 维护窗口校验：设备处于维护停机安排（计划/执行中）时不可预约
        if (maintenanceService.hasActiveWindow(equipment.getId(), startDt, endDt)) {
            throw new BusinessException("该设备在所选时段处于维护停机安排中，请更换时间");
        }

        // 5. 资质准入校验：设备要求操作资质的，需持有效资质方可预约
        if (equipment.getNeedQualification() != null && equipment.getNeedQualification() == 1
                && !qualificationService.hasValidQualification(equipment.getId(), userId)) {
            throw new BusinessException("该设备需持证操作，您暂无有效资质，请联系管理员参加培训");
        }

        // 6. 校验预约时间在实验室开放时间内
        Lab lab = labMapper.selectById(equipment.getLabId());
        if (lab != null && lab.getOpenStartTime() != null && lab.getOpenEndTime() != null) {
            if (start.isBefore(lab.getOpenStartTime()) || end.isAfter(lab.getOpenEndTime())) {
                throw new BusinessException("预约时间需在实验室开放时间（"
                        + lab.getOpenStartTime() + " ~ " + lab.getOpenEndTime() + "）内");
            }
        }

        // 7. 台数冲突校验：同设备同时间区间重叠占用数达到总台数（stock）即约满；
        //    每单固定占用 1 台，允许多人同时预约同一设备的不同台
        Long overlap = baseMapper.countConflict(request.getEquipmentId(), startDt, endDt);
        int stock = equipment.getStock() == null ? 1 : equipment.getStock();
        if (overlap != null && overlap >= stock) {
            throw new BusinessException("该设备在所选时段已约满（共 " + stock + " 台），请更换时间或设备");
        }

        // 8. 创建预约（同一用户可同时预约多台不同设备，仅受各设备自身库存限制）
        Reservation reservation = new Reservation();
        reservation.setUserId(userId);
        reservation.setEquipmentId(equipment.getId());
        reservation.setLabId(equipment.getLabId());
        reservation.setDate(date);
        reservation.setEndDate(endDate);
        reservation.setStartTime(start);
        reservation.setEndTime(end);
        reservation.setPurpose(request.getPurpose());
        reservation.setStatus(ReservationStatus.PENDING);
        save(reservation);
        log.info("用户 {} 发起设备 {} 的预约申请", userId, equipment.getId());
        return reservation.getId();
    }

    /* ==================== 审批 ==================== */

    /**
     * 管理员审批预约
     */
    @Transactional(rollbackFor = Exception.class)
    public void approve(Long reservationId, ApprovalRequest request) {
        Reservation reservation = getById(reservationId);
        if (reservation == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "预约记录不存在");
        }
        if (reservation.getStatus() != ReservationStatus.PENDING) {
            throw new BusinessException("该预约已处理，请勿重复操作");
        }

        // 锁定设备行，审批时同样防止并发操作
        Equipment equipment = equipmentMapper.selectByIdForUpdate(reservation.getEquipmentId());
        if (equipment == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "设备不存在");
        }

        if (Boolean.TRUE.equals(request.getApproved())) {
            if (equipment.getStatus() == EquipmentStatus.REPAIR) {
                throw new BusinessException("设备当前处于维修状态，无法通过该预约");
            }
            reservation.setStatus(ReservationStatus.APPROVED);
            reservation.setApproveComment(request.getComment());
            reservation.setApproverId(UserContext.getUserId());
            // 设备占用状态改为按预约实时统计（数量 = stock），此处不再维护 IDLE/USING 标志
            sysLogService.record("预约审批", "通过预约#" + reservationId, null);
        } else {
            reservation.setStatus(ReservationStatus.REJECTED);
            reservation.setApproveComment(StringUtils.hasText(request.getComment()) ? request.getComment() : "管理员驳回");
            reservation.setApproverId(UserContext.getUserId());
            sysLogService.record("预约审批", "驳回预约#" + reservationId, null);
        }
        updateById(reservation);
    }

    /* ==================== 取消 / 完成 ==================== */

    /**
     * 取消预约：预约人可取消本人待审批/已通过的预约；管理员可取消任意未完成预约
     */
    @Transactional(rollbackFor = Exception.class)
    public void cancel(Long reservationId) {
        Reservation reservation = getById(reservationId);
        if (reservation == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "预约记录不存在");
        }
        boolean owner = reservation.getUserId().equals(UserContext.getUserId());
        boolean admin = UserContext.isAdmin();

        if (reservation.getStatus() != ReservationStatus.PENDING
                && reservation.getStatus() != ReservationStatus.APPROVED) {
            throw new BusinessException("当前状态不可取消");
        }
        if (!owner && !admin) {
            throw new BusinessException("只能取消自己的预约");
        }
        // 已开始的预约（通过后已到开始时间）仅管理员可取消
        if (!admin && reservation.getStatus() == ReservationStatus.APPROVED && isStarted(reservation)) {
            throw new BusinessException("预约已开始，如需取消请联系管理员");
        }

        reservation.setStatus(ReservationStatus.CANCELLED);
        updateById(reservation);
        refreshEquipmentStatus(reservation.getEquipmentId());
        sysLogService.record("取消预约", "取消预约#" + reservationId, null);
    }

    /**
     * 用户归还设备：预约人拍照上传后归还（也可由管理员代办理）。
     * - 仅本人或管理员可操作，否则拒绝
     * - 仅已通过（APPROVED）的预约可归还
     * - 必须上传归还照片，照片过大记录后
     */
    @Transactional(rollbackFor = Exception.class)
    public void complete(Long reservationId, String returnImage, String returnNote) {
        Reservation reservation = getById(reservationId);
        if (reservation == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "预约记录不存在");
        }
        if (reservation.getStatus() != ReservationStatus.APPROVED) {
            throw new BusinessException("仅已通过的预约可以办理归还");
        }
        boolean owner = reservation.getUserId().equals(UserContext.getUserId());
        boolean admin = UserContext.isAdmin();
        if (!owner && !admin) {
            throw new BusinessException("只能归还自己名下的预约");
        }
        if (!StringUtils.hasText(returnImage)) {
            throw new BusinessException("请先拍摄/上传归还照片");
        }
        // base64 图片过大保护（约 3MB 字符上限）
        if (returnImage.length() > 4_000_000) {
            throw new BusinessException("归还照片过大，请压缩后重试");
        }
        reservation.setStatus(ReservationStatus.COMPLETED);
        reservation.setReturnImage(returnImage);
        reservation.setReturnNote(returnNote);
        reservation.setReturnedAt(LocalDateTime.now());
        updateById(reservation);
        refreshEquipmentStatus(reservation.getEquipmentId());
        sysLogService.record("用户归还设备", "用户归还设备：预约#" + reservationId, null);
    }

    /* ==================== 查询 ==================== */

    /**
     * 查询本人预约
     */
    public PageResult<ReservationVO> pageMyReservations(long current, long size, String status) {
        return pageReservations(current, size, UserContext.getUserId(), status, null, null, null);
    }

    /**
     * 管理员查询全部预约
     */
    public PageResult<ReservationVO> pageAllReservations(long current, long size, String status,
                                                         String keyword, LocalDate dateFrom, LocalDate dateTo) {
        return pageReservations(current, size, null, status, keyword, dateFrom, dateTo);
    }

    private PageResult<ReservationVO> pageReservations(long current, long size, Long userId,
                                                       String status, String keyword,
                                                       LocalDate dateFrom, LocalDate dateTo) {
        Page<ReservationVO> page = new Page<>(current, size);
        return PageResult.of(baseMapper.selectVOPage(page, userId, status, keyword, dateFrom, dateTo));
    }

    /**
     * 查询预约详情
     */
    public ReservationVO getReservationVO(Long id) {
        ReservationVO vo = baseMapper.selectVOById(id);
        if (vo == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "预约记录不存在");
        }
        return vo;
    }

    /* ==================== 定时任务：逾期处理 ==================== */

    /**
     * 定时任务（每分钟执行）：
     * 1. 已通过但已到结束时间的预约 → 自动完成
     * 2. 待审批但已过开始时间的预约 → 自动过期
     */
    @Scheduled(fixedDelayString = "${scheduler.overdue-interval-ms:60000}", initialDelay = 30000)
    public void handleOverdueReservations() {
        try {
            LocalDate today = LocalDate.now();
            LocalTime now = LocalTime.now();

            // 1. 到期自动完成（按结束日期/结束时刻判断，支持跨天预约）
            List<Reservation> approvedList = list(new LambdaQueryWrapper<Reservation>()
                    .eq(Reservation::getStatus, ReservationStatus.APPROVED));
            for (Reservation r : approvedList) {
                LocalDate rEndDate = r.getEndDate() != null ? r.getEndDate() : r.getDate();
                if (rEndDate.isBefore(today)
                        || (rEndDate.equals(today) && !r.getEndTime().isAfter(now))) {
                    r.setStatus(ReservationStatus.COMPLETED);
                    r.setReturnedAt(LocalDateTime.now());
                    updateById(r);
                    refreshEquipmentStatus(r.getEquipmentId());
                    sysLogService.record("逾期完成", "预约#" + r.getId() + " 到期自动完成", null);
                }
            }

            // 2. 超时未审批 → 过期
            List<Reservation> pendingList = list(new LambdaQueryWrapper<Reservation>()
                    .eq(Reservation::getStatus, ReservationStatus.PENDING));
            for (Reservation r : pendingList) {
                if (r.getDate().isBefore(today)
                        || (r.getDate().equals(today) && r.getStartTime().isBefore(now))) {
                    r.setStatus(ReservationStatus.EXPIRED);
                    updateById(r);
                    sysLogService.record("预约过期", "预约#" + r.getId() + " 超时未审批已过期", null);
                }
            }
        } catch (Exception e) {
            log.error("定时任务处理预约状态异常", e);
        }
    }

    /* ==================== 私有方法 ==================== */

    /**
     * 判断预约是否已开始
     */
    private boolean isStarted(Reservation reservation) {
        LocalDate today = LocalDate.now();
        if (reservation.getDate().isBefore(today)) {
            return true;
        }
        return reservation.getDate().equals(today) && !reservation.getStartTime().isAfter(LocalTime.now());
    }

    /**
     * 设备状态回刷：无进行中预约时恢复为空闲（不覆盖维修状态）
     */
    private void refreshEquipmentStatus(Long equipmentId) {
        Long active = baseMapper.countActiveApproved(equipmentId);
        Equipment equipment = equipmentMapper.selectById(equipmentId);
        if (equipment != null && (active == null || active == 0)
                && equipment.getStatus() == EquipmentStatus.USING) {
            equipment.setStatus(EquipmentStatus.IDLE);
            equipmentMapper.updateById(equipment);
        }
    }

    /**
     * 读取系统配置（整数），不存在时返回默认值
     */
    private long getConfigLong(String key, long defaultValue) {
        com.lab.equipment.entity.SysConfig config = sysConfigMapper.selectOne(
                new LambdaQueryWrapper<com.lab.equipment.entity.SysConfig>()
                        .eq(com.lab.equipment.entity.SysConfig::getConfigKey, key));
        if (config == null || !StringUtils.hasText(config.getConfigValue())) {
            return defaultValue;
        }
        try {
            return Long.parseLong(config.getConfigValue().trim());
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }
}
