/**
 * 工具方法：枚举映射、格式化、公共组件
 */
(function (global) {
    // Element Plus 全局别名（UMD 构建下 ElMessage 等挂在 ElementPlus 命名空间下）
    const EP = global.ElementPlus || {};
    global.ElMessage = EP.ElMessage;
    global.ElMessageBox = EP.ElMessageBox;
    global.ElNotification = EP.ElNotification;
    global.ElLoading = EP.ElLoading;

    // 角色映射（学生/教师统一为普通用户 USER）
    global.ROLE_MAP = {
        ADMIN: '管理员',
        USER: '用户'
    };

    // 各角色登录后的默认落地页
    global.HOME_PATH = { ADMIN: '/dashboard', USER: '/book' };

    /**
     * 设备默认占位图（无图时按类别配色生成 SVG data URL，纯本地离线）
     */
    global.makeEquipPlaceholder = function (name, categoryName) {
        const text = (name || '设备').substring(0, 10);
        const cat = categoryName || '';
        const palettes = {
            '电子测量仪器': ['#1b2a4a', '#3a6ea5'],
            '计算机设备': ['#23272e', '#56607a'],
            '机械加工设备': ['#54341a', '#a9712c'],
            '化学实验设备': ['#14432a', '#2e8b57']
        };
        const key = Object.keys(palettes).find(k => cat.includes(k));
        const [c1, c2] = (key ? palettes[key] : ['#1C4679', '#5E90C6']);
        const esc = String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;');
        const svg =
            `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">` +
            `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
            `<stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>` +
            `</linearGradient></defs>` +
            `<rect width="640" height="400" fill="url(#g)"/>` +
            `<circle cx="486" cy="80" r="130" fill="#ffffff" fill-opacity="0.06"/>` +
            `<circle cx="320" cy="168" r="72" fill="#ffffff" fill-opacity="0.18"/>` +
            `<text x="320" y="216" font-size="76" text-anchor="middle" fill="#ffffff" fill-opacity="0.92" font-family="PingFang SC, Microsoft YaHei, sans-serif">${esc.charAt(0)}</text>` +
            `<text x="34" y="348" font-size="34" font-weight="600" fill="#ffffff" font-family="PingFang SC, Microsoft YaHei, sans-serif">${esc}</text>` +
            `<text x="34" y="46" font-size="15" letter-spacing="4" fill="#ffffff" fill-opacity="0.7" font-family="PingFang SC, Microsoft YaHei, sans-serif">智云实验设备</text>` +
            `</svg>`;
        return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
    };

    /**
     * 设备图片展示：有图用原图，无图用占位图
     */
    global.equipImg = function (row) {
        if (row && row.image) return row.image;
        return global.makeEquipPlaceholder(row && row.name, row && row.categoryName);
    };

    // 设备维护状态映射（REPAIR=维修停用；IDLE/USING 为历史兼容，占用按预约实时统计）
    global.EQUIP_STATUS_MAP = {
        IDLE: { label: '空闲', type: 'success' },
        USING: { label: '使用中', type: 'warning' },
        REPAIR: { label: '维修中', type: 'danger' }
    };

    /**
     * 设备实时状态标签：结合维护状态 + 总台数(stock) + 当前占用(occupiedNow) 推导
     * 返回 { text, type }，供卡片角标、表格状态列、详情统一展示
     */
    global.equipStockLabel = function (row) {
        if (!row) return { text: '-', type: 'info' };
        if (row.status === 'REPAIR') return { text: '维修中', type: 'danger' };
        const stock = Number(row.stock) || 1;
        const occ = Number(row.occupiedNow) || 0;
        const avail = stock - occ;
        if (avail <= 0) return { text: `已约满 ${occ}/${stock}`, type: 'warning' };
        if (occ > 0) return { text: `空闲 ${avail}/${stock}`, type: 'primary' };
        return stock > 1 ? { text: `空闲 ${stock} 台`, type: 'success' } : { text: '空闲', type: 'success' };
    };

    // 设备状态筛选档位（全部 / 正常(非维修) / 维修中）
    global.EQUIP_FILTERS = [
        { label: '全部', value: '' },
        { label: '正常', value: 'NORMAL' },
        { label: '维修中', value: 'REPAIR' }
    ];

    // 预约状态映射
    global.RESERV_STATUS_MAP = {
        PENDING: { label: '待审批', type: 'warning' },
        APPROVED: { label: '已通过', type: 'success' },
        REJECTED: { label: '已驳回', type: 'danger' },
        CANCELLED: { label: '已取消', type: 'info' },
        COMPLETED: { label: '已完成', type: 'primary' },
        EXPIRED: { label: '已过期', type: 'info' }
    };

    /**
     * 状态标签组件
     */
    global.StatusTag = {
        props: {
            map: { type: Object, required: true },
            value: { type: String, default: '' }
        },
        template: `<el-tag :type="(map[value] && map[value].type) || 'info'" size="small">
                     {{ (map[value] && map[value].label) || value || '-' }}
                   </el-tag>`
    };

    /**
     * 表格分页组件（统一封装 el-pagination）
     */
    global.Pager = {
        props: {
            total: { type: Number, default: 0 },
            page: { type: Number, default: 1 },
            size: { type: Number, default: 10 }
        },
        emits: ['change'],
        template: `<div class="pager">
                     <el-pagination background layout="total, prev, pager, next, sizes"
                                    :total="total" :current-page="page" :page-size="size"
                                    :page-sizes="[10, 20, 50]"
                                    @current-change="(p) => $emit('change', p, size)"
                                    @size-change="(s) => $emit('change', 1, s)"/>
                   </div>`
    };

    /**
     * 格式化：日期时间
     */
    global.fmtDateTime = function (v) {
        return v ? String(v).replace('T', ' ').substring(0, 19) : '-';
    };

    /**
     * 格式化：日期
     */
    global.fmtDate = function (v) {
        return v ? String(v).substring(0, 10) : '-';
    };

    /**
     * 格式化：时间 HH:mm
     */
    global.fmtTime = function (v) {
        if (!v) return '-';
        return String(v).substring(0, 5);
    };

    /**
     * 预约时段展示：单日 "9-08 09:00~12:00"；跨天 "9-08 09:00 ~ 9-20 18:00"
     */
    global.fmtRange = function (row) {
        if (!row) return '-';
        const d = global.fmtDate(row.date);
        const ed = row.endDate ? global.fmtDate(row.endDate) : d;
        const s = global.fmtTime(row.startTime);
        const e = global.fmtTime(row.endTime);
        if (ed === d) return d + ' ' + s + '~' + e;
        return d + ' ' + s + ' ~ ' + ed + ' ' + e;
    };

    /**
     * 生成 echarts 图表
     */
    global.renderChart = function (el, option) {
        const chart = echarts.init(el);
        chart.setOption(option);
        // 监听窗口变化自适应
        window.addEventListener('resize', () => chart.resize());
        return chart;
    };
})(window);
