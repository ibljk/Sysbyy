package com.lab.equipment.dto;

import lombok.Data;

import javax.validation.constraints.NotNull;
import javax.validation.constraints.Size;

/**
 * 预约审批请求
 */
@Data
public class ApprovalRequest {

    /** 是否通过 */
    @NotNull(message = "审批结果不能为空")
    private Boolean approved;

    /** 审批意见（驳回时建议填写） */
    @Size(max = 200, message = "审批意见不能超过 200 个字符")
    private String comment;
}
