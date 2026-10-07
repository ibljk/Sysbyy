package com.lab.equipment.controller;

import com.lab.equipment.annotation.OperationLog;
import com.lab.equipment.annotation.RequireRole;
import com.lab.equipment.common.PageResult;
import com.lab.equipment.common.Result;
import com.lab.equipment.entity.Announcement;
import com.lab.equipment.enums.Role;
import com.lab.equipment.service.AnnouncementService;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import javax.validation.constraints.Min;
import java.util.List;

/**
 * 系统公告接口
 */
@Validated
@RestController
@RequestMapping("/api/announcement")
public class AnnouncementController {

    private final AnnouncementService announcementService;

    public AnnouncementController(AnnouncementService announcementService) {
        this.announcementService = announcementService;
    }

    /**
     * 已发布公告列表（用户端：公告列表页）
     */
    @GetMapping("/list")
    public Result<List<Announcement>> list(@RequestParam(defaultValue = "20") int limit) {
        return Result.success(announcementService.listPublished(limit));
    }

    /**
     * 最新公告（用于首页顶部横幅）
     */
    @GetMapping("/banner")
    public Result<List<Announcement>> banner() {
        return Result.success(announcementService.listPublished(3));
    }

    /**
     * 分页查询全部公告（管理端）
     */
    @RequireRole(Role.ADMIN)
    @GetMapping("/page")
    public Result<PageResult<Announcement>> page(@RequestParam(defaultValue = "1") @Min(1) long current,
                                                 @RequestParam(defaultValue = "10") long size,
                                                 @RequestParam(required = false) String keyword,
                                                 @RequestParam(required = false) String level,
                                                 @RequestParam(required = false) String status) {
        return Result.success(announcementService.pageAnnouncements(current, size, keyword, level, status));
    }

    /**
     * 发布公告
     */
    @RequireRole(Role.ADMIN)
    @OperationLog("发布公告")
    @PostMapping
    public Result<Announcement> create(@RequestBody Announcement announcement) {
        return Result.success("发布成功", announcementService.create(announcement));
    }

    /**
     * 编辑公告
     */
    @RequireRole(Role.ADMIN)
    @OperationLog("编辑公告")
    @PutMapping("/{id}")
    public Result<Void> update(@PathVariable Long id, @RequestBody Announcement announcement) {
        announcementService.update(id, announcement);
        return Result.success();
    }

    /**
     * 关闭公告（用户端不再展示）
     */
    @RequireRole(Role.ADMIN)
    @OperationLog("关闭公告")
    @PostMapping("/{id}/close")
    public Result<Void> close(@PathVariable Long id) {
        announcementService.close(id);
        return Result.success();
    }

    /**
     * 删除公告
     */
    @RequireRole(Role.ADMIN)
    @OperationLog("删除公告")
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        announcementService.delete(id);
        return Result.success();
    }
}
