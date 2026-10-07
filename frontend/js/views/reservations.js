/**
 * 我的预约页（学生/教师）：发起预约、查看预约、取消、归还设备（拍照上传）、查看归还照片
 */
(function (global) {
    const { ref, reactive, onMounted } = Vue;

    const ReservationsView = {
        template: `
        <div class="page-card">
          <div class="toolbar">
            <el-radio-group v-model="query.status" @change="search">
              <el-radio-button label="">全部</el-radio-button>
              <el-radio-button v-for="(v, k) in RESERV_STATUS_MAP" :key="k" :label="k">{{ v.label }}</el-radio-button>
            </el-radio-group>
            <div style="flex:1"></div>
            <el-button type="success" @click="openCreate"><el-icon><Plus/></el-icon>发起预约</el-button>
          </div>

          <el-table :data="records" v-loading="loading" stripe border>
            <el-table-column prop="equipmentName" label="设备" min-width="130"/>
            <el-table-column prop="equipmentCode" label="编号" width="100"/>
            <el-table-column prop="labName" label="实验室" min-width="140"/>
            <el-table-column label="预约时间" min-width="170">
              <template #default="{row}">{{ fmtRange(row) }}</template>
            </el-table-column>
            <el-table-column prop="purpose" label="用途" min-width="130" show-overflow-tooltip/>
            <el-table-column label="状态" width="90" align="center">
              <template #default="{row}">
                <status-tag :map="RESERV_STATUS_MAP" :value="row.status"/>
              </template>
            </el-table-column>
            <el-table-column prop="approveComment" label="审批意见" min-width="120" show-overflow-tooltip>
              <template #default="{row}">{{ row.approveComment || '-' }}</template>
            </el-table-column>
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{row}">
                <template v-if="row.status === 'PENDING'">
                  <el-button size="small" type="danger" plain @click="cancel(row)">取消</el-button>
                </template>
                <template v-else-if="row.status === 'APPROVED'">
                  <el-button size="small" type="success" @click="openReturn(row)">
                    <el-icon><component :is="'Camera'"/></el-icon>&nbsp;归还设备
                  </el-button>
                  <el-button size="small" type="danger" plain @click="cancel(row)">取消</el-button>
                </template>
                <template v-else-if="row.status === 'COMPLETED'">
                  <el-button size="small" @click="openDetail(row)">查看</el-button>
                </template>
                <span v-else style="color:#c0c4cc;font-size:12px">--</span>
              </template>
            </el-table-column>
          </el-table>

          <pager :total="total" :page="query.current" :size="query.size" @change="onPageChange"/>
        </div>

        <!-- 发起预约对话框 -->
        <el-dialog v-model="createVisible" title="发起设备预约" width="560px" :close-on-click-modal="false" @open="loadBookable">
          <el-alert type="info" :closable="false" style="margin-bottom:14px"
                    title="预约说明：提交后需管理员审批；支持跨天连续预约，单次最长 30 天（含首尾），需在实验室开放时间内。" />
          <el-form :model="form" :rules="rules" ref="formRef" label-width="90px">
            <el-form-item label="预约设备" prop="equipmentId">
              <el-select v-model="form.equipmentId" placeholder="选择设备" style="width:100%" filterable>
                <el-option v-for="e in bookable" :key="e.id"
                           :label="e.name + '（' + e.code + '）· 共' + (e.stock || 1) + '台'"
                           :value="e.id"/>
              </el-select>
            </el-form-item>
            <el-form-item label="日期范围" prop="dateRange">
              <el-date-picker v-model="form.dateRange" type="daterange" value-format="YYYY-MM-DD"
                              :disabled-date="disabledDate" start-placeholder="开始日期"
                              end-placeholder="结束日期" range-separator="至" style="width:100%"/>
            </el-form-item>
            <el-form-item label="开始时刻" prop="startTime">
              <el-time-picker v-model="form.startTime" format="HH:mm" value-format="HH:mm:ss"
                              placeholder="首日时刻" style="width:100%"/>
            </el-form-item>
            <el-form-item label="结束时刻" prop="endTime">
              <el-time-picker v-model="form.endTime" format="HH:mm" value-format="HH:mm:ss"
                              placeholder="末日时刻" style="width:100%"/>
            </el-form-item>
            <el-form-item label="预约用途" prop="purpose">
              <el-input v-model="form.purpose" type="textarea" :rows="2" maxlength="200"
                        show-word-limit placeholder="请说明使用设备的目的"/>
            </el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="createVisible = false">取消</el-button>
            <el-button type="primary" :loading="saving" @click="submit">提交申请</el-button>
          </template>
        </el-dialog>

        <!-- 归还拍照对话框（用户自助归还） -->
        <el-dialog v-model="returnVisible" title="归还设备 · 拍照留痕" width="460px" :close-on-click-modal="false">
          <el-alert type="success" :closable="false" style="margin-bottom:12px"
                    title="请对归还后的设备实物拍摄照片（正面清晰即可），提交后本次预约自动完成，设备回刷为空闲状态。" />
          <div style="text-align:center">
            <template v-if="returnForm.returnImage">
              <el-image :src="returnForm.returnImage" fit="cover" style="width:100%;max-height:240px;border-radius:8px"/>
              <div style="margin-top:10px">
                <el-button size="small" @click="triggerReturnFile">
                  <el-icon><component :is="'Refresh'"/></el-icon>&nbsp;重新拍摄/选择
                </el-button>
                <el-button size="small" type="danger" plain @click="returnForm.returnImage=''">移除</el-button>
              </div>
            </template>
            <el-button v-else type="primary" plain @click="triggerReturnFile" style="height:150px;width:100%;font-size:15px">
              <div>
                <el-icon :size="28"><component :is="'Camera'"/></el-icon>
                <div style="margin-top:6px">拍摄 / 上传归还照片</div>
              </div>
            </el-button>
            <input ref="returnFileInput" type="file" accept="image/*" capture="environment"
                   style="display:none" @change="onReturnFileChange"/>
          </div>
          <el-form label-width="80px" style="margin-top:14px">
            <el-form-item label="归还备注">
              <el-input v-model="returnForm.returnNote" type="textarea" :rows="2" maxlength="200"
                        placeholder="选填：设备状态、使用情况说明"/>
            </el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="returnVisible = false">取消</el-button>
            <el-button type="success" :loading="saving" :disabled="!returnForm.returnImage" @click="submitReturn">
              确认归还
            </el-button>
          </template>
        </el-dialog>

        <!-- 预约详情（含归还照片） -->
        <el-dialog v-model="detailVisible" title="预约详情" width="640px">
          <div v-loading="detailLoading">
            <template v-if="detail.id">
              <div style="display:flex;gap:14px">
                <el-image :src="equipImg(detail)" fit="cover"
                          style="width:150px;height:104px;border-radius:8px;flex-shrink:0"
                          :preview-src-list="[equipImg(detail)]" preview-teleported/>
                <div style="flex:1;font-size:13px;color:#606266;line-height:2">
                  <div><b style="color:#303133">设备：</b>{{ detail.equipmentName }}（{{ detail.equipmentCode }}）</div>
                  <div><b style="color:#303133">实验室：</b>{{ detail.labName }}</div>
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
                <div style="font-size:13px;color:#303133;margin-bottom:6px"><b>归还照片</b></div>
                <el-image :src="detail.returnImage" fit="cover"
                          style="max-width:100%;max-height:260px;border-radius:8px"
                          :preview-src-list="[detail.returnImage]" preview-teleported/>
              </div>
            </template>
          </div>
        </el-dialog>
        `,
        setup() {
            const loading = ref(false);
            const records = ref([]);
            const total = ref(0);
            const query = reactive({ current: 1, size: 10, status: '' });

            const createVisible = ref(false);
            const saving = ref(false);
            const bookable = ref([]);
            const formRef = ref();
            const form = reactive({ equipmentId: null, dateRange: [], startTime: '', endTime: '', purpose: '' });
            const parseD = (s) => {
                const p = String(s).split('-').map(Number);
                return new Date(p[0], p[1] - 1, p[2]);
            };
            const todayStr = () => {
                const d = new Date();
                const p = (n) => String(n).padStart(2, '0');
                return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
            };
            const rules = {
                equipmentId: [{ required: true, message: '请选择设备', trigger: 'change' }],
                dateRange: [
                    { required: true, message: '请选择预约日期范围', trigger: 'change' },
                    {
                        validator: (rule, v, cb) => {
                            if (!v || v.length !== 2) return cb();
                            if (v[0] < todayStr()) return cb(new Error('开始日期不能早于今天'));
                            const span = Math.round((parseD(v[1]) - parseD(v[0])) / 86400000) + 1;
                            if (span > 30) return cb(new Error('单次预约最长 30 天（含首尾）'));
                            cb();
                        },
                        trigger: 'change'
                    }
                ],
                startTime: [{ required: true, message: '请选择开始时刻', trigger: 'change' }],
                endTime: [{ required: true, message: '请选择结束时刻', trigger: 'change' }]
            };

            // 归还
            const returnVisible = ref(false);
            const returnFileInput = ref();
            const returnForm = reactive({ id: null, returnImage: '', returnNote: '' });

            // 详情
            const detailVisible = ref(false);
            const detailLoading = ref(false);
            const detail = reactive({});

            const load = async () => {
                loading.value = true;
                try {
                    const params = { current: query.current, size: query.size };
                    if (query.status) params.status = query.status;
                    const page = await Api.get('/reservation/my', { params });
                    records.value = page.records;
                    total.value = page.total;
                } finally {
                    loading.value = false;
                }
            };

            const search = () => { query.current = 1; load(); };
            const onPageChange = (p, s) => { query.current = p; query.size = s; load(); };

            // 只允许预约今天起的 30 天内
            const disabledDate = (date) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const max = new Date(today);
                max.setDate(max.getDate() + 30);
                return date < today || date > max;
            };

            const openCreate = () => {
                Object.assign(form, { equipmentId: null, dateRange: [], startTime: '', endTime: '', purpose: '' });
                const params = new URLSearchParams(location.hash.split('?')[1] || '');
                const equipId = params.get('equipmentId');
                if (equipId) form.equipmentId = Number(equipId);
                createVisible.value = true;
            };

            const loadBookable = async () => {
                bookable.value = await Api.get('/equipment/list-bookable');
            };

            const submit = async () => {
                try { await formRef.value.validate(); } catch (e) { return; }
                const [d0, d1] = form.dateRange;
                if (d0 === d1 && form.endTime <= form.startTime) {
                    ElMessage.warning('同一天预约时，结束时刻必须晚于开始时刻');
                    return;
                }
                saving.value = true;
                try {
                    await Api.post('/reservation', {
                        equipmentId: form.equipmentId,
                        date: d0,
                        endDate: d1,
                        startTime: form.startTime,
                        endTime: form.endTime,
                        purpose: form.purpose
                    });
                    ElMessage.success('预约申请已提交，请等待管理员审批');
                    createVisible.value = false;
                    load();
                } finally {
                    saving.value = false;
                }
            };

            const cancel = (row) => {
                ElMessageBox.confirm(`确定取消【${fmtRange(row)}】的预约吗？`,
                    '取消预约', { type: 'warning' })
                    .then(async () => {
                        await Api.post(`/reservation/${row.id}/cancel`);
                        ElMessage.success('预约已取消');
                        load();
                    }).catch(() => {});
            };

            /* ===== 用户归还（拍照上传） ===== */
            const openReturn = (row) => {
                Object.assign(returnForm, { id: row.id, returnImage: '', returnNote: '' });
                returnVisible.value = true;
            };

            const triggerReturnFile = () => { returnFileInput.value && returnFileInput.value.click(); };

            const onReturnFileChange = (ev) => {
                const file = ev.target.files && ev.target.files[0];
                if (!file) return;
                if (file.size > 6 * 1024 * 1024) {
                    ElMessage.warning('照片过大，请选择 6MB 以内的图片');
                    ev.target.value = '';
                    return;
                }
                const reader = new FileReader();
                reader.onload = () => { returnForm.returnImage = reader.result; };
                reader.readAsDataURL(file);
                ev.target.value = '';
            };

            const submitReturn = async () => {
                if (!returnForm.returnImage) {
                    ElMessage.warning('请先拍摄或上传归还照片');
                    return;
                }
                saving.value = true;
                try {
                    await Api.post(`/reservation/${returnForm.id}/complete`, {
                        returnImage: returnForm.returnImage,
                        returnNote: returnForm.returnNote || null
                    });
                    ElMessage.success('设备已归还，照片已存档');
                    returnVisible.value = false;
                    load();
                } finally {
                    saving.value = false;
                }
            };

            /* ===== 详情（含归还照片） ===== */
            const openDetail = async (row) => {
                Object.assign(detail, row, { returnImage: null, returnedAt: null, returnNote: null });
                detailVisible.value = true;
                detailLoading.value = true;
                try {
                    const full = await Api.get('/reservation/' + row.id);
                    Object.assign(detail, full || {});
                } catch (e) {
                    // 详情获取失败时保留列表基础数据
                } finally {
                    detailLoading.value = false;
                }
            };

            onMounted(load);

            return { loading, records, total, query, createVisible, saving, bookable, formRef, form, rules,
                     returnVisible, returnFileInput, returnForm,
                     detailVisible, detailLoading, detail,
                     search, onPageChange, openCreate, loadBookable, submit, cancel, disabledDate,
                     openReturn, triggerReturnFile, onReturnFileChange, submitReturn,
                     openDetail,
                     RESERV_STATUS_MAP: global.RESERV_STATUS_MAP,
                     equipImg: global.equipImg,
                     fmtDate: global.fmtDate, fmtTime: global.fmtTime,
                     fmtDateTime: global.fmtDateTime, fmtRange: global.fmtRange };
        }
    };

    global.ReservationsView = ReservationsView;
})(window);