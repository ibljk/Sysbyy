package com.lab.equipment.aspect;

import com.lab.equipment.annotation.OperationLog;
import com.lab.equipment.service.SysLogService;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.stereotype.Component;

/**
 * 操作日志切面：拦截标注了 @OperationLog 的方法，
 * 执行成功后自动记录操作日志
 */
@Slf4j
@Aspect
@Component
public class OperationLogAspect {

    private final SysLogService sysLogService;

    public OperationLogAspect(SysLogService sysLogService) {
        this.sysLogService = sysLogService;
    }

    @Around("@annotation(com.lab.equipment.annotation.OperationLog)")
    public Object around(ProceedingJoinPoint joinPoint) throws Throwable {
        long start = System.currentTimeMillis();
        Object result;
        try {
            result = joinPoint.proceed();
            // 仅记录成功操作，失败由全局异常处理，不重复记录
            MethodSignature signature = (MethodSignature) joinPoint.getSignature();
            OperationLog annotation = signature.getMethod().getAnnotation(OperationLog.class);
            String action = annotation == null ? "" : annotation.value();
            sysLogService.record(action);
            return result;
        } finally {
            long cost = System.currentTimeMillis() - start;
            log.debug("操作耗时: {}ms", cost);
        }
    }
}
