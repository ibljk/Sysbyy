package com.lab.equipment.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.lab.equipment.common.PageResult;
import com.lab.equipment.common.ResultCode;
import com.lab.equipment.entity.Equipment;
import com.lab.equipment.entity.Qualification;
import com.lab.equipment.entity.User;
import com.lab.equipment.exception.BusinessException;
import com.lab.equipment.mapper.EquipmentMapper;
import com.lab.equipment.mapper.QualificationMapper;
import com.lab.equipment.mapper.UserMapper;
import com.lab.equipment.util.UserContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 设备操作资质服务（准入控制）：
 * 设备标记"需要资质"后，仅持有效资质的用户可发起预约
 */
@Service
public class QualificationService extends ServiceImpl<QualificationMapper, Qualification> {

    private final EquipmentMapper equipmentMapper;
    private final UserMapper userMapper;

    public QualificationService(EquipmentMapper equipmentMapper, UserMapper userMapper) {
        this.equipmentMapper = equipmentMapper;
        this.userMapper = userMapper;
    }

    /**
     * 管理端分页查询已授予资质
     */
    public PageResult<Qualification> pageQualifications(long current, long size, String keyword,
                                                       String status, Long equipmentId) {
        LambdaQueryWrapper<Qualification> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(status)) {
            wrapper.eq(Qualification::getStatus, status);
        }
        if (equipmentId != null) {
            wrapper.eq(Qualification::getEquipmentId, equipmentId);
        }
        // 关键字命中持证人（先查出用户ID集合，再过滤）
        if (StringUtils.hasText(keyword)) {
            List<User> users = userMapper.selectList(new LambdaQueryWrapper<User>()
                    .like(User::getUsername, keyword).or().like(User::getRealName, keyword));
            Set<Long> userIds = users.stream().map(User::getId).collect(Collectors.toSet());
            if (userIds.isEmpty()) {
                return PageResult.of(new Page<>(current, size));
            }
            wrapper.in(Qualification::getUserId, userIds);
        }
        wrapper.orderByDesc(Qualification::getCreateTime);
        Page<Qualification> page = page(new Page<>(current, size), wrapper);
        enrich(page.getRecords());
        return PageResult.of(page);
    }

    /**
     * 授予资质（同一设备同一用户重复授予则刷新有效期，不产生重复记录）
     */
    @Transactional(rollbackFor = Exception.class)
    public Qualification grant(Qualification qualification) {
        if (qualification.getEquipmentId() == null) {
            throw new BusinessException("请选择资质对应的设备");
        }
        if (qualification.getUserId() == null) {
            throw new BusinessException("请选择持证人");
        }
        if (equipmentMapper.selectById(qualification.getEquipmentId()) == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "设备不存在");
        }
        if (userMapper.selectById(qualification.getUserId()) == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "用户不存在");
        }
        if (qualification.getTrainingDate() != null && qualification.getValidUntil() != null
                && qualification.getValidUntil().isBefore(qualification.getTrainingDate())) {
            throw new BusinessException("有效期不能早于培训日期");
        }

        Qualification exist = getOne(new LambdaQueryWrapper<Qualification>()
                .eq(Qualification::getEquipmentId, qualification.getEquipmentId())
                .eq(Qualification::getUserId, qualification.getUserId())
                .last("LIMIT 1"));
        if (exist != null) {
            exist.setTrainingDate(qualification.getTrainingDate());
            exist.setValidUntil(qualification.getValidUntil());
            exist.setRemark(qualification.getRemark());
            exist.setStatus("VALID");
            exist.setGrantorId(UserContext.getUserId());
            updateById(exist);
            enrich(java.util.Collections.singletonList(exist));
            return exist;
        }
        qualification.setId(null);
        qualification.setStatus("VALID");
        qualification.setGrantorId(UserContext.getUserId());
        save(qualification);
        enrich(java.util.Collections.singletonList(qualification));
        return qualification;
    }

    /**
     * 撤销资质
     */
    public void revoke(Long id) {
        Qualification exist = getById(id);
        if (exist == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "资质记录不存在");
        }
        if ("REVOKED".equals(exist.getStatus())) {
            throw new BusinessException("该资质已撤销");
        }
        exist.setStatus("REVOKED");
        updateById(exist);
    }

    /**
     * 查询某用户的全部资质（用户端"我的资质"）
     */
    public List<Qualification> listByUser(Long userId) {
        List<Qualification> list = list(new LambdaQueryWrapper<Qualification>()
                .eq(Qualification::getUserId, userId)
                .orderByDesc(Qualification::getCreateTime));
        enrich(list);
        return list;
    }

    /**
     * 判断用户是否持有该设备的有效资质（供预约校验调用）
     */
    public boolean hasValidQualification(Long equipmentId, Long userId) {
        if (equipmentId == null || userId == null) {
            return false;
        }
        List<Qualification> list = list(new LambdaQueryWrapper<Qualification>()
                .eq(Qualification::getEquipmentId, equipmentId)
                .eq(Qualification::getUserId, userId)
                .eq(Qualification::getStatus, "VALID"));
        LocalDate today = LocalDate.now();
        return list.stream().anyMatch(q -> q.getValidUntil() == null || !q.getValidUntil().isBefore(today));
    }

    /**
     * 查询用户持有有效资质的设备ID集合（前端标记哪些设备可约）
     */
    public Set<Long> validEquipmentIds(Long userId) {
        if (userId == null) {
            return new HashSet<>();
        }
        LocalDate today = LocalDate.now();
        return list(new LambdaQueryWrapper<Qualification>()
                .eq(Qualification::getUserId, userId)
                .eq(Qualification::getStatus, "VALID")).stream()
                .filter(q -> q.getValidUntil() == null || !q.getValidUntil().isBefore(today))
                .map(Qualification::getEquipmentId)
                .collect(Collectors.toSet());
    }

    /**
     * 补充设备与用户展示信息、计算是否过期
     */
    private void enrich(List<Qualification> records) {
        if (records == null || records.isEmpty()) {
            return;
        }
        Set<Long> eqIds = records.stream().map(Qualification::getEquipmentId)
                .filter(Objects::nonNull).collect(Collectors.toSet());
        Map<Long, Equipment> eqMap = eqIds.isEmpty() ? java.util.Collections.emptyMap()
                : equipmentMapper.selectBatchIds(eqIds).stream()
                .collect(Collectors.toMap(Equipment::getId, Function.identity()));

        Collection<Long> userIds = records.stream().map(Qualification::getUserId)
                .filter(Objects::nonNull).collect(Collectors.toSet());
        Map<Long, User> userMap = userIds.isEmpty() ? java.util.Collections.emptyMap()
                : userMapper.selectBatchIds(userIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));

        LocalDate today = LocalDate.now();
        for (Qualification q : records) {
            Equipment e = eqMap.get(q.getEquipmentId());
            if (e != null) {
                q.setEquipmentName(e.getName());
                q.setEquipmentCode(e.getCode());
            }
            User u = userMap.get(q.getUserId());
            if (u != null) {
                q.setUsername(u.getUsername());
                q.setRealName(u.getRealName());
            }
            q.setExpired(q.getValidUntil() != null && q.getValidUntil().isBefore(today));
        }
    }
}
