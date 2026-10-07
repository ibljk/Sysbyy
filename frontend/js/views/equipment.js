/**
 * 设备管理视图（管理员端）：设备 CRUD + 图片维护
 */
(function (global) {
    const { ref, reactive, onMounted } = Vue;

    const EquipmentManageView = {
        template: `
        <div class="page-card">
          <div class="toolbar">
            <el-input v-model="query.keyword" placeholder="设备名称 / 编号 / 型号" clearable @keyup.enter="search"/>
            <el-select v-model="query.categoryId" placeholder="设备类别" clearable>
              <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id"/>
            </el-select>
            <el-select v-model="query.labId" placeholder="所属实验室" clearable>
              <el-option v-for="l in labs" :key="l.id" :label="l.name" :value="l.id"/>
            </el-select>
            <el-select v-model="query.status" placeholder="设备状态" clearable>
              <el-option v-for="f in EQUIP_FILTERS" :key="f.value" :label="f.label" :value="f.value"/>
            </el-select>
            <el-button type="primary" @click="search"><el-icon><component :is="'Search'"/></el-icon>查询</el-button>
            <el-button @click="reset"><el-icon><component :is="'Refresh'"/></el-icon>重置</el-button>
            <div style="flex:1"></div>
            <el-button @click="location.hash='#/book'"><el-icon><component :is="'Collection'"/></el-icon>前往设备预约</el-button>
            <el-button type="success" @click="openDialog()"><el-icon><component :is="'Plus'"/></el-icon>新增设备</el-button>
          </div>

          <el-table :data="records" v-loading="loading" stripe border>
            <el-table-column label="设备图片" width="96" align="center">
              <template #default="{row}">
                <el-image :src="equipImg(row)" :preview-src-list="[equipImg(row)]" preview-teleported
                          fit="cover" style="width:72px;height:48px;border-radius:6px;display:block">
                  <template #error><div style="width:72px;height:48px;background:#f5f7fa;border-radius:6px"></div></template>
                </el-image>
              </template>
            </el-table-column>
            <el-table-column prop="code" label="设备编号" width="100"/>
            <el-table-column label="台数" width="76" align="center">
              <template #default="{row}">
                <span>{{ row.stock || 1 }}</span>
                <div style="font-size:11px;color:#a8abb2;line-height:1.4">
                  <template v-if="row.status === 'REPAIR'">--</template>
                  <template v-else>占用 {{ row.occupiedNow || 0 }}</template>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="name" label="设备名称" min-width="120"/>
            <el-table-column prop="model" label="型号" min-width="110"/>
            <el-table-column prop="categoryName" label="类别" width="110"/>
            <el-table-column prop="labName" label="所属实验室" min-width="140"/>
            <el-table-column label="状态" width="130" align="center">
              <template #default="{row}">
                <el-tag :type="stockTag(row).type" size="small">{{ stockTag(row).text }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="预约规则" min-width="150" show-overflow-tooltip>
              <template #default="{row}">
                <span :class="ruleSummary(row) === '全局默认' ? 'sub-text' : ''">{{ ruleSummary(row) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{row}">
                <el-button size="small" @click="openDialog(row)">编辑</el-button>
                <el-dropdown trigger="click" style="margin-left:4px">
                  <el-button size="small" plain>状态<el-icon><component :is="'ArrowDown'"/></el-icon></el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item :disabled="row.status === 'REPAIR'"
                                        @click="changeStatus(row, 'REPAIR')">设为维修中</el-dropdown-item>
                      <el-dropdown-item :disabled="row.status !== 'REPAIR'"
                                        @click="changeStatus(row, 'IDLE')">恢复正常</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
                <el-button size="small" type="danger" plain @click="remove(row)" style="margin-left:4px">删除</el-button>
              </template>
            </el-table-column>
          </el-table>

          <pager :total="total" :page="query.current" :size="query.size" @change="onPageChange"/>
        </div>

        <!-- 新增 / 编辑设备对话框 -->
        <el-dialog v-model="dialogVisible" :title="form.id ? '编辑设备' : '新增设备'" width="700px" :close-on-click-modal="false">
          <el-form :model="form" :rules="rules" ref="formRef" label-width="90px">
            <el-row :gutter="12">
              <el-col :span="12">
                <el-form-item label="设备名称" prop="name">
                  <el-input v-model="form.name" placeholder="请输入设备名称"/>
                </el-form-item>
                <el-form-item label="设备编号" prop="code">
                  <el-input v-model="form.code" placeholder="唯一编号，如 EQ-0001"/>
                </el-form-item>
                <el-form-item label="设备型号">
                  <el-input v-model="form.model" placeholder="如 DS1102Z"/>
                </el-form-item>
                <el-form-item label="设备台数">
                  <el-input-number v-model="form.stock" :min="1" :max="999" controls-position="right"
                                   style="width:100%"/>
                  <div style="font-size:12px;color:var(--text-3);line-height:1.5">同型号数量，可多人同时预约；每单占用 1 台</div>
                </el-form-item>
                <el-form-item label="设备类别" prop="categoryId">
                  <el-select v-model="form.categoryId" placeholder="请选择类别" style="width:100%">
                    <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id"/>
                  </el-select>
                </el-form-item>
                <el-form-item label="所属实验室" prop="labId">
                  <el-select v-model="form.labId" placeholder="请选择实验室" style="width:100%">
                    <el-option v-for="l in labs" :key="l.id" :label="l.name" :value="l.id"/>
                  </el-select>
                </el-form-item>
                <el-form-item label="购入日期">
                  <el-date-picker v-model="form.purchaseDate" type="date" value-format="YYYY-MM-DD"
                                  placeholder="选择购入日期" style="width:100%"/>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="设备图片">
                  <div style="width:100%">
                    <div style="display:flex;gap:10px;align-items:center">
                      <el-image v-if="form.image" :src="form.image" fit="cover"
                                style="width:120px;height:76px;border-radius:6px;border:1px solid #ebeef5"/>
                      <el-image v-else :src="makeEquipPlaceholder(form.name || '设备', form.categoryName)"
                                fit="cover" style="width:120px;height:76px;border-radius:6px;border:1px dashed #dcdfe6"/>
                      <div style="flex:1">
                        <el-button size="small" @click="triggerFile"><el-icon><component :is="'Upload'"/></el-icon>上传图片</el-button>
                        <el-button v-if="form.image" size="small" type="danger" plain @click="form.image=''">移除</el-button>
                        <el-button v-else size="small" @click="form.image=makeEquipPlaceholder(form.name||'设备', form.categoryName)">
                          用占位图
                        </el-button>
                        <div style="margin-top:6px;font-size:12px;color:var(--text-3)">支持 JPG/PNG/SVG，建议小于 2MB；无图将自动展示占位图</div>
                      </div>
                    </div>
                    <el-input v-model="form.image" type="textarea" :rows="2" placeholder="或直接粘贴图片 URL / data URL" style="margin-top:8px"/>
                    <input ref="fileInput" type="file" accept="image/*" style="display:none" @change="onFileChange"/>
                  </div>
                </el-form-item>
                <el-form-item label="设备描述">
                  <el-input v-model="form.description" type="textarea" :rows="4" placeholder="设备用途、参数说明"/>
                </el-form-item>
              </el-col>
            </el-row>

            <!-- ===== 仪器级预约规则 ===== -->
            <el-divider content-position="left">预约规则（本机专属）</el-divider>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="最短时长">
                  <el-select v-model="form.minMinutes" placeholder="沿用全局" clearable style="width:100%">
                    <el-option v-for="o in MIN_MINUTE_OPTIONS" :key="o.v" :label="o.label" :value="o.v"/>
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="最长跨度">
                  <el-select v-model="form.maxDays" placeholder="沿用全局" clearable style="width:100%">
                    <el-option v-for="o in MAX_DAY_OPTIONS" :key="o.v" :label="o.label" :value="o.v"/>
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="允许跨天">
                  <el-switch v-model="form.allowCrossDay" :active-value="1" :inactive-value="0"/>
                  <span class="sub-text" style="margin-left:10px">关闭后仅能约同一天</span>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="需要资质">
                  <el-switch v-model="form.needQualification" :active-value="1" :inactive-value="0"/>
                  <span class="sub-text" style="margin-left:10px">仅持证用户可预约</span>
                </el-form-item>
              </el-col>
            </el-row>
            <div class="sub-text" style="margin:-4px 0 10px 90px">
              留空表示沿用全局配置（最短 30 分钟 / 最长 30 天）
            </div>
          </el-form>
          <template #footer>
            <el-button @click="dialogVisible = false">取消</el-button>
            <el-button type="primary" :loading="saving" @click="save">保存</el-button>
          </template>
        </el-dialog>
        `,
        setup() {
            const location = window.location;
            const loading = ref(false);
            const records = ref([]);
            const total = ref(0);
            const categories = ref([]);
            const labs = ref([]);
            const query = reactive({ current: 1, size: 10, keyword: '', categoryId: null, labId: null, status: '' });

            const dialogVisible = ref(false);
            const saving = ref(false);
            const formRef = ref();
            const fileInput = ref();
            const form = reactive({ id: null, name: '', code: '', model: '', stock: 1, categoryId: null, labId: null,
                                    purchaseDate: '', description: '', image: '',
                                    minMinutes: null, maxDays: null, allowCrossDay: 1, needQualification: 0 });
            // 预约规则可选值（null = 沿用全局配置，后端按设备优先/全局兜底处理）
            const MIN_MINUTE_OPTIONS = [
                { v: 15, label: '15 分钟' }, { v: 30, label: '30 分钟' }, { v: 60, label: '1 小时' },
                { v: 90, label: '1.5 小时' }, { v: 120, label: '2 小时' }, { v: 180, label: '3 小时' },
                { v: 240, label: '4 小时' }, { v: 360, label: '6 小时' }, { v: 480, label: '8 小时' }
            ];
            const MAX_DAY_OPTIONS = [
                { v: 1, label: '1 天（同一天内）' }, { v: 3, label: '3 天' }, { v: 7, label: '7 天' },
                { v: 14, label: '14 天' }, { v: 30, label: '30 天' }, { v: 60, label: '60 天' }, { v: 90, label: '90 天' }
            ];
            const rules = {
                name: [{ required: true, message: '请输入设备名称', trigger: 'blur' }],
                code: [{ required: true, message: '请输入设备编号', trigger: 'blur' }],
                categoryId: [{ required: true, message: '请选择设备类别', trigger: 'change' }],
                labId: [{ required: true, message: '请选择所属实验室', trigger: 'change' }]
            };

            const loadOptions = async () => {
                categories.value = await Api.get('/category/list');
                labs.value = await Api.get('/lab/list');
            };

            const load = async () => {
                loading.value = true;
                try {
                    const page = await Api.get('/equipment/page', { params: query });
                    records.value = page.records;
                    total.value = page.total;
                } finally {
                    loading.value = false;
                }
            };

            const search = () => { query.current = 1; load(); };
            const reset = () => {
                Object.assign(query, { current: 1, keyword: '', categoryId: null, labId: null, status: '' });
                load();
            };
            const onPageChange = (p, s) => { query.current = p; query.size = s; load(); };

            const catName = (id) => {
                const c = categories.value.find(x => x.id === id);
                return c ? c.name : '';
            };

            const openDialog = (row) => {
                Object.assign(form, row ? {
                    id: row.id, name: row.name, code: row.code, model: row.model,
                    stock: row.stock || 1,
                    categoryId: row.categoryId, labId: row.labId,
                    purchaseDate: row.purchaseDate || '', description: row.description || '',
                    image: row.image || '',
                    minMinutes: row.minMinutes == null ? null : row.minMinutes,
                    maxDays: row.maxDays == null ? null : row.maxDays,
                    allowCrossDay: row.allowCrossDay == null ? 1 : row.allowCrossDay,
                    needQualification: row.needQualification == null ? 0 : row.needQualification
                } : { id: null, name: '', code: '', model: '', stock: 1, categoryId: null, labId: null,
                       purchaseDate: '', description: '', image: '',
                       minMinutes: null, maxDays: null, allowCrossDay: 1, needQualification: 0 });
                dialogVisible.value = true;
            };

            const triggerFile = () => { fileInput.value && fileInput.value.click(); };

            const onFileChange = (ev) => {
                const file = ev.target.files && ev.target.files[0];
                if (!file) return;
                if (file.size > 4 * 1024 * 1024) {
                    ElMessage.warning('图片过大，请选择 4MB 以内的图片');
                    ev.target.value = '';
                    return;
                }
                const reader = new FileReader();
                reader.onload = () => {
                    form.image = reader.result;
                    ElMessage.success('图片已载入，保存后生效');
                };
                reader.readAsDataURL(file);
                ev.target.value = '';
            };

            const save = async () => {
                await formRef.value.validate();
                saving.value = true;
                try {
                    const payload = { ...form };
                    // 未选择类别名时给占位图命名用
                    if (!payload.image) payload.image = '';
                    if (form.id) {
                        await Api.put('/equipment/' + form.id, payload);
                        ElMessage.success('修改成功');
                    } else {
                        await Api.post('/equipment', payload);
                        ElMessage.success('新增成功');
                    }
                    dialogVisible.value = false;
                    load();
                } finally {
                    saving.value = false;
                }
            };

            const remove = (row) => {
                ElMessageBox.confirm(`确定删除设备「${row.name}」吗？`, '删除确认', { type: 'warning' })
                    .then(async () => {
                        await Api.delete('/equipment/' + row.id);
                        ElMessage.success('删除成功');
                        load();
                    }).catch(() => {});
            };

            const changeStatus = async (row, status) => {
                await Api.put(`/equipment/${row.id}/status`, null, { params: { status } });
                ElMessage.success(status === 'REPAIR' ? '设备已标记为维修中，暂停预约' : '设备已恢复正常，可预约');
                load();
            };

            const stockTag = (row) => global.equipStockLabel(row);

            /**
             * 预约规则摘要：展示本机专属规则，全部沿用全局时提示"全局默认"
             */
            const ruleSummary = (row) => {
                const parts = [];
                if (row.minMinutes != null) {
                    parts.push(row.minMinutes >= 60
                        ? '≥' + (row.minMinutes / 60) + '小时'
                        : '≥' + row.minMinutes + '分钟');
                }
                if (row.maxDays != null) parts.push('≤' + row.maxDays + '天');
                if (row.allowCrossDay === 0) parts.push('不可跨天');
                if (row.needQualification === 1) parts.push('需资质');
                return parts.length ? parts.join(' · ') : '全局默认';
            };

            onMounted(() => { loadOptions(); load(); });

            return { loading, records, total, categories, labs, query, dialogVisible, saving,
                     formRef, form, rules, fileInput, location,
                     MIN_MINUTE_OPTIONS, MAX_DAY_OPTIONS,
                     search, reset, onPageChange, openDialog, triggerFile, onFileChange,
                     save, remove, changeStatus, stockTag, ruleSummary,
                     EQUIP_FILTERS: global.EQUIP_FILTERS,
                     equipImg: global.equipImg,
                     makeEquipPlaceholder: global.makeEquipPlaceholder };
        }
    };

    global.EquipmentManageView = EquipmentManageView;
})(window);
