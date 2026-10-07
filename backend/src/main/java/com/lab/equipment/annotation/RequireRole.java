package com.lab.equipment.annotation;

import com.lab.equipment.enums.Role;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 角色权限注解：标注在 Controller 方法上，
 * 仅允许指定角色访问（由 JwtInterceptor 校验）
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface RequireRole {

    /** 允许访问的角色列表 */
    Role[] value() default {Role.ADMIN};
}
