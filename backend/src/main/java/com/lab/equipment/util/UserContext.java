package com.lab.equipment.util;

import com.lab.equipment.entity.User;
import com.lab.equipment.enums.Role;

/**
 * 当前登录用户上下文（基于 ThreadLocal，请求结束后清理）
 */
public class UserContext {

    private static final ThreadLocal<User> HOLDER = new ThreadLocal<>();

    private UserContext() {
    }

    public static void set(User user) {
        HOLDER.set(user);
    }

    public static User get() {
        return HOLDER.get();
    }

    public static Long getUserId() {
        User user = HOLDER.get();
        return user == null ? null : user.getId();
    }

    public static String getUsername() {
        User user = HOLDER.get();
        return user == null ? null : user.getUsername();
    }

    public static Role getRole() {
        User user = HOLDER.get();
        return user == null ? null : user.getRole();
    }

    public static boolean isAdmin() {
        return Role.ADMIN.equals(getRole());
    }

    public static void clear() {
        HOLDER.remove();
    }
}
