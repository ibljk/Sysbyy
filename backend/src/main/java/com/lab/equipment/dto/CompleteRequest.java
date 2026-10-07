package com.lab.equipment.dto;

import lombok.Data;

/**
 * 归还设备请求：归还照片 + 归还备注
 */
@Data
public class CompleteRequest {

    /** 归还照片（图片 URL 或 base64 data URL），必填 */
    private String returnImage;

    /** 归还备注（选填） */
    private String returnNote;
}
