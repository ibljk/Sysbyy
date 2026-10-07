package com.lab.equipment.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.lab.equipment.common.PageResult;
import com.lab.equipment.common.ResultCode;
import com.lab.equipment.dto.ChangePasswordRequest;
import com.lab.equipment.dto.LoginRequest;
import com.lab.equipment.dto.RegisterRequest;
import com.lab.equipment.entity.Reservation;
import com.lab.equipment.entity.User;
import com.lab.equipment.enums.ReservationStatus;
import com.lab.equipment.enums.Role;
import com.lab.equipment.exception.BusinessException;
import com.lab.equipment.mapper.ReservationMapper;
import com.lab.equipment.mapper.UserMapper;
import com.lab.equipment.util.JwtUtil;
import com.lab.equipment.util.UserContext;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import javax.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 用户服务：注册、登录、用户管理
 */
@Slf4j
@Service
public class UserService extends ServiceImpl<UserMapper, User> {

    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final SysLogService sysLogService;
    private final ReservationMapper reservationMapper;

    public UserService(PasswordEncoder passwordEncoder, JwtUtil jwtUtil,
                       SysLogService sysLogService, ReservationMapper reservationMapper) {
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.sysLogService = sysLogService;
        this.reservationMapper = reservationMapper;
    }

    /* ==================== 认证 ==================== */

    /**
     * 用户注册（默认学生角色）
     */
    public User register(RegisterRequest request) {
        checkUsernameUnique(request.getUsername(), null);

        User user = new User();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRealName(request.getRealName());
        user.setRole(Role.USER);
        user.setEmail(request.getEmail());
        user.setPhone(request.getPhone());
        user.setStatus(1);
        save(user);
        log.info("新用户注册: {}", user.getUsername());
        return user;
    }

    /**
     * 登录：校验密码，签发 JWT
     */
    public Map<String, Object> login(LoginRequest request, HttpServletRequest httpRequest) {
        User user = getOne(new LambdaQueryWrapper<User>().eq(User::getUsername, request.getUsername()));
        if (user == null || !passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BusinessException("用户名或密码错误");
        }
        if (Integer.valueOf(0).equals(user.getStatus())) {
            throw new BusinessException("账号已被禁用，请联系管理员");
        }

        String token = jwtUtil.generateToken(user.getId(), user.getUsername(), user.getRole());
        sysLogService.record("登录", "用户登录系统", httpRequest);

        Map<String, Object> result = new HashMap<>();
        result.put("token", token);
        result.put("user", user);
        return result;
    }

    /* ==================== 用户管理（管理员） ==================== */

    /**
     * 分页查询用户
     */
    public PageResult<User> pageUsers(long current, long size, String keyword, String role) {
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(keyword)) {
            wrapper.and(w -> w.like(User::getUsername, keyword)
                    .or().like(User::getRealName, keyword)
                    .or().like(User::getPhone, keyword));
        }
        if (StringUtils.hasText(role)) {
            try {
                wrapper.eq(User::getRole, Role.valueOf(role.toUpperCase()));
            } catch (IllegalArgumentException ignored) {
                // 非法角色参数，忽略
            }
        }
        wrapper.orderByDesc(User::getCreateTime);
        return PageResult.of(page(new Page<>(current, size), wrapper));
    }

    /**
     * 管理员创建用户（可指定角色）
     */
    public User createUser(RegisterRequest request) {
        checkUsernameUnique(request.getUsername(), null);

        User user = new User();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRealName(request.getRealName());
        user.setRole(parseRole(request.getRole()));
        user.setEmail(request.getEmail());
        user.setPhone(request.getPhone());
        user.setStatus(1);
        save(user);
        return user;
    }

    /**
     * 更新用户基本信息与角色
     */
    public void updateUser(Long id, User update) {
        User user = getById(id);
        if (user == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "用户不存在");
        }
        if (StringUtils.hasText(update.getRealName())) {
            user.setRealName(update.getRealName());
        }
        user.setEmail(update.getEmail());
        user.setPhone(update.getPhone());
        if (update.getRole() != null) {
            // 不允许通过接口把最后一个管理员降级，避免系统失控
            if (user.getRole() == Role.ADMIN && update.getRole() != Role.ADMIN) {
                long adminCount = count(new LambdaQueryWrapper<User>().eq(User::getRole, Role.ADMIN));
                if (adminCount <= 1) {
                    throw new BusinessException("系统至少需要保留一名管理员");
                }
            }
            user.setRole(update.getRole());
        }
        if (update.getStatus() != null) {
            if (UserContext.getUserId().equals(id) && Integer.valueOf(0).equals(update.getStatus())) {
                throw new BusinessException("不能禁用当前登录账号");
            }
            user.setStatus(update.getStatus());
        }
        updateById(user);
    }

    /**
     * 删除用户（存在未完成预约时禁止删除）
     */
    public void deleteUser(Long id) {
        if (UserContext.getUserId().equals(id)) {
            throw new BusinessException("不能删除当前登录账号");
        }
        User user = getById(id);
        if (user == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "用户不存在");
        }
        Long active = reservationMapper.selectCount(new LambdaQueryWrapper<Reservation>()
                .eq(Reservation::getUserId, id)
                .in(Reservation::getStatus, ReservationStatus.PENDING, ReservationStatus.APPROVED));
        if (active != null && active > 0) {
            throw new BusinessException("该用户存在未完成的预约，请先处理后再删除");
        }
        removeById(id);
    }

    /**
     * 修改当前用户密码
     */
    public void changePassword(ChangePasswordRequest request) {
        User user = getById(UserContext.getUserId());
        if (user == null || !passwordEncoder.matches(request.getOldPassword(), user.getPassword())) {
            throw new BusinessException("原密码错误");
        }
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        updateById(user);
    }

    /**
     * 管理员重置用户密码为 123456
     */
    public void resetPassword(Long id) {
        User user = getById(id);
        if (user == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "用户不存在");
        }
        user.setPassword(passwordEncoder.encode("123456"));
        updateById(user);
    }

    /**
     * 获取当前登录用户信息
     */
    public User getCurrentUser() {
        return getById(UserContext.getUserId());
    }

    /* ==================== 私有方法 ==================== */

    private void checkUsernameUnique(String username, Long excludeId) {
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<User>().eq(User::getUsername, username);
        if (excludeId != null) {
            wrapper.ne(User::getId, excludeId);
        }
        if (count(wrapper) > 0) {
            throw new BusinessException("用户名已存在");
        }
    }

    private Role parseRole(String role) {
        if (!StringUtils.hasText(role)) {
            return Role.USER;
        }
        switch (role.toUpperCase()) {
            case "ADMIN":
                return Role.ADMIN;
            // 兼容历史数据：教师/学生统一为用户角色
            case "USER":
            case "TEACHER":
            case "STUDENT":
                return Role.USER;
            default:
                throw new BusinessException("非法的角色类型");
        }
    }
}
