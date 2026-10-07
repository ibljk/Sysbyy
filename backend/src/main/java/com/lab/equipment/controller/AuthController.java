package com.lab.equipment.controller;

import com.lab.equipment.common.Result;
import com.lab.equipment.dto.LoginRequest;
import com.lab.equipment.dto.RegisterRequest;
import com.lab.equipment.entity.User;
import com.lab.equipment.service.UserService;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpServletRequest;
import javax.validation.Valid;
import java.util.Map;

/**
 * 认证接口：登录、注册
 */
@Validated
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserService userService;

    public AuthController(UserService userService) {
        this.userService = userService;
    }

    /**
     * 用户登录
     */
    @PostMapping("/login")
    public Result<Map<String, Object>> login(@Valid @RequestBody LoginRequest request,
                                             HttpServletRequest httpRequest) {
        return Result.success("登录成功", userService.login(request, httpRequest));
    }

    /**
     * 用户注册（默认为学生角色）
     */
    @PostMapping("/register")
    public Result<User> register(@Valid @RequestBody RegisterRequest request) {
        return Result.success("注册成功", userService.register(request));
    }
}
