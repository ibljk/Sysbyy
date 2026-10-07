package com.lab.equipment.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.lab.equipment.entity.RepairTicket;
import org.apache.ibatis.annotations.Mapper;

/**
 * 设备报修工单 Mapper
 */
@Mapper
public interface RepairTicketMapper extends BaseMapper<RepairTicket> {
}
