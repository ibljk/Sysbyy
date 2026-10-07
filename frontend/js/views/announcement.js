/**
 * 公告管理页（管理员）：发布 / 编辑 / 关闭 / 删除系统公告
 */
(function (global) {
    const { ref, reactive, onMounted } = Vue;

    global.ANNOUNCE_LEVEL_MAP = {
        NOTICE: { label: '通知', type: 'info' },
        WARNING: { label: '注意', type: 'warning' },
        URGENT: { label: '紧急', type: 'danger' }
    };

    const AnnouncementView = {
        template: `
        <div class="page-card">
          <div class="toolbar">
            <el-input v-model="query.keyword" placeholder="标题 / 内容关键字" clearable style="width:220px" @keyup.enter="search"/>
            <el-select v-model="query.level" placeholder="全部级别" clearable style="width:130px">
              <el-option v-for="(v,k) in LEVEL_MAP" :key="k" :label="v.label" :value="k"/>
            </el-select>
            <el-select v-model="query.status" placeholder="全部状态" clearable style="width:130px">
              <el-option label="已发布" value="PUBLISHED"/>
              <el-option label="已关闭" value="CLOSED"/>
            </el-select>
            <el-button type="primary" @click="search">查询</el-button>
            <div style="flex:1"></div>
            <el-button type="success" @click="openDialog()"><el-icon><Plus/></el-icon>发布公告</el-button>
          </div>

          <el-table :data="records" v-loading="loading" stripe border>
            <el-table-column label="级别" width="90" align="center">
              <template #default="{row}">
                <el-tag :type="levelOf(row.level).type" effect="light">{{ levelOf(row.level).label }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip/>
            <el-table-column prop="content" label="内容" min-width="280" show-overflow-tooltip/>
            <el-table-column prop="publisherName" label="发布人" width="110"/>
            <el-table-column label="发布时间" width="165">
              <template #default="{row}">{{ fmt(row.createTime) }}</template>
            </el-table-column>
            <el-table-column label="状态" width="90" align="center">
              <template #default="{row}">
                <el-tag :type="row.status === 'PUBLISHED' ? 'success' : 'info'" effect="plain">
                  {{ row.status === 'PUBLISHED' ? '已发布' : '已关闭' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{row}">
                <el-button size="small" @click="openDialog(row)">编辑</el-button>
                <el-button v-if="row.status === 'PUBLISHED'" size="small" type="warning" plain
                           @click="close(row)">关闭</el-button>
                <el-button size="small" type="danger" plain @click="remove(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <pager :total="total" :page="query.current" :size="query.size"
                 @change="(p,s)=>{query.current=p;query.size=s;load();}"/>
        </div>

        <el-dialog v-model="dialogVisible" :title="form.id ? '编辑公告' : '发布公告'" width="600px" :close-on-click-modal="false">
          <el-form :model="form" :rules="rules" ref="formRef" label-width="80px">
            <el-form-item label="标题" prop="title">
              <el-input v-model="form.title" maxlength="80" show-word-limit placeholder="如：国庆假期实验室开放安排"/>
            </el-form-item>
            <el-form-item label="级别" prop="level">
              <el-radio-group v-model="form.level">
                <el-radio-button v-for="(v,k) in LEVEL_MAP" :key="k" :label="k">{{ v.label }}</el-radio-button>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="内容" prop="content">
              <el-input v-model="form.content" type="textarea" :rows="5" maxlength="1000" show-word-limit
                        placeholder="请输入公告内容，用户端将在设备预约页顶部与公告列表中看到"/>
            </el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="dialogVisible = false">取消</el-button>
            <el-button type="primary" :loading="saving" @click="save">保存</el-button>
          </template>
        </el-dialog>
        `,
        setup() {
            const LEVEL_MAP = global.ANNOUNCE_LEVEL_MAP;
            const loading = ref(false);
            const saving = ref(false);
            const records = ref([]);
            const total = ref(0);
            const query = reactive({ current: 1, size: 10, keyword: '', level: '', status: '' });
            const dialogVisible = ref(false);
            const formRef = ref();
            const form = reactive({ id: null, title: '', content: '', level: 'NOTICE' });
            const rules = {
                title: [{ required: true, message: '请输入公告标题', trigger: 'blur' }],
                content: [{ required: true, message: '请输入公告内容', trigger: 'blur' }]
            };

            const levelOf = (lv) => LEVEL_MAP[lv] || { label: lv || '-', type: 'info' };
            const fmt = (t) => (t ? String(t).replace('T', ' ').slice(0, 16) : '-');

            const load = async () => {
                loading.value = true;
                try {
                    const page = await Api.get('/announcement/page', { params: query });
                    records.value = page.records;
                    total.value = page.total;
                } finally {
                    loading.value = false;
                }
            };
            const search = () => { query.current = 1; load(); };

            const openDialog = (row) => {
                Object.assign(form, row
                    ? { id: row.id, title: row.title, content: row.content, level: row.level }
                    : { id: null, title: '', content: '', level: 'NOTICE' });
                dialogVisible.value = true;
            };

            const save = async () => {
                await formRef.value.validate();
                saving.value = true;
                try {
                    if (form.id) {
                        await Api.put('/announcement/' + form.id, {
                            title: form.title, content: form.content, level: form.level
                        });
                        ElMessage.success('公告已更新');
                    } else {
                        await Api.post('/announcement', {
                            title: form.title, content: form.content, level: form.level
                        });
                        ElMessage.success('公告已发布');
                    }
                    dialogVisible.value = false;
                    load();
                } finally {
                    saving.value = false;
                }
            };

            const close = async (row) => {
                await ElMessageBox.confirm('关闭后用户端不再展示该公告，确定关闭吗？', '提示', { type: 'warning' });
                await Api.post('/announcement/' + row.id + '/close');
                ElMessage.success('公告已关闭');
                load();
            };

            const remove = async (row) => {
                await ElMessageBox.confirm('确定删除公告「' + row.title + '」吗？', '提示', { type: 'warning' });
                await Api.delete('/announcement/' + row.id);
                ElMessage.success('删除成功');
                load();
            };

            onMounted(load);

            return { LEVEL_MAP, loading, saving, records, total, query, dialogVisible, formRef,
                     form, rules, levelOf, fmt, load, search, openDialog, save, close, remove };
        }
    };

    global.AnnouncementView = AnnouncementView;
})(window);
