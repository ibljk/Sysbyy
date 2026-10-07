/**
 * 统计看板（管理员）
 */
(function (global) {
    const { ref, onMounted, onBeforeUnmount, nextTick } = Vue;

    // 图表配色（LOCK：量化图表统一品牌蓝同色系 tonal 变化，不引入第二种强调色；
    // 仅"预约状态"属真实状态语义，使用 muted 语义色）
    const C = {
        b200: '#B7D1EE', b400: '#5E90C6', b500: '#3D7BBE', b600: '#2E6BB8', b800: '#1C4679',
        ok: '#1F8A5F', warn: '#B07216', risk: '#C23B3B', idle: '#6B7787', muted: '#AAB3C0',
        grid: '#EDF1F7', axis: '#6B7787'
    };
    const AXIS = {
        axisLine: { lineStyle: { color: '#E2E8F1' } },
        axisLabel: { color: C.axis, fontSize: 12 },
        splitLine: { lineStyle: { color: C.grid } }
    };

    const DashboardView = {
        template: `
        <div>
          <div class="page-head">
            <div>
              <div class="page-head-title">运营概览</div>
              <div class="page-head-sub">设备占用、预约流转与实验室负载的实时汇总</div>
            </div>
          </div>

          <div class="stat-cards">
            <div class="stat-card" v-for="c in cards" :key="c.label">
              <div class="stat-icon">
                <el-icon><component :is="c.icon"/></el-icon>
              </div>
              <div>
                <div class="stat-num">{{ c.value }}</div>
                <div class="stat-label">{{ c.label }}</div>
              </div>
            </div>
          </div>

          <div class="chart-grid">
            <div class="chart-box">
              <div class="chart-title">近7日预约趋势</div>
              <div ref="trendChart" class="chart"></div>
            </div>
            <div class="chart-box">
              <div class="chart-title">预约状态分布</div>
              <div ref="statusChart" class="chart"></div>
            </div>
            <div class="chart-box">
              <div class="chart-title">实验室预约量排行 TOP5</div>
              <div ref="labChart" class="chart"></div>
            </div>
            <div class="chart-box">
              <div class="chart-title">设备使用时长 TOP5（分钟）</div>
              <div ref="usageChart" class="chart"></div>
            </div>
          </div>
        </div>`,
        setup() {
            const cards = ref([]);
            const trendChart = ref();
            const statusChart = ref();
            const labChart = ref();
            const usageChart = ref();
            let charts = [];

            const load = async () => {
                const d = await Api.get('/admin/dashboard');
                // 单一强调色：KPI 图标统一使用品牌色，不再按指标分配彩虹色
                cards.value = [
                    { label: '今日预约数', value: d.todayReservations, icon: 'Calendar' },
                    { label: '今日待审批', value: d.todayPending, icon: 'Clock' },
                    { label: '今日已通过', value: d.todayApproved, icon: 'CircleCheck' },
                    { label: '设备总台数', value: d.totalEquipments, icon: 'Cpu' },
                    { label: '空闲台数', value: d.idleEquipments, icon: 'CircleCheckFilled' },
                    { label: '使用中台数', value: d.usingEquipments, icon: 'Loading' },
                    { label: '维修中台数', value: d.repairEquipments, icon: 'WarnTriangleFilled' },
                    { label: '用户 / 实验室', value: (d.totalUsers || 0) + ' / ' + (d.totalLabs || 0), icon: 'User' }
                ];
                await nextTick();
                renderTrend(d.weekTrend || []);
                renderStatus(d.statusDist || []);
                renderLab(d.labRank || []);
                renderUsage(d.topEquipUsage || []);
            };

            const renderTrend = (data) => {
                charts.push(renderChart(trendChart.value, {
                    tooltip: { trigger: 'axis' },
                    legend: { data: ['预约总量', '已通过'], top: 0, textStyle: { color: C.axis } },
                    grid: { left: 40, right: 20, top: 40, bottom: 30 },
                    xAxis: { type: 'category', data: data.map(i => i.date), ...AXIS },
                    yAxis: { type: 'value', minInterval: 1, ...AXIS },
                    series: [
                        // 浅色柱作背景量，深色折线承载"已通过"这条主信号
                        { name: '预约总量', type: 'bar', barWidth: 18, data: data.map(i => i.count),
                          itemStyle: { color: C.b200, borderRadius: [4, 4, 0, 0] } },
                        { name: '已通过', type: 'line', smooth: true, symbolSize: 6,
                          data: data.map(i => i.approved),
                          lineStyle: { width: 2.4 }, itemStyle: { color: C.b600 } }
                    ]
                }));
            };

            const renderStatus = (data) => {
                const map = global.RESERV_STATUS_MAP;
                // 状态是真实语义（待审批/已通过/已驳回…），此处允许使用语义色
                const colors = [C.warn, C.ok, C.risk, C.idle, C.b600, C.muted];
                charts.push(renderChart(statusChart.value, {
                    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
                    legend: { bottom: 0, textStyle: { color: C.axis } },
                    series: [{
                        type: 'pie',
                        radius: ['42%', '66%'],
                        center: ['50%', '45%'],
                        itemStyle: { borderColor: '#fff', borderWidth: 2 },
                        label: { formatter: '{b}\n{d}%', color: C.axis },
                        data: data.map((i, idx) => ({
                            name: (map[i.status] && map[i.status].label) || i.status,
                            value: i.count,
                            itemStyle: { color: colors[idx % colors.length] }
                        }))
                    }]
                }));
            };

            const renderLab = (data) => {
                const names = data.map(i => i.labName).reverse();
                const values = data.map(i => i.count).reverse();
                charts.push(renderChart(labChart.value, {
                    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
                    grid: { left: 100, right: 30, top: 20, bottom: 30 },
                    xAxis: { type: 'value', minInterval: 1, ...AXIS },
                    yAxis: { type: 'category', data: names, ...AXIS },
                    series: [{
                        type: 'bar', barWidth: 16,
                        data: values,
                        itemStyle: { color: C.b600, borderRadius: [0, 4, 4, 0] },
                        label: { show: true, position: 'right', color: C.axis }
                    }]
                }));
            };

            const renderUsage = (data) => {
                const names = data.map(i => i.name).reverse();
                const values = data.map(i => i.totalMinutes || 0).reverse();
                charts.push(renderChart(usageChart.value, {
                    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
                    grid: { left: 110, right: 30, top: 20, bottom: 30 },
                    xAxis: { type: 'value', ...AXIS },
                    yAxis: { type: 'category', data: names, ...AXIS },
                    series: [{
                        type: 'bar', barWidth: 16,
                        data: values,
                        itemStyle: { color: C.b400, borderRadius: [0, 4, 4, 0] },
                        label: { show: true, position: 'right', color: C.axis }
                    }]
                }));
            };

            onMounted(load);
            onBeforeUnmount(() => charts.forEach(c => c && c.dispose()));

            return { cards, trendChart, statusChart, labChart, usageChart };
        }
    };

    global.DashboardView = DashboardView;
})(window);
