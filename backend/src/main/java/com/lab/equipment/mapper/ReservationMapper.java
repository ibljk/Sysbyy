package com.lab.equipment.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.lab.equipment.entity.Reservation;
import com.lab.equipment.vo.ReservationVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * 设备预约 Mapper
 */
@Mapper
public interface ReservationMapper extends BaseMapper<Reservation> {

    /**
     * 分页查询预约列表（关联用户、设备、实验室），支持多种过滤条件
     */
    IPage<ReservationVO> selectVOPage(Page<ReservationVO> page,
                                      @Param("userId") Long userId,
                                      @Param("status") String status,
                                      @Param("keyword") String keyword,
                                      @Param("dateFrom") LocalDate dateFrom,
                                      @Param("dateTo") LocalDate dateTo);

    /**
     * 统计同一设备上与 [start, end) 时间区间存在重叠的未完成预约数量
     * （跨天连续预约兼容；仅统计 PENDING / APPROVED）
     */
    Long countConflict(@Param("equipmentId") Long equipmentId,
                       @Param("start") LocalDateTime start,
                       @Param("end") LocalDateTime end);

    /**
     * 查询单条预约详情（关联用户、设备、实验室）
     */
    ReservationVO selectVOById(@Param("id") Long id);

    /**
     * 统计设备当前是否存在进行中（已通过且未结束）的预约，用于设备状态回刷
     */
    Long countActiveApproved(@Param("equipmentId") Long equipmentId);

    /**
     * 近7日预约趋势
     */
    List<Map<String, Object>> selectWeekTrend();

    /**
     * 预约状态分布
     */
    List<Map<String, Object>> selectStatusDist();

    /**
     * 实验室预约量排行
     */
    List<Map<String, Object>> selectLabRank(@Param("limit") int limit);
}
