/**
 * 实验室管理页 + 设备类别管理页（管理员）
 */
(function (global) {
    const { ref, reactive, onMounted } = Vue;

    const LabsView = {
        template: `
        <div class="page-card">
          <el-tabs v-model="activeTab">
            <!-- ===== 实验室管理 ===== -->
            <el-tab-pane label="实验室管理" name="lab">
              <div class="toolbar">
                <el-input v-model="labQuery.keyword" placeholder="实验室名称 / 位置" clearable @keyup.enter="loadLabs"/>
                <el-button type="primary" @click="searchLab">查询</el-button>
                <div style="flex:1"></div>
                <el-button type="success" @click="openLabDialog()"><el-icon><Plus/></el-icon>新增实验室</el-button>
              </div>
              <el-table :data="labRecords" v-loading="labLoading" stripe border>
                <el-table-column prop="name" label="实验室名称" min-width="170"/>
                <el-table-column prop="location" label="位置" min-width="130"/>
                <el-table-column prop="capacity" label="容量(人)" width="90" align="center"/>
                <el-table-column label="开放时间" width="170" align="center">
                  <template #default="{row}">{{ fmtTime(row.openStartTime) }} ~ {{ fmtTime(row.openEndTime) }}</template>
                </el-table-column>
                <el-table-column prop="description" label="描述" min-width="150" show-overflow-tooltip/>
                <el-table-column label="操作" width="160" fixed="right">
                  <template #default="{row}">
                    <el-button size="small" @click="openLabDialog(row)">编辑</el-button>
                    <el-button size="small" type="danger" plain @click="removeLab(row)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>
              <pager :total="labTotal" :page="labQuery.current" :size="labQuery.size" @change="(p,s)=>{labQuery.current=p;labQuery.size=s;loadLabs();}"/>
            </el-tab-pane>

            <!-- ===== 设备类别管理 ===== -->
            <el-tab-pane label="设备类别管理" name="category">
              <div class="toolbar">
                <div style="flex:1"></div>
                <el-button type="success" @click="openCategoryDialog()"><el-icon><Plus/></el-icon>新增类别</el-button>
              </div>
              <el-table :data="categoryRecords" v-loading="categoryLoading" stripe border>
                <el-table-column prop="name" label="类别名称" width="180"/>
                <el-table-column prop="description" label="类别描述" min-width="240"/>
                <el-table-column label="操作" width="160">
                  <template #default="{row}">
                    <el-button size="small" @click="openCategoryDialog(row)">编辑</el-button>
                    <el-button size="small" type="danger" plain @click="removeCategory(row)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </el-tab-pane>
          </el-tabs>
        </div>

        <!-- 实验室对话框 -->
        <el-dialog v-model="labDialogVisible" :title="labForm.id ? '编辑实验室' : '新增实验室'" width="520px" :close-on-click-modal="false">
          <el-form :model="labForm" :rules="labRules" ref="labFormRef" label-width="100px">
            <el-form-item label="实验室名称" prop="name">
              <el-input v-model="labForm.name" placeholder="如：综合楼A101 电子实验室"/>
            </el-form-item>
            <el-form-item label="位置" prop="location">
              <el-input v-model="labForm.location" placeholder="如：综合楼 A 区 101"/>
            </el-form-item>
            <el-form-item label="容量(人)">
              <el-input-number v-model="labForm.capacity" :min="1" :max="500"/>
            </el-form-item>
            <el-form-item label="开放时间">
              <el-time-picker v-model="labForm.openStartTime" format="HH:mm" value-format="HH:mm:ss"
                              placeholder="开始" style="width:150px"/>
              <span style="margin:0 8px;color:var(--text-3)">至</span>
              <el-time-picker v-model="labForm.openEndTime" format="HH:mm" value-format="HH:mm:ss"
                              placeholder="结束" style="width:150px"/>
            </el-form-item>
            <el-form-item label="描述">
              <el-input v-model="labForm.description" type="textarea" :rows="2" placeholder="实验室用途说明"/>
            </el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="labDialogVisible = false">取消</el-button>
            <el-button type="primary" :loading="saving" @click="saveLab">保存</el-button>
          </template>
        </el-dialog>

        <!-- 类别对话框 -->
        <el-dialog v-model="categoryDialogVisible" :title="categoryForm.id ? '编辑类别' : '新增类别'" width="440px" :close-on-click-modal="false">
          <el-form :model="categoryForm" :rules="categoryRules" ref="categoryFormRef" label-width="80px">
            <el-form-item label="类别名称" prop="name">
              <el-input v-model="categoryForm.name" placeholder="如：电子测量仪器"/>
            </el-form-item>
            <el-form-item label="类别描述">
              <el-input v-model="categoryForm.description" type="textarea" :rows="2"/>
            </el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="categoryDialogVisible = false">取消</el-button>
            <el-button type="primary" :loading="saving" @click="saveCategory">保存</el-button>
          </template>
        </el-dialog>
        `,
        setup() {
            const activeTab = ref('lab');

            /* 实验室 */
            const labLoading = ref(false);
            const labRecords = ref([]);
            const labTotal = ref(0);
            const labQuery = reactive({ current: 1, size: 10, keyword: '' });
            const labDialogVisible = ref(false);
            const labFormRef = ref();
            const labForm = reactive({ id: null, name: '', location: '', capacity: 40, openStartTime: '08:00:00', openEndTime: '22:00:00', description: '' });
            const labRules = {
                name: [{ required: true, message: '请输入实验室名称', trigger: 'blur' }],
                location: [{ required: true, message: '请输入位置', trigger: 'blur' }]
            };

            /* 类别 */
            const categoryLoading = ref(false);
            const categoryRecords = ref([]);
            const categoryDialogVisible = ref(false);
            const categoryFormRef = ref();
            const categoryForm = reactive({ id: null, name: '', description: '' });
            const categoryRules = { name: [{ required: true, message: '请输入类别名称', trigger: 'blur' }] };

            const saving = ref(false);

            const loadLabs = async () => {
                labLoading.value = true;
                try {
                    const page = await Api.get('/lab/page', { params: labQuery });
                    labRecords.value = page.records;
                    labTotal.value = page.total;
                } finally {
                    labLoading.value = false;
                }
            };

            const searchLab = () => { labQuery.current = 1; loadLabs(); };

            const openLabDialog = (row) => {
                Object.assign(labForm, row ? {
                    id: row.id, name: row.name, location: row.location, capacity: row.capacity,
                    openStartTime: row.openStartTime || '08:00:00', openEndTime: row.openEndTime || '22:00:00',
                    description: row.description || ''
                } : { id: null, name: '', location: '', capacity: 40, openStartTime: '08:00:00', openEndTime: '22:00:00', description: '' });
                labDialogVisible.value = true;
            };

            const saveLab = async () => {
                await labFormRef.value.validate();
                saving.value = true;
                try {
                    if (labForm.id) {
                        await Api.put('/lab/' + labForm.id, labForm);
                        ElMessage.success('修改成功');
                    } else {
                        await Api.post('/lab', labForm);
                        ElMessage.success('新增成功');
                    }
                    labDialogVisible.value = false;
                    loadLabs();
                } finally {
                    saving.value = false;
                }
            };

            const removeLab = (row) => {
                ElMessageBox.confirm(`确定删除实验室「${row.name}」吗？`, '删除确认', { type: 'warning' })
                    .then(async () => {
                        await Api.delete('/lab/' + row.id);
                        ElMessage.success('删除成功');
                        loadLabs();
                    }).catch(() => {});
            };

            const loadCategories = async () => {
                categoryLoading.value = true;
                try {
                    categoryRecords.value = await Api.get('/category/list');
                } finally {
                    categoryLoading.value = false;
                }
            };

            const openCategoryDialog = (row) => {
                Object.assign(categoryForm, row ? { id: row.id, name: row.name, description: row.description || '' }
                    : { id: null, name: '', description: '' });
                categoryDialogVisible.value = true;
            };

            const saveCategory = async () => {
                await categoryFormRef.value.validate();
                saving.value = true;
                try {
                    if (categoryForm.id) {
                        await Api.put('/category/' + categoryForm.id, categoryForm);
                        ElMessage.success('修改成功');
                    } else {
                        await Api.post('/category', categoryForm);
                        ElMessage.success('新增成功');
                    }
                    categoryDialogVisible.value = false;
                    loadCategories();
                } finally {
                    saving.value = false;
                }
            };

            const removeCategory = (row) => {
                ElMessageBox.confirm(`确定删除类别「${row.name}」吗？`, '删除确认', { type: 'warning' })
                    .then(async () => {
                        await Api.delete('/category/' + row.id);
                        ElMessage.success('删除成功');
                        loadCategories();
                    }).catch(() => {});
            };

            onMounted(() => { loadLabs(); loadCategories(); });

            return { activeTab, labLoading, labRecords, labTotal, labQuery, labDialogVisible, labFormRef,
                     labForm, labRules, categoryLoading, categoryRecords, categoryDialogVisible,
                     categoryFormRef, categoryForm, categoryRules, saving, loadLabs, searchLab, openLabDialog,
                     saveLab, removeLab, openCategoryDialog, saveCategory, removeCategory,
                     fmtTime: global.fmtTime };
        }
    };

    global.LabsView = LabsView;
})(window);
