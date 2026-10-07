package com.lab.equipment.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.lab.equipment.common.PageResult;
import com.lab.equipment.common.ResultCode;
import com.lab.equipment.entity.Announcement;
import com.lab.equipment.entity.User;
import com.lab.equipment.exception.BusinessException;
import com.lab.equipment.mapper.AnnouncementMapper;
import com.lab.equipment.util.UserContext;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;

/**
 * 系统公告服务
 */
@Service
public class AnnouncementService extends ServiceImpl<AnnouncementMapper, Announcement> {

    /**
     * 管理端分页查询（可按关键字 / 级别 / 状态筛选）
     */
    public PageResult<Announcement> pageAnnouncements(long current, long size, String keyword,
                                                      String level, String status) {
        LambdaQueryWrapper<Announcement> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(keyword)) {
            wrapper.and(w -> w.like(Announcement::getTitle, keyword)
                    .or().like(Announcement::getContent, keyword));
        }
        if (StringUtils.hasText(level)) {
            wrapper.eq(Announcement::getLevel, level);
        }
        if (StringUtils.hasText(status)) {
            wrapper.eq(Announcement::getStatus, status);
        }
        wrapper.orderByDesc(Announcement::getCreateTime);
        return PageResult.of(page(new Page<>(current, size), wrapper));
    }

    /**
     * 用户端查询已发布公告（最新在前）
     */
    public List<Announcement> listPublished(int limit) {
        return list(new LambdaQueryWrapper<Announcement>()
                .eq(Announcement::getStatus, "PUBLISHED")
                .orderByDesc(Announcement::getCreateTime)
                .last("LIMIT " + Math.max(1, Math.min(limit, 50))));
    }

    /**
     * 发布公告
     */
    public Announcement create(Announcement announcement) {
        validate(announcement);
        User user = UserContext.get();
        if (user != null) {
            announcement.setPublisherId(user.getId());
            announcement.setPublisherName(StringUtils.hasText(user.getRealName())
                    ? user.getRealName() : user.getUsername());
        }
        announcement.setId(null);
        if (!StringUtils.hasText(announcement.getLevel())) {
            announcement.setLevel("NOTICE");
        }
        announcement.setStatus("PUBLISHED");
        save(announcement);
        return announcement;
    }

    /**
     * 编辑公告
     */
    public void update(Long id, Announcement announcement) {
        Announcement exist = getById(id);
        if (exist == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "公告不存在");
        }
        validate(announcement);
        exist.setTitle(announcement.getTitle());
        exist.setContent(announcement.getContent());
        if (StringUtils.hasText(announcement.getLevel())) {
            exist.setLevel(announcement.getLevel());
        }
        updateById(exist);
    }

    /**
     * 关闭公告（用户端不再展示，管理端仍可查）
     */
    public void close(Long id) {
        Announcement exist = getById(id);
        if (exist == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "公告不存在");
        }
        exist.setStatus("CLOSED");
        updateById(exist);
    }

    /**
     * 删除公告
     */
    public void delete(Long id) {
        if (getById(id) == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "公告不存在");
        }
        removeById(id);
    }

    private void validate(Announcement announcement) {
        if (!StringUtils.hasText(announcement.getTitle())) {
            throw new BusinessException("公告标题不能为空");
        }
        if (!StringUtils.hasText(announcement.getContent())) {
            throw new BusinessException("公告内容不能为空");
        }
        if (announcement.getTitle().length() > 80) {
            throw new BusinessException("公告标题不能超过 80 字");
        }
        if (announcement.getContent().length() > 1000) {
            throw new BusinessException("公告内容不能超过 1000 字");
        }
    }
}
