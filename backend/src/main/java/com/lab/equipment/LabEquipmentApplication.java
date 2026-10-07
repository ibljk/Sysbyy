package com.lab.equipment;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * 实验室设备预约管理系统 启动类
 *
 * @author lab
 */
@SpringBootApplication
@EnableScheduling
@MapperScan("com.lab.equipment.mapper")
public class LabEquipmentApplication {

    public static void main(String[] args) {
        SpringApplication.run(LabEquipmentApplication.class, args);
        System.out.println("========================================");
        System.out.println("  实验室设备预约管理系统启动成功");
        System.out.println("  接口地址: http://localhost:8080/api");
        System.out.println("========================================");
    }
}
