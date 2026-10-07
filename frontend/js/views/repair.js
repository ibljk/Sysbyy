/**
 * 设备报修页（用户端）：提交报修 + 查看我的报修处理进度
 */
(function (global) {
    const { ref, reactive, onMounted } = Vue;

    const RepairView = {
        template: `
        <div class="page-card">
          <div class="toolbar">
            <el-select v-model="query.status" placeholder="全部状态" clearable style="width:130px"
                       @change="search">
              <el-option label="待处理" value="PENDING"/>
              <el-option label="处理中" value="PROCESSING"/>
              <el-option label="已完成" value="DONE"/>
            </el-select>
            <el-button type="primary" @click="search">查询</el-button>
            <div style="flex:1"></div>
            <el-button type="success" @click="openDialog"><el-icon><Plus/></el-icon>提交报修</el-button>
          </div>

          <el-table :data="records" v-loading="loading" stripe border>
            <el-table-column label="设备" min-width="180">
              <template #default="{row}">
                <span class="mono-tag">{{ row.equipmentCode }}</span> {{ row.equipmentName }}
              </template>
            </el-table-column>
            <el-table-column prop="faultDesc" label="故障描述" min-width="240" show-overflow-tooltip/>
            <el-table-column label="状态" width="100" align="center">
              <template #default="{row}">
                <el-tag :type="statusOf(row.status).type" effect="light">{{ statusOf(row.status).label }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="处理人" width="110">
              <template #default="{row}">{{ row.handlerName || '—' }}</template>
            </el-table-column>
            <el-table-column prop="handleRemark" label="处理说明" min-width="200" show-overflow-tooltip>
              <template #default="{row}">{{ row.handleRemark || '等待管理员处理' }}</template>
            </el-table-column>
            <el-table-column label="报修时间" width="160">
              <template #default="{row}">{{ fmt(row.createTime) }}</template>
            </el-table-column>
          </el-table>
          <pager :total="total" :page="query.current" :size="query.size"
                 @change="(p,s)=>{query.current=p;query.size=s;load();}"/>
        </div>

        <el-dialog v-model="dialogVisible" title="提交设备报修" width="540px" :close-on-click-modal="false">
          <el-form :model="form" :rules="rules" ref="formRef" label-width="90px">
            <el-form-item label="设备" prop="equipmentId">
              <el-select v-model="form.equipmentId" filterable placeholder="请选择需要报修的设备" style="width:100%">
                <el-option v-for="e in equipments" :key="e.id"
                           :label="e.code + ' ' + e.name + (e.labName ? '（' + e.labName + '）' : '')" :value="e.id"/>
              </el-select>
            </el-form-item>
            <el-form-item label="故障描述" prop="faultDesc">
              <el-input v-model="form.faultDesc" type="textarea" :rows="4" maxlength="500" show-word-limit
                        placeholder="请描述故障现象，如：CH2 输出波形失真，频率高于 1MHz 时明显"/>
            </el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="dialogVisible = false">取消</el-button>
            <el-button type="primary" :loading="saving" @click="save">提交报修</el-button>
          </template>
        </el-dialog>
        `,
        setup() {
            const STATUS_MAP = global.REPAIR_STATUS_MAP || {};
            const loading = ref(false);
            const saving = ref(false);
            const records = ref([]);
            const total = ref(0);
            const equipments = ref([]);
            const query = reactive({ current: 1, size: 10, status: '' });
            const dialogVisible = ref(false);
            const formRef = ref();
            const form = reactive({ equipmentId: null, faultDesc: '' });
            const rules = {
                equipmentId: [{ required: true, message: '请选择设备', trigger: 'change' }],
                faultDesc: [{ required: true, message: '请填写故障描述', trigger: 'blur' }]
            };

            const statusOf = (s) => STATUS_MAP[s] || { label: s || '-', type: 'info' };
            const fmt = (t) => (t ? String(t).replace('T', ' ').slice(0, 16) : '-');

            const load = async () => {
                loading.value = true;
                try {
                    const page = await Api.get('/repair/my', { params: query });
                    records.value = page.records;
                    total.value = page.total;
                } finally {
                    loading.value = false;
                }
            };
            const search = () => { query.current = 1; load(); };

            const loadEquipments = async () => {
                equipments.value = (await Api.get('/equipment/list')) || [];
            };

            const openDialog = () => {
                Object.assign(form, { equipmentId: null, faultDesc: '' });
                dialogVisible.value = true;
            };

            const save = async () => {
                await formRef.value.validate();
                saving.value = true;
                try {
                    await Api.post('/repair', { ...form });
                    ElMessage.success('报修已提交，管理员会尽快处理');
                    dialogVisible.value = false;
                    search();
                } finally {
                    saving.value = false;
                }
            };

            onMounted(() => { load(); loadEquipments(); });

            return { loading, saving, records, total, equipments, query, dialogVisible, formRef, form,
                     rules, statusOf, fmt, load, search, openDialog, save };
        }
    };

    global.RepairView = RepairView;
})(window);
