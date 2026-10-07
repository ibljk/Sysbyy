package com.lab.equipment.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.lab.equipment.entity.Announcement;
import org.apache.ibatis.annotations.Mapper;

/**
 * 系统公告 Mapper
 */
@Mapper
public interface AnnouncementMapper extends BaseMapper<Announcement> {
}
