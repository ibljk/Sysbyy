/**
 * 资质认证页（管理员）：为设备授予 / 撤销用户操作资质（准入控制）
 */
(function (global) {
    const { ref, reactive, onMounted } = Vue;

    const QualificationView = {
        template: `
        <div class="page-card">
          <el-alert type="info" :closable="false" show-icon style="margin-bottom:14px"
                    title="资质准入说明"
                    description="在「设备管理」中将设备标记为「需要资质」后，仅持有有效资质的用户才能预约该设备。在此为通过培训的用户授予资质。"/>

          <div class="toolbar">
            <el-input v-model="query.keyword" placeholder="持证人姓名 / 账号" clearable style="width:200px" @keyup.enter="search"/>
            <el-select v-model="query.status" placeholder="全部状态" clearable style="width:130px">
              <el-option label="有效" value="VALID"/>
              <el-option label="已撤销" value="REVOKED"/>
            </el-select>
            <el-select v-model="query.equipmentId" placeholder="全部设备" clearable filterable style="width:200px">
              <el-option v-for="e in equipments" :key="e.id" :label="e.code + ' ' + e.name" :value="e.id"/>
            </el-select>
            <el-button type="primary" @click="search">查询</el-button>
            <div style="flex:1"></div>
            <el-button type="success" @click="openDialog()"><el-icon><Plus/></el-icon>授予资质</el-button>
          </div>

          <el-table :data="records" v-loading="loading" stripe border>
            <el-table-column label="设备" min-width="190">
              <template #default="{row}">
                <span class="mono-tag">{{ row.equipmentCode }}</span> {{ row.equipmentName }}
              </template>
            </el-table-column>
            <el-table-column label="持证人" width="150">
              <template #default="{row}">{{ row.realName || row.username }}<span class="sub-text">（{{ row.username }}）</span></template>
            </el-table-column>
            <el-table-column label="培训日期" width="120" align="center">
              <template #default="{row}">{{ row.trainingDate || '—' }}</template>
            </el-table-column>
            <el-table-column label="有效期至" width="120" align="center">
              <template #default="{row}">{{ row.validUntil || '长期有效' }}</template>
            </el-table-column>
            <el-table-column label="状态" width="100" align="center">
              <template #default="{row}">
                <el-tag v-if="row.status === 'REVOKED'" type="info" effect="plain">已撤销</el-tag>
                <el-tag v-else-if="row.expired" type="warning" effect="plain">已过期</el-tag>
                <el-tag v-else type="success" effect="light">有效</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="remark" label="备注" min-width="180" show-overflow-tooltip>
              <template #default="{row}">{{ row.remark || '—' }}</template>
            </el-table-column>
            <el-table-column label="操作" width="110" fixed="right">
              <template #default="{row}">
                <el-button v-if="row.status === 'VALID'" size="small" type="danger" plain
                           @click="revoke(row)">撤销</el-button>
                <span v-else class="sub-text">—</span>
              </template>
            </el-table-column>
          </el-table>
          <pager :total="total" :page="query.current" :size="query.size"
                 @change="(p,s)=>{query.current=p;query.size=s;load();}"/>
        </div>

        <el-dialog v-model="dialogVisible" title="授予设备资质" width="540px" :close-on-click-modal="false">
          <el-form :model="form" :rules="rules" ref="formRef" label-width="90px">
            <el-form-item label="设备" prop="equipmentId">
              <el-select v-model="form.equipmentId" filterable placeholder="请选择设备" style="width:100%">
                <el-option v-for="e in equipments" :key="e.id" :label="e.code + ' ' + e.name" :value="e.id"/>
              </el-select>
            </el-form-item>
            <el-form-item label="持证人" prop="userId">
              <el-select v-model="form.userId" filterable placeholder="请选择用户" style="width:100%">
                <el-option v-for="u in users" :key="u.id"
                           :label="(u.realName || u.username) + ' · ' + u.username" :value="u.id"/>
              </el-select>
            </el-form-item>
            <el-form-item label="培训日期">
              <el-date-picker v-model="form.trainingDate" type="date" value-format="YYYY-MM-DD"
                              placeholder="选择培训日期" style="width:180px"/>
            </el-form-item>
            <el-form-item label="有效期至">
              <el-date-picker v-model="form.validUntil" type="date" value-format="YYYY-MM-DD"
                              placeholder="留空表示长期有效" style="width:180px"/>
            </el-form-item>
            <el-form-item label="备注">
              <el-input v-model="form.remark" placeholder="选填，如培训成绩等"/>
            </el-form-item>
            <el-alert type="warning" :closable="false"
                      title="同一设备同一用户重复授予将刷新其有效期，不会产生重复记录。" style="margin-left:90px"/>
          </el-form>
          <template #footer>
            <el-button @click="dialogVisible = false">取消</el-button>
            <el-button type="primary" :loading="saving" @click="save">授予</el-button>
          </template>
        </el-dialog>
        `,
        setup() {
            const loading = ref(false);
            const saving = ref(false);
            const records = ref([]);
            const total = ref(0);
            const equipments = ref([]);
            const users = ref([]);
            const query = reactive({ current: 1, size: 10, keyword: '', status: '', equipmentId: null });
            const dialogVisible = ref(false);
            const formRef = ref();
            const form = reactive({ equipmentId: null, userId: null, trainingDate: '', validUntil: '', remark: '' });
            const rules = {
                equipmentId: [{ required: true, message: '请选择设备', trigger: 'change' }],
                userId: [{ required: true, message: '请选择持证人', trigger: 'change' }]
            };

            const load = async () => {
                loading.value = true;
                try {
                    const page = await Api.get('/qualification/page', { params: query });
                    records.value = page.records;
                    total.value = page.total;
                } finally {
                    loading.value = false;
                }
            };
            const search = () => { query.current = 1; load(); };

            const loadOptions = async () => {
                const [eqs, userPage] = await Promise.all([
                    Api.get('/equipment/list'),
                    Api.get('/user/page', { params: { current: 1, size: 200 } })
                ]);
                equipments.value = eqs || [];
                users.value = (userPage && userPage.records) || [];
            };

            const openDialog = () => {
                Object.assign(form, { equipmentId: null, userId: null, trainingDate: '', validUntil: '', remark: '' });
                dialogVisible.value = true;
            };

            const save = async () => {
                await formRef.value.validate();
                saving.value = true;
                try {
                    await Api.post('/qualification', {
                        equipmentId: form.equipmentId,
                        userId: form.userId,
                        trainingDate: form.trainingDate || null,
                        validUntil: form.validUntil || null,
                        remark: form.remark || null
                    });
                    ElMessage.success('资质已授予');
                    dialogVisible.value = false;
                    load();
                } finally {
                    saving.value = false;
                }
            };

            const revoke = async (row) => {
                await ElMessageBox.confirm(
                    '撤销后该用户将无法预约「' + row.equipmentName + '」，确定撤销吗？', '提示', { type: 'warning' });
                await Api.post('/qualification/' + row.id + '/revoke');
                ElMessage.success('资质已撤销');
                load();
            };

            onMounted(() => { load(); loadOptions(); });

            return { loading, saving, records, total, equipments, users, query, dialogVisible,
                     formRef, form, rules, load, search, openDialog, save, revoke };
        }
    };

    global.QualificationView = QualificationView;
})(window);
