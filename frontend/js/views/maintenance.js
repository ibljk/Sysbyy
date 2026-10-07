/**
 * 维护与报修页（管理员）：
 * - 维护窗口：设备停机保养/校准排期，窗口内设备不可预约；创建时与已有预约冲突会被拒绝
 * - 报修工单：受理用户报修 → 处理中 → 完成
 */
(function (global) {
    const { ref, reactive, onMounted } = Vue;

    global.MAINT_REASON_MAP = {
        ROUTINE: '例行保养',
        CALIBRATION: '设备校准',
        CONSUMABLE: '耗材更换',
        SAFETY: '安全检查',
        TROUBLESHOOT: '故障排查',
        UPGRADE: '软件升级'
    };
    global.MAINT_STATUS_MAP = {
        PLANNED: { label: '计划', type: 'info' },
        IN_PROGRESS: { label: '执行中', type: 'warning' },
        DONE: { label: '已完成', type: 'success' }
    };
    global.REPAIR_STATUS_MAP = {
        PENDING: { label: '待处理', type: 'danger' },
        PROCESSING: { label: '处理中', type: 'warning' },
        DONE: { label: '已完成', type: 'success' }
    };

    const MaintenanceView = {
        template: `
        <div class="page-card">
          <el-tabs v-model="activeTab">
            <!-- ==================== 维护窗口 ==================== -->
            <el-tab-pane label="维护窗口" name="window">
              <el-alert type="info" :closable="false" show-icon style="margin-bottom:14px"
                        title="维护窗口 = 设备停机时段"
                        description="窗口内该设备不可被预约。创建时若所选时段已有预约（含待审批），系统会直接拒绝，请先与预约人协商调整。"/>

              <div class="toolbar">
                <el-select v-model="wQuery.equipmentId" placeholder="全部设备" clearable filterable style="width:210px">
                  <el-option v-for="e in equipments" :key="e.id" :label="e.code + ' ' + e.name" :value="e.id"/>
                </el-select>
                <el-select v-model="wQuery.status" placeholder="全部状态" clearable style="width:130px">
                  <el-option label="计划" value="PLANNED"/>
                  <el-option label="执行中" value="IN_PROGRESS"/>
                  <el-option label="已完成" value="DONE"/>
                </el-select>
                <el-button type="primary" @click="searchWindow">查询</el-button>
                <div style="flex:1"></div>
                <el-button type="success" @click="openWindowDialog"><el-icon><Plus/></el-icon>创建维护</el-button>
              </div>

              <el-table :data="windows" v-loading="wLoading" stripe border>
                <el-table-column label="设备" min-width="190">
                  <template #default="{row}">
                    <span class="mono-tag">{{ row.equipmentCode }}</span> {{ row.equipmentName }}
                  </template>
                </el-table-column>
                <el-table-column label="维护时段" min-width="270">
                  <template #default="{row}">{{ fmt(row.startTime) }} ~ {{ fmt(row.endTime) }}</template>
                </el-table-column>
                <el-table-column label="维护原因" width="120" align="center">
                  <template #default="{row}">
                    <el-tag effect="plain">{{ reasonOf(row.reasonType) }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="remark" label="说明" min-width="180" show-overflow-tooltip>
                  <template #default="{row}">{{ row.remark || '—' }}</template>
                </el-table-column>
                <el-table-column label="状态" width="100" align="center">
                  <template #default="{row}">
                    <el-tag :type="mStatusOf(row.status).type" effect="light">{{ mStatusOf(row.status).label }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="170" fixed="right">
                  <template #default="{row}">
                    <el-button v-if="row.status !== 'DONE'" size="small" type="primary" plain
                               @click="completeWindow(row)">结束维护</el-button>
                    <el-button v-if="row.status === 'PLANNED'" size="small" type="danger" plain
                               @click="removeWindow(row)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>
              <pager :total="wTotal" :page="wQuery.current" :size="wQuery.size"
                     @change="(p,s)=>{wQuery.current=p;wQuery.size=s;loadWindows();}"/>
            </el-tab-pane>

            <!-- ==================== 报修工单 ==================== -->
            <el-tab-pane label="报修工单" name="repair">
              <div class="toolbar">
                <el-select v-model="rQuery.status" placeholder="全部状态" clearable style="width:130px">
                  <el-option label="待处理" value="PENDING"/>
                  <el-option label="处理中" value="PROCESSING"/>
                  <el-option label="已完成" value="DONE"/>
                </el-select>
                <el-select v-model="rQuery.equipmentId" placeholder="全部设备" clearable filterable style="width:210px">
                  <el-option v-for="e in equipments" :key="e.id" :label="e.code + ' ' + e.name" :value="e.id"/>
                </el-select>
                <el-button type="primary" @click="searchRepair">查询</el-button>
                <div style="flex:1"></div>
                <el-button @click="loadRepairs"><el-icon><Refresh/></el-icon>刷新</el-button>
              </div>

              <el-table :data="repairs" v-loading="rLoading" stripe border>
                <el-table-column label="设备" min-width="180">
                  <template #default="{row}">
                    <span class="mono-tag">{{ row.equipmentCode }}</span> {{ row.equipmentName }}
                  </template>
                </el-table-column>
                <el-table-column prop="reporterName" label="报修人" width="110"/>
                <el-table-column prop="faultDesc" label="故障描述" min-width="240" show-overflow-tooltip/>
                <el-table-column label="状态" width="100" align="center">
                  <template #default="{row}">
                    <el-tag :type="rStatusOf(row.status).type" effect="light">{{ rStatusOf(row.status).label }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="处理人" width="110">
                  <template #default="{row}">{{ row.handlerName || '—' }}</template>
                </el-table-column>
                <el-table-column prop="handleRemark" label="处理说明" min-width="200" show-overflow-tooltip>
                  <template #default="{row}">{{ row.handleRemark || '—' }}</template>
                </el-table-column>
                <el-table-column label="报修时间" width="160">
                  <template #default="{row}">{{ fmt(row.createTime) }}</template>
                </el-table-column>
                <el-table-column label="操作" width="110" fixed="right">
                  <template #default="{row}">
                    <el-button v-if="row.status !== 'DONE'" size="small" type="primary"
                               @click="openHandleDialog(row)">处理</el-button>
                    <span v-else class="sub-text">已闭环</span>
                  </template>
                </el-table-column>
              </el-table>
              <pager :total="rTotal" :page="rQuery.current" :size="rQuery.size"
                     @change="(p,s)=>{rQuery.current=p;rQuery.size=s;loadRepairs();}"/>
            </el-tab-pane>
          </el-tabs>
        </div>

        <!-- 创建维护窗口 -->
        <el-dialog v-model="windowVisible" title="创建维护窗口" width="560px" :close-on-click-modal="false">
          <el-form :model="wForm" :rules="wRules" ref="wFormRef" label-width="100px">
            <el-form-item label="设备" prop="equipmentId">
              <el-select v-model="wForm.equipmentId" filterable placeholder="请选择需要停机的设备" style="width:100%">
                <el-option v-for="e in equipments" :key="e.id" :label="e.code + ' ' + e.name" :value="e.id"/>
              </el-select>
            </el-form-item>
            <el-form-item label="开始时间" prop="startTime">
              <el-date-picker v-model="wForm.startTime" type="datetime" placeholder="选择开始时间"
                              value-format="YYYY-MM-DDTHH:mm:ss" style="width:100%"/>
            </el-form-item>
            <el-form-item label="结束时间" prop="endTime">
              <el-date-picker v-model="wForm.endTime" type="datetime" placeholder="选择结束时间"
                              value-format="YYYY-MM-DDTHH:mm:ss" style="width:100%"/>
            </el-form-item>
            <el-form-item label="维护原因" prop="reasonType">
              <el-select v-model="wForm.reasonType" placeholder="请选择维护原因" style="width:100%">
                <el-option v-for="(label,key) in REASON_MAP" :key="key" :label="label" :value="key"/>
              </el-select>
            </el-form-item>
            <el-form-item label="原因说明">
              <el-input v-model="wForm.remark" type="textarea" :rows="2"
                        placeholder="选填，如：厂商工程师上门做年度精度校准"/>
            </el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="windowVisible = false">取消</el-button>
            <el-button type="primary" :loading="wSaving" @click="saveWindow">创建</el-button>
          </template>
        </el-dialog>

        <!-- 处理报修工单 -->
        <el-dialog v-model="handleVisible" title="处理报修工单" width="520px" :close-on-click-modal="false">
          <div class="handle-brief">
            <div><span class="sub-text">设备：</span>{{ handleRow.equipmentName }}（{{ handleRow.equipmentCode }}）</div>
            <div><span class="sub-text">报修人：</span>{{ handleRow.reporterName }}</div>
            <div><span class="sub-text">故障描述：</span>{{ handleRow.faultDesc }}</div>
          </div>
          <el-form label-width="80px" style="margin-top:14px">
            <el-form-item label="处理说明">
              <el-input v-model="handleRemark" type="textarea" :rows="3"
                        placeholder="如：已更换损坏部件并测试通过"/>
            </el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="handleVisible = false">取消</el-button>
            <el-button type="warning" :loading="hSaving" @click="doHandle('PROCESSING')">标记处理中</el-button>
            <el-button type="primary" :loading="hSaving" @click="doHandle('DONE')">完成工单</el-button>
          </template>
        </el-dialog>
        `,
        setup() {
            const REASON_MAP = global.MAINT_REASON_MAP;
            const activeTab = ref('window');
            const equipments = ref([]);

            /* ---------- 维护窗口 ---------- */
            const wLoading = ref(false);
            const wSaving = ref(false);
            const windows = ref([]);
            const wTotal = ref(0);
            const wQuery = reactive({ current: 1, size: 10, equipmentId: null, status: '' });
            const windowVisible = ref(false);
            const wFormRef = ref();
            const wForm = reactive({ equipmentId: null, startTime: '', endTime: '', reasonType: 'ROUTINE', remark: '' });
            const wRules = {
                equipmentId: [{ required: true, message: '请选择设备', trigger: 'change' }],
                startTime: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
                endTime: [{ required: true, message: '请选择结束时间', trigger: 'change' }],
                reasonType: [{ required: true, message: '请选择维护原因', trigger: 'change' }]
            };

            /* ---------- 报修工单 ---------- */
            const rLoading = ref(false);
            const hSaving = ref(false);
            const repairs = ref([]);
            const rTotal = ref(0);
            const rQuery = reactive({ current: 1, size: 10, status: '', equipmentId: null });
            const handleVisible = ref(false);
            const handleRow = ref({});
            const handleRemark = ref('');

            const fmt = (t) => (t ? String(t).replace('T', ' ').slice(0, 16) : '-');
            const reasonOf = (t) => REASON_MAP[t] || t || '-';
            const mStatusOf = (s) => (global.MAINT_STATUS_MAP[s] || { label: s || '-', type: 'info' });
            const rStatusOf = (s) => (global.REPAIR_STATUS_MAP[s] || { label: s || '-', type: 'info' });

            const loadWindows = async () => {
                wLoading.value = true;
                try {
                    const page = await Api.get('/maintenance/page', { params: wQuery });
                    windows.value = page.records;
                    wTotal.value = page.total;
                } finally {
                    wLoading.value = false;
                }
            };
            const searchWindow = () => { wQuery.current = 1; loadWindows(); };

            const loadRepairs = async () => {
                rLoading.value = true;
                try {
                    const page = await Api.get('/repair/page', { params: rQuery });
                    repairs.value = page.records;
                    rTotal.value = page.total;
                } finally {
                    rLoading.value = false;
                }
            };
            const searchRepair = () => { rQuery.current = 1; loadRepairs(); };

            const loadEquipments = async () => {
                equipments.value = (await Api.get('/equipment/list')) || [];
            };

            const openWindowDialog = () => {
                Object.assign(wForm, { equipmentId: null, startTime: '', endTime: '', reasonType: 'ROUTINE', remark: '' });
                windowVisible.value = true;
            };

            const saveWindow = async () => {
                await wFormRef.value.validate();
                wSaving.value = true;
                try {
                    await Api.post('/maintenance', { ...wForm });
                    ElMessage.success('维护窗口已创建，该时段内设备不可预约');
                    windowVisible.value = false;
                    loadWindows();
                } finally {
                    wSaving.value = false;
                }
            };

            const completeWindow = async (row) => {
                await ElMessageBox.confirm('结束后该设备将恢复开放预约，确定结束本次维护吗？', '提示', { type: 'warning' });
                await Api.post('/maintenance/' + row.id + '/complete');
                ElMessage.success('维护已结束');
                loadWindows();
            };

            const removeWindow = async (row) => {
                await ElMessageBox.confirm('确定删除该维护窗口吗？', '提示', { type: 'warning' });
                await Api.delete('/maintenance/' + row.id);
                ElMessage.success('删除成功');
                loadWindows();
            };

            const openHandleDialog = (row) => {
                handleRow.value = row;
                handleRemark.value = row.handleRemark || '';
                handleVisible.value = true;
            };

            const doHandle = async (status) => {
                hSaving.value = true;
                try {
                    await Api.post('/repair/' + handleRow.value.id + '/handle', null,
                        { params: { status: status, remark: handleRemark.value || undefined } });
                    ElMessage.success(status === 'DONE' ? '工单已完成' : '已标记为处理中');
                    handleVisible.value = false;
                    loadRepairs();
                } finally {
                    hSaving.value = false;
                }
            };

            onMounted(() => { loadWindows(); loadRepairs(); loadEquipments(); });

            return { REASON_MAP, activeTab, equipments,
                     wLoading, wSaving, windows, wTotal, wQuery, windowVisible, wFormRef, wForm, wRules,
                     rLoading, hSaving, repairs, rTotal, rQuery, handleVisible, handleRow, handleRemark,
                     fmt, reasonOf, mStatusOf, rStatusOf,
                     loadWindows, searchWindow, loadRepairs, searchRepair,
                     openWindowDialog, saveWindow, completeWindow, removeWindow, openHandleDialog, doHandle };
        }
    };

    global.MaintenanceView = MaintenanceView;
})(window);
