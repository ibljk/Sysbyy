/**
 * 预约管理视图（管理员端）：审批、取消、核验查看用户归还的照片与备注
 * 注意：归还拍照改由预约人在"我的预约"完成，本页仅用于核验查看
 */
(function (global) {
    const { ref, reactive, onMounted } = Vue;

    const ApprovalView = {
        template: `
        <div class="page-card">
          <div class="toolbar">
            <el-radio-group v-model="query.status" @change="search">
              <el-radio-button label="">全部</el-radio-button>
              <el-radio-button label="PENDING">待审批</el-radio-button>
              <el-radio-button label="APPROVED">已通过</el-radio-button>
              <el-radio-button label="COMPLETED">已完成</el-radio-button>
            </el-radio-group>
            <el-input v-model="query.keyword" placeholder="设备 / 编号 / 用户" clearable style="width:190px" @keyup.enter="search"/>
            <el-date-picker v-model="dateRange" type="daterange" value-format="YYYY-MM-DD"
                            start-placeholder="开始日期" end-placeholder="结束日期" style="width:230px"/>
            <el-button type="primary" @click="search">查询</el-button>
            <el-button @click="reset">重置</el-button>
          </div>

          <el-table :data="records" v-loading="loading" stripe border>
            <el-table-column label="预约人" width="100">
              <template #default="{row}">{{ row.realName || row.username }}</template>
            </el-table-column>
            <el-table-column label="设备" min-width="150">
              <template #default="{row}">
                <div style="display:flex;align-items:center;gap:8px">
                  <el-image :src="equipImg(row)" fit="cover" style="width:40px;height:28px;border-radius:4px;flex-shrink:0"/>
                  <div>
                    <div style="font-size:13px">{{ row.equipmentName }}</div>
                    <div style="font-size:11px;color:var(--text-3)">{{ row.equipmentCode }}</div>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="labName" label="实验室" min-width="130"/>
            <el-table-column label="预约时段" min-width="160">
              <template #default="{row}">{{ fmtRange(row) }}</template>
            </el-table-column>
            <el-table-column prop="purpose" label="用途" min-width="110" show-overflow-tooltip/>
            <el-table-column label="状态" width="88" align="center">
              <template #default="{row}">
                <status-tag :map="RESERV_STATUS_MAP" :value="row.status"/>
              </template>
            </el-table-column>
            <el-table-column label="归还照片" width="80" align="center">
              <template #default="{row}">
                <template v-if="row.returnedAt">
                  <el-button size="small" text type="primary" @click="openDetail(row)">核验</el-button>
                </template>
                <span v-else style="color:#c0c4cc;font-size:12px">--</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="160" fixed="right">
              <template #default="{row}">
                <template v-if="row.status === 'PENDING'">
                  <el-button size="small" type="success" @click="openApprove(row, true)">通过</el-button>
                  <el-button size="small" type="danger" @click="openApprove(row, false)">驳回</el-button>
                </template>
                <template v-else-if="row.status === 'APPROVED'">
                  <el-tag size="small" type="info" effect="plain" style="margin-right:6px">等待用户归还</el-tag>
                  <el-button size="small" type="danger" plain @click="cancel(row)">取消</el-button>
                </template>
                <template v-else-if="row.status === 'COMPLETED'">
                  <el-button size="small" @click="openDetail(row)">详情</el-button>
                </template>
                <span v-else style="color:#c0c4cc;font-size:12px">--</span>
              </template>
            </el-table-column>
          </el-table>

          <pager :total="total" :page="query.current" :size="query.size" @change="onPageChange"/>
        </div>

        <!-- 审批对话框 -->
        <el-dialog v-model="approveVisible" :title="approveForm.approved ? '通过预约' : '驳回预约'" width="440px" :close-on-click-modal="false">
          <el-form label-width="80px">
            <el-form-item label="审批意见">
              <el-input v-model="approveForm.comment" type="textarea" :rows="3"
                        :placeholder="approveForm.approved ? '选填' : '请填写驳回原因（必填）'" maxlength="200"/>
            </el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="approveVisible = false">取消</el-button>
            <el-button :type="approveForm.approved ? 'success' : 'danger'" :loading="saving" @click="submitApprove">
              {{ approveForm.approved ? '确认通过' : '确认驳回' }}
            </el-button>
          </template>
        </el-dialog>

        <!-- 预约详情（含归还照片核验） -->
        <el-dialog v-model="detailVisible" title="预约详情 · 归还核验" width="640px">
          <div v-loading="detailLoading">
            <template v-if="detail.id">
              <div style="display:flex;gap:14px">
                <el-image :src="equipImg(detail)" fit="cover" style="width:150px;height:104px;border-radius:8px;flex-shrink:0"
                          :preview-src-list="[equipImg(detail)]" preview-teleported/>
                <div style="flex:1;font-size:13px;color:#606266;line-height:2">
                  <div><b style="color:#303133">设备：</b>{{ detail.equipmentName }}（{{ detail.equipmentCode }}）</div>
                  <div><b style="color:#303133">预约人：</b>{{ detail.realName || detail.username }}</div>
                  <div><b style="color:#303133">时段：</b>{{ fmtRange(detail) }}</div>
                  <div><b style="color:#303133">状态：</b><status-tag :map="RESERV_STATUS_MAP" :value="detail.status"/></div>
                </div>
              </div>
              <el-descriptions :column="1" border style="margin-top:12px" size="small">
                <el-descriptions-item label="预约用途">{{ detail.purpose || '-' }}</el-descriptions-item>
                <el-descriptions-item label="审批意见">{{ detail.approveComment || '-' }}</el-descriptions-item>
                <el-descriptions-item label="归还备注">{{ detail.returnNote || '-' }}</el-descriptions-item>
                <el-descriptions-item label="归还时间">{{ detail.returnedAt ? fmtDateTime(detail.returnedAt) : '-' }}</el-descriptions-item>
              </el-descriptions>
              <div v-if="detail.returnImage" style="margin-top:12px">
                <div style="font-size:13px;color:#303133;margin-bottom:6px"><b>归还照片（用户上传）</b></div>
                <el-image :src="detail.returnImage" fit="cover" style="max-width:100%;max-height:260px;border-radius:8px"
                          :preview-src-list="[detail.returnImage]" preview-teleported/>
              </div>
              <el-empty v-else-if="detail.returnedAt" description="该预约到期自动完成，未拍摄归还照片" :image-size="70"/>
            </template>
          </div>
        </el-dialog>
        `,
        setup() {
            const loading = ref(false);
            const records = ref([]);
            const total = ref(0);
            const dateRange = ref(null);
            const query = reactive({ current: 1, size: 10, status: '', keyword: '' });

            const saving = ref(false);
            const approveVisible = ref(false);
            const approveForm = reactive({ id: null, approved: true, comment: '' });

            const detailVisible = ref(false);
            const detailLoading = ref(false);
            const detail = reactive({});

            const load = async () => {
                loading.value = true;
                try {
                    const params = { current: query.current, size: query.size };
                    if (query.status) params.status = query.status;
                    if (query.keyword) params.keyword = query.keyword;
                    if (dateRange.value && dateRange.value.length === 2) {
                        params.dateFrom = dateRange.value[0];
                        params.dateTo = dateRange.value[1];
                    }
                    const page = await Api.get('/reservation/page', { params });
                    records.value = page.records;
                    total.value = page.total;
                } finally {
                    loading.value = false;
                }
            };

            const search = () => { query.current = 1; load(); };
            const reset = () => {
                Object.assign(query, { current: 1, status: '', keyword: '' });
                dateRange.value = null;
                load();
            };
            const onPageChange = (p, s) => { query.current = p; query.size = s; load(); };

            /* ===== 审批 ===== */
            const openApprove = (row, approved) => {
                Object.assign(approveForm, { id: row.id, approved, comment: '' });
                approveVisible.value = true;
            };

            const submitApprove = async () => {
                if (!approveForm.approved && !approveForm.comment) {
                    ElMessage.warning('请填写驳回原因');
                    return;
                }
                saving.value = true;
                try {
                    await Api.post(`/reservation/${approveForm.id}/approve`, approveForm);
                    ElMessage.success(approveForm.approved ? '已通过' : '已驳回');
                    approveVisible.value = false;
                    load();
                } finally {
                    saving.value = false;
                }
            };

            /* ===== 取消 / 详情（归还核验）===== */
            const cancel = (row) => {
                ElMessageBox.confirm('确定取消该预约？', '取消预约', { type: 'warning' })
                    .then(async () => {
                        await Api.post(`/reservation/${row.id}/cancel`);
                        ElMessage.success('已取消');
                        load();
                    }).catch(() => {});
            };

            const openDetail = async (row) => {
                Object.assign(detail, row);
                detail.returnImage = row.returnImage || null;
                detailVisible.value = true;
                detailLoading.value = true;
                try {
                    const full = await Api.get('/reservation/' + row.id);
                    Object.assign(detail, full || {});
                } catch (e) {
                    // 详情获取失败时保留列表数据
                } finally {
                    detailLoading.value = false;
                }
            };

            onMounted(load);

            return { loading, records, total, dateRange, query, saving,
                     approveVisible, approveForm,
                     detailVisible, detailLoading, detail,
                     search, reset, onPageChange,
                     openApprove, submitApprove,
                     cancel, openDetail,
                     RESERV_STATUS_MAP: global.RESERV_STATUS_MAP,
                     equipImg: global.equipImg,
                     fmtDate: global.fmtDate, fmtTime: global.fmtTime,
                     fmtDateTime: global.fmtDateTime, fmtRange: global.fmtRange };
        }
    };

    global.ApprovalView = ApprovalView;
})(window);