package com.lab.equipment.interceptor;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lab.equipment.annotation.RequireRole;
import com.lab.equipment.common.Result;
import com.lab.equipment.common.ResultCode;
import com.lab.equipment.entity.User;
import com.lab.equipment.enums.Role;
import com.lab.equipment.mapper.UserMapper;
import com.lab.equipment.util.JwtUtil;
import com.lab.equipment.util.UserContext;
import io.jsonwebtoken.Claims;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.util.Arrays;

/**
 * JWT 鉴权拦截器：
 * 1. 校验 Token 合法性，并将当前用户写入 UserContext
 * 2. 校验 @RequireRole 角色权限
 * 3. 拦截被禁用（status=0）的用户
 */
@Slf4j
@Component
public class JwtInterceptor implements HandlerInterceptor {

    private final JwtUtil jwtUtil;
    private final UserMapper userMapper;
    private final ObjectMapper objectMapper;

    @Value("${jwt.header}")
    private String header;

    @Value("${jwt.prefix}")
    private String prefix;

    public JwtInterceptor(JwtUtil jwtUtil, UserMapper userMapper, ObjectMapper objectMapper) {
        this.jwtUtil = jwtUtil;
        this.userMapper = userMapper;
        this.objectMapper = objectMapper;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        // 跨域预检请求直接放行
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        // 非 Controller 方法（如静态资源）放行
        if (!(handler instanceof HandlerMethod)) {
            return true;
        }

        String token = request.getHeader(header);
        if (!StringUtils.hasText(token) || !token.startsWith(prefix)) {
            return reject(response, ResultCode.UNAUTHORIZED, "请先登录");
        }

        Claims claims;
        try {
            claims = jwtUtil.parseToken(token.substring(prefix.length()));
        } catch (Exception e) {
            return reject(response, ResultCode.UNAUTHORIZED, "登录已过期，请重新登录");
        }

        Long userId = jwtUtil.getUserId(claims);
        User user = userMapper.selectById(userId);
        // 用户被删除或禁用
        if (user == null || Integer.valueOf(0).equals(user.getStatus())) {
            return reject(response, ResultCode.UNAUTHORIZED, "账号不存在或已被禁用");
        }

        // 写入当前用户上下文
        UserContext.set(user);

        // 角色权限校验
        HandlerMethod handlerMethod = (HandlerMethod) handler;
        RequireRole requireRole = handlerMethod.getMethodAnnotation(RequireRole.class);
        if (requireRole == null) {
            requireRole = handlerMethod.getBeanType().getAnnotation(RequireRole.class);
        }
        if (requireRole != null) {
            Role current = user.getRole();
            boolean allowed = Arrays.asList(requireRole.value()).contains(current);
            if (!allowed) {
                return reject(response, ResultCode.FORBIDDEN, "没有操作权限");
            }
        }
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        // 请求结束清理 ThreadLocal，避免内存泄漏
        UserContext.clear();
    }

    private boolean reject(HttpServletResponse response, ResultCode code, String message) throws Exception {
        response.setStatus(code.getCode());
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write(objectMapper.writeValueAsString(Result.error(code, message)));
        return false;
    }
}
