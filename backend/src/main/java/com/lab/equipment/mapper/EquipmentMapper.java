package com.lab.equipment.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.lab.equipment.entity.Equipment;
import com.lab.equipment.vo.EquipmentVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Map;

/**
 * 实验设备 Mapper
 */
@Mapper
public interface EquipmentMapper extends BaseMapper<Equipment> {

    /**
     * 悲观锁查询设备（并发预约时锁定设备行，保证冲突校验原子性）
     */
    Equipment selectByIdForUpdate(@Param("id") Long id);

    /**
     * 分页查询设备（关联类别、实验室）
     */
    IPage<EquipmentVO> selectEquipmentVOPage(Page<EquipmentVO> page,
                                             @Param("keyword") String keyword,
                                             @Param("categoryId") Long categoryId,
                                             @Param("labId") Long labId,
                                             @Param("status") String status);

    /**
     * 设备使用时长排行（按已通过预约时长统计）
     */
    List<Map<String, Object>> selectTopUsage(@Param("limit") int limit);

    /**
     * 设备台数统计：{total=总台数, repair=维修台数, occupied=当前进行中占用台数}
     */
    Map<String, Object> selectStockStats();
}
