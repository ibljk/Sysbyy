/**
 * 系统管理页（管理员）：操作日志、系统配置
 */
(function (global) {
    const { ref, reactive, onMounted } = Vue;

    const SystemView = {
        template: `
        <div class="page-card">
          <el-tabs v-model="activeTab">
            <!-- ===== 操作日志 ===== -->
            <el-tab-pane label="操作日志" name="log">
              <div class="toolbar">
                <el-input v-model="logQuery.keyword" placeholder="用户名 / 详情" clearable style="width:200px" @keyup.enter="loadLogs"/>
                <el-select v-model="logQuery.action" placeholder="操作类型" clearable style="width:140px">
                  <el-option v-for="a in logActions" :key="a" :label="a" :value="a"/>
                </el-select>
                <el-button type="primary" @click="loadLogs">查询</el-button>
              </div>
              <el-table :data="logRecords" v-loading="logLoading" stripe border>
                <el-table-column prop="username" label="操作人" width="110"/>
                <el-table-column prop="action" label="操作类型" width="130">
                  <template #default="{row}"><el-tag size="small">{{ row.action }}</el-tag></template>
                </el-table-column>
                <el-table-column prop="detail" label="操作详情" min-width="200" show-overflow-tooltip/>
                <el-table-column prop="ip" label="IP" width="130"/>
                <el-table-column prop="createTime" label="操作时间" width="170">
                  <template #default="{row}">{{ fmtDateTime(row.createTime) }}</template>
                </el-table-column>
              </el-table>
              <pager :total="logTotal" :page="logQuery.current" :size="logQuery.size"
                     @change="(p,s)=>{logQuery.current=p;logQuery.size=s;loadLogs();}"/>
            </el-tab-pane>

            <!-- ===== 系统配置 ===== -->
            <el-tab-pane label="系统配置" name="config">
              <el-alert type="warning" :closable="false" style="margin-bottom:14px"
                        title="配置修改后立即生效，影响预约规则校验，请谨慎操作。" />
              <el-table :data="configRecords" v-loading="configLoading" stripe border>
                <el-table-column prop="configKey" label="配置键" width="230"/>
                <el-table-column label="配置值" width="200">
                  <template #default="{row}">
                    <el-input v-model="row.configValue" size="small" style="width:150px"/>
                  </template>
                </el-table-column>
                <el-table-column prop="description" label="说明" min-width="220"/>
                <el-table-column label="操作" width="100">
                  <template #default="{row}">
                    <el-button size="small" type="primary" plain @click="saveConfig(row)">保存</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </el-tab-pane>
          </el-tabs>
        </div>
        `,
        setup() {
            const activeTab = ref('log');

            /* 日志 */
            const logLoading = ref(false);
            const logRecords = ref([]);
            const logTotal = ref(0);
            const logQuery = reactive({ current: 1, size: 10, keyword: '', action: '' });
            const logActions = ['登录', '新增设备', '更新设备', '删除设备', '变更设备状态', '新增实验室', '更新实验室',
                '删除实验室', '新增设备类别', '更新设备类别', '删除设备类别', '新增用户', '更新用户', '删除用户',
                '重置密码', '修改密码', '发起预约', '审批预约', '完成预约', '取消预约', '预约审批', '逾期完成', '预约过期', '更新系统配置'];

            /* 配置 */
            const configLoading = ref(false);
            const configRecords = ref([]);

            const loadLogs = async () => {
                logLoading.value = true;
                try {
                    const params = { current: logQuery.current, size: logQuery.size };
                    if (logQuery.keyword) params.keyword = logQuery.keyword;
                    if (logQuery.action) params.action = logQuery.action;
                    const page = await Api.get('/admin/logs/page', { params });
                    logRecords.value = page.records;
                    logTotal.value = page.total;
                } finally {
                    logLoading.value = false;
                }
            };

            const loadConfigs = async () => {
                configLoading.value = true;
                try {
                    configRecords.value = await Api.get('/admin/config/list');
                } finally {
                    configLoading.value = false;
                }
            };

            const saveConfig = async (row) => {
                await Api.put(`/admin/config/${row.id}`, null, { params: { value: row.configValue } });
                ElMessage.success('配置已更新');
                loadConfigs();
            };

            onMounted(() => { loadLogs(); loadConfigs(); });

            return { activeTab, logLoading, logRecords, logTotal, logQuery, logActions,
                     configLoading, configRecords, loadLogs, saveConfig,
                     fmtDateTime: global.fmtDateTime };
        }
    };

    global.SystemView = SystemView;
})(window);
