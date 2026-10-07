package com.lab.equipment.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.lab.equipment.common.PageResult;
import com.lab.equipment.entity.SysLog;
import com.lab.equipment.entity.User;
import com.lab.equipment.mapper.SysLogMapper;
import com.lab.equipment.util.UserContext;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import javax.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;

/**
 * 操作日志服务
 */
@Slf4j
@Service
public class SysLogService extends ServiceImpl<SysLogMapper, SysLog> {

    /**
     * 记录操作日志（使用当前登录用户与请求 IP）
     */
    public void record(String action) {
        record(action, null, null);
    }

    /**
     * 记录操作日志，可指定详情
     */
    public void record(String action, String detail, HttpServletRequest request) {
        try {
            SysLog entity = new SysLog();
            User user = UserContext.get();
            if (user != null) {
                entity.setUserId(user.getId());
                entity.setUsername(user.getUsername());
            }
            entity.setAction(action);
            entity.setDetail(detail);
            if (request != null) {
                entity.setIp(resolveIp(request));
            }
            entity.setCreateTime(LocalDateTime.now());
            save(entity);
        } catch (Exception e) {
            // 日志记录失败不影响主流程
            log.warn("记录操作日志失败: " + e.getMessage());
        }
    }

    /**
     * 分页查询操作日志
     */
    public PageResult<SysLog> pageLogs(long current, long size, String keyword, String action) {
        LambdaQueryWrapper<SysLog> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(keyword)) {
            wrapper.and(w -> w.like(SysLog::getUsername, keyword)
                    .or().like(SysLog::getDetail, keyword));
        }
        if (StringUtils.hasText(action)) {
            wrapper.eq(SysLog::getAction, action);
        }
        wrapper.orderByDesc(SysLog::getCreateTime);
        Page<SysLog> page = page(new Page<>(current, size), wrapper);
        return PageResult.of(page);
    }

    /**
     * 查询已有的操作类型（供日志页下拉筛选）
     */
    public java.util.List<String> listActions() {
        return list(new LambdaQueryWrapper<SysLog>()
                .select(SysLog::getAction)
                .groupBy(SysLog::getAction)).stream()
                .map(SysLog::getAction)
                .filter(StringUtils::hasText)
                .sorted()
                .collect(java.util.stream.Collectors.toList());
    }

    private String resolveIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (StringUtils.hasText(ip) && !"unknown".equalsIgnoreCase(ip)) {
            return ip.split(",")[0].trim();
        }
        ip = request.getRemoteAddr();
        return "0:0:0:0:0:0:0:1".equals(ip) ? "127.0.0.1" : ip;
    }
}
