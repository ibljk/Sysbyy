package com.lab.equipment.common;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * 统一返回状态码
 */
@Getter
@AllArgsConstructor
public enum ResultCode {

    SUCCESS(200, "操作成功"),
    BAD_REQUEST(400, "请求参数错误"),
    UNAUTHORIZED(401, "未登录或登录已过期"),
    FORBIDDEN(403, "没有操作权限"),
    NOT_FOUND(404, "资源不存在"),
    ERROR(500, "系统繁忙，请稍后重试");

    private final Integer code;
    private final String message;
}
