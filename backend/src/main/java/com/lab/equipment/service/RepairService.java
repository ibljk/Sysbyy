package com.lab.equipment.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.lab.equipment.common.PageResult;
import com.lab.equipment.common.ResultCode;
import com.lab.equipment.entity.Equipment;
import com.lab.equipment.entity.RepairTicket;
import com.lab.equipment.entity.User;
import com.lab.equipment.exception.BusinessException;
import com.lab.equipment.mapper.EquipmentMapper;
import com.lab.equipment.mapper.RepairTicketMapper;
import com.lab.equipment.mapper.UserMapper;
import com.lab.equipment.util.UserContext;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 设备报修工单服务：用户报修 → 管理员受理（处理中）→ 完成
 */
@Service
public class RepairService extends ServiceImpl<RepairTicketMapper, RepairTicket> {

    private final EquipmentMapper equipmentMapper;
    private final UserMapper userMapper;

    public RepairService(EquipmentMapper equipmentMapper, UserMapper userMapper) {
        this.equipmentMapper = equipmentMapper;
        this.userMapper = userMapper;
    }

    /**
     * 提交报修（用户端）
     */
    public RepairTicket create(RepairTicket ticket) {
        if (ticket.getEquipmentId() == null) {
            throw new BusinessException("请选择需要报修的设备");
        }
        if (!StringUtils.hasText(ticket.getFaultDesc())) {
            throw new BusinessException("请填写故障描述");
        }
        if (ticket.getFaultDesc().length() > 500) {
            throw new BusinessException("故障描述不能超过 500 字");
        }
        Equipment equipment = equipmentMapper.selectById(ticket.getEquipmentId());
        if (equipment == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "设备不存在");
        }
        User user = UserContext.get();
        ticket.setId(null);
        ticket.setStatus("PENDING");
        ticket.setReporterId(UserContext.getUserId());
        if (user != null) {
            ticket.setReporterName(StringUtils.hasText(user.getRealName())
                    ? user.getRealName() : user.getUsername());
        }
        ticket.setHandlerId(null);
        ticket.setHandleRemark(null);
        ticket.setHandleTime(null);
        save(ticket);
        return ticket;
    }

    /**
     * 我的报修（用户端）
     */
    public PageResult<RepairTicket> pageMine(long current, long size, String status) {
        LambdaQueryWrapper<RepairTicket> wrapper = new LambdaQueryWrapper<RepairTicket>()
                .eq(RepairTicket::getReporterId, UserContext.getUserId());
        if (StringUtils.hasText(status)) {
            wrapper.eq(RepairTicket::getStatus, status);
        }
        wrapper.orderByDesc(RepairTicket::getCreateTime);
        Page<RepairTicket> page = page(new Page<>(current, size), wrapper);
        enrich(page.getRecords());
        return PageResult.of(page);
    }

    /**
     * 全部报修工单（管理端，可按状态 / 设备筛选）
     */
    public PageResult<RepairTicket> pageAll(long current, long size, String status, Long equipmentId) {
        LambdaQueryWrapper<RepairTicket> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(status)) {
            wrapper.eq(RepairTicket::getStatus, status);
        }
        if (equipmentId != null) {
            wrapper.eq(RepairTicket::getEquipmentId, equipmentId);
        }
        wrapper.orderByDesc(RepairTicket::getCreateTime);
        Page<RepairTicket> page = page(new Page<>(current, size), wrapper);
        enrich(page.getRecords());
        return PageResult.of(page);
    }

    /**
     * 处理工单：受理（PROCESSING）/ 完成（DONE）
     */
    public void handle(Long id, String status, String remark) {
        RepairTicket exist = getById(id);
        if (exist == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "工单不存在");
        }
        if (!"PROCESSING".equals(status) && !"DONE".equals(status)) {
            throw new BusinessException("处理状态仅支持「处理中」或「已完成」");
        }
        if ("DONE".equals(exist.getStatus())) {
            throw new BusinessException("该工单已完成，无需重复处理");
        }
        exist.setStatus(status);
        if (StringUtils.hasText(remark)) {
            exist.setHandleRemark(remark);
        }
        exist.setHandlerId(UserContext.getUserId());
        if ("DONE".equals(status)) {
            exist.setHandleTime(LocalDateTime.now());
        }
        updateById(exist);
    }

    /**
     * 补充设备与处理人展示信息
     */
    private void enrich(List<RepairTicket> records) {
        if (records == null || records.isEmpty()) {
            return;
        }
        Set<Long> eqIds = records.stream().map(RepairTicket::getEquipmentId)
                .filter(Objects::nonNull).collect(Collectors.toSet());
        Map<Long, Equipment> eqMap = eqIds.isEmpty() ? java.util.Collections.emptyMap()
                : equipmentMapper.selectBatchIds(eqIds).stream()
                .collect(Collectors.toMap(Equipment::getId, Function.identity()));

        Collection<Long> handlerIds = records.stream().map(RepairTicket::getHandlerId)
                .filter(Objects::nonNull).collect(Collectors.toSet());
        Map<Long, User> userMap = handlerIds.isEmpty() ? java.util.Collections.emptyMap()
                : userMapper.selectBatchIds(handlerIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));

        for (RepairTicket t : records) {
            Equipment e = eqMap.get(t.getEquipmentId());
            if (e != null) {
                t.setEquipmentName(e.getName());
                t.setEquipmentCode(e.getCode());
            }
            User u = userMap.get(t.getHandlerId());
            if (u != null) {
                t.setHandlerName(StringUtils.hasText(u.getRealName()) ? u.getRealName() : u.getUsername());
            }
        }
    }
}
