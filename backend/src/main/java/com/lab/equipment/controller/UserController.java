package com.lab.equipment.controller;

import com.lab.equipment.annotation.OperationLog;
import com.lab.equipment.annotation.RequireRole;
import com.lab.equipment.common.PageResult;
import com.lab.equipment.common.Result;
import com.lab.equipment.dto.ChangePasswordRequest;
import com.lab.equipment.dto.RegisterRequest;
import com.lab.equipment.entity.User;
import com.lab.equipment.enums.Role;
import com.lab.equipment.service.UserService;
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

import javax.validation.Valid;
import javax.validation.constraints.Min;

/**
 * 用户管理接口
 */
@Validated
@RestController
@RequestMapping("/api/user")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    /**
     * 当前登录用户信息
     */
    @GetMapping("/me")
    public Result<User> me() {
        return Result.success(userService.getCurrentUser());
    }

    /**
     * 修改当前用户密码
     */
    @OperationLog("修改密码")
    @PutMapping("/password")
    public Result<Void> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        userService.changePassword(request);
        return Result.success();
    }

    /* ==================== 管理员接口 ==================== */

    /**
     * 分页查询用户
     */
    @RequireRole(Role.ADMIN)
    @GetMapping("/page")
    public Result<PageResult<User>> page(@RequestParam(defaultValue = "1") @Min(1) long current,
                                         @RequestParam(defaultValue = "10") long size,
                                         @RequestParam(required = false) String keyword,
                                         @RequestParam(required = false) String role) {
        return Result.success(userService.pageUsers(current, size, keyword, role));
    }

    /**
     * 管理员新建用户
     */
    @RequireRole(Role.ADMIN)
    @OperationLog("新增用户")
    @PostMapping
    public Result<User> create(@Valid @RequestBody RegisterRequest request) {
        return Result.success("创建成功", userService.createUser(request));
    }

    /**
     * 更新用户（基本信息 / 角色 / 状态）
     */
    @RequireRole(Role.ADMIN)
    @OperationLog("更新用户")
    @PutMapping("/{id}")
    public Result<Void> update(@PathVariable Long id, @RequestBody User user) {
        userService.updateUser(id, user);
        return Result.success();
    }

    /**
     * 删除用户
     */
    @RequireRole(Role.ADMIN)
    @OperationLog("删除用户")
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        userService.deleteUser(id);
        return Result.success();
    }

    /**
     * 重置用户密码为 123456
     */
    @RequireRole(Role.ADMIN)
    @OperationLog("重置密码")
    @PutMapping("/{id}/reset-password")
    public Result<Void> resetPassword(@PathVariable Long id) {
        userService.resetPassword(id);
        return Result.<Void>success("密码已重置为 123456", null);
    }
}
