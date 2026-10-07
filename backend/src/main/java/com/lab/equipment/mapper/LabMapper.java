package com.lab.equipment.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.lab.equipment.entity.Lab;
import org.apache.ibatis.annotations.Mapper;

/**
 * 实验室 Mapper
 */
@Mapper
public interface LabMapper extends BaseMapper<Lab> {
}
