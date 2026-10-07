/**
 * 用户管理页（管理员）
 */
(function (global) {
    const { ref, reactive, onMounted } = Vue;

    const UsersView = {
        template: `
        <div class="page-card">
          <div class="toolbar">
            <el-input v-model="query.keyword" placeholder="用户名 / 姓名 / 手机号" clearable style="width:220px" @keyup.enter="search"/>
            <el-select v-model="query.role" placeholder="角色" clearable style="width:120px">
              <el-option v-for="(v, k) in ROLE_MAP" :key="k" :label="v" :value="k"/>
            </el-select>
            <el-button type="primary" @click="search"><el-icon><Search/></el-icon>查询</el-button>
            <div style="flex:1"></div>
            <el-button type="success" @click="openDialog()"><el-icon><Plus/></el-icon>新增用户</el-button>
          </div>

          <el-table :data="records" v-loading="loading" stripe border>
            <el-table-column prop="username" label="用户名" width="110"/>
            <el-table-column prop="realName" label="姓名" width="110"/>
            <el-table-column label="角色" width="90" align="center">
              <template #default="{row}">
                <el-tag size="small" :type="row.role === 'ADMIN' ? 'danger' : 'primary'">
                  {{ ROLE_MAP[row.role] || row.role }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="email" label="邮箱" min-width="170"/>
            <el-table-column prop="phone" label="手机号" width="125"/>
            <el-table-column label="状态" width="80" align="center">
              <template #default="{row}">
                <el-tag size="small" :type="row.status === 1 ? 'success' : 'info'">
                  {{ row.status === 1 ? '启用' : '禁用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createTime" label="注册时间" width="160">
              <template #default="{row}">{{ fmtDateTime(row.createTime) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="220" fixed="right">
              <template #default="{row}">
                <el-button size="small" @click="openDialog(row)">编辑</el-button>
                <el-button size="small" type="warning" plain @click="resetPwd(row)">重置密码</el-button>
                <el-button size="small" type="danger" plain @click="remove(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>

          <pager :total="total" :page="query.current" :size="query.size" @change="onPageChange"/>
        </div>

        <!-- 新增 / 编辑用户对话框 -->
        <el-dialog v-model="dialogVisible" :title="form.id ? '编辑用户' : '新增用户'" width="520px" :close-on-click-modal="false">
          <el-form :model="form" :rules="rules" ref="formRef" label-width="90px">
            <el-form-item label="用户名" prop="username">
              <el-input v-model="form.username" :disabled="!!form.id" placeholder="3-20位字母/数字/下划线"/>
            </el-form-item>
            <el-form-item label="姓名" prop="realName">
              <el-input v-model="form.realName" placeholder="请输入姓名"/>
            </el-form-item>
            <el-form-item v-if="!form.id" label="初始密码" prop="password">
              <el-input v-model="form.password" type="password" show-password placeholder="至少6位"/>
            </el-form-item>
            <el-form-item label="角色" prop="role">
              <el-select v-model="form.role" style="width:100%">
                <el-option v-for="(v, k) in ROLE_MAP" :key="k" :label="v" :value="k"/>
              </el-select>
            </el-form-item>
            <el-form-item label="邮箱">
              <el-input v-model="form.email" placeholder="example@lab.edu.cn"/>
            </el-form-item>
            <el-form-item label="手机号">
              <el-input v-model="form.phone" placeholder="11位手机号"/>
            </el-form-item>
            <el-form-item v-if="form.id" label="状态">
              <el-switch v-model="form.status" :active-value="1" :inactive-value="0" active-text="启用" inactive-text="禁用"/>
            </el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="dialogVisible = false">取消</el-button>
            <el-button type="primary" :loading="saving" @click="save">保存</el-button>
          </template>
        </el-dialog>
        `,
        setup() {
            const loading = ref(false);
            const records = ref([]);
            const total = ref(0);
            const query = reactive({ current: 1, size: 10, keyword: '', role: '' });

            const dialogVisible = ref(false);
            const saving = ref(false);
            const formRef = ref();
            const form = reactive({ id: null, username: '', realName: '', password: '', role: 'USER', email: '', phone: '', status: 1 });
            const rules = {
                username: [
                    { required: true, message: '请输入用户名', trigger: 'blur' },
                    { pattern: /^[a-zA-Z0-9_]{3,20}$/, message: '3-20位字母/数字/下划线', trigger: 'blur' }
                ],
                realName: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
                password: [
                    { required: true, message: '请输入初始密码', trigger: 'blur' },
                    { min: 6, max: 32, message: '密码长度 6-32 位', trigger: 'blur' }
                ],
                role: [{ required: true, message: '请选择角色', trigger: 'change' }]
            };

            const load = async () => {
                loading.value = true;
                try {
                    const params = { current: query.current, size: query.size };
                    if (query.keyword) params.keyword = query.keyword;
                    if (query.role) params.role = query.role;
                    const page = await Api.get('/user/page', { params });
                    records.value = page.records;
                    total.value = page.total;
                } finally {
                    loading.value = false;
                }
            };

            const search = () => { query.current = 1; load(); };
            const onPageChange = (p, s) => { query.current = p; query.size = s; load(); };

            const openDialog = (row) => {
                Object.assign(form, row ? {
                    id: row.id, username: row.username, realName: row.realName, role: row.role,
                    email: row.email || '', phone: row.phone || '', status: row.status, password: ''
                } : { id: null, username: '', realName: '', password: '', role: 'USER', email: '', phone: '', status: 1 });
                dialogVisible.value = true;
            };

            const save = async () => {
                await formRef.value.validate();
                saving.value = true;
                try {
                    if (form.id) {
                        await Api.put('/user/' + form.id, {
                            realName: form.realName, role: form.role,
                            email: form.email || null, phone: form.phone || null, status: form.status
                        });
                        ElMessage.success('修改成功');
                    } else {
                        await Api.post('/user', {
                            username: form.username, password: form.password, realName: form.realName,
                            role: form.role, email: form.email || undefined, phone: form.phone || undefined
                        });
                        ElMessage.success('新增成功');
                    }
                    dialogVisible.value = false;
                    load();
                } finally {
                    saving.value = false;
                }
            };

            const resetPwd = (row) => {
                ElMessageBox.confirm(`确定将「${row.username}」的密码重置为 123456 吗？`, '重置密码', { type: 'warning' })
                    .then(async () => {
                        await Api.put(`/user/${row.id}/reset-password`);
                        ElMessage.success('密码已重置为 123456');
                    }).catch(() => {});
            };

            const remove = (row) => {
                ElMessageBox.confirm(`确定删除用户「${row.username}」吗？`, '删除确认', { type: 'warning' })
                    .then(async () => {
                        await Api.delete('/user/' + row.id);
                        ElMessage.success('删除成功');
                        load();
                    }).catch(() => {});
            };

            onMounted(load);

            return { loading, records, total, query, dialogVisible, saving, formRef, form, rules,
                     search, onPageChange, openDialog, save, resetPwd, remove,
                     ROLE_MAP: global.ROLE_MAP, fmtDateTime: global.fmtDateTime };
        }
    };

    global.UsersView = UsersView;
})(window);
