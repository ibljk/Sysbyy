/**
 * 操作日志页（管理员）：查询系统关键操作留痕
 */
(function (global) {
    const { ref, reactive, onMounted } = Vue;

    const LogsView = {
        template: `
        <div class="page-card">
          <div class="toolbar">
            <el-input v-model="query.keyword" placeholder="操作人 / 详情关键字" clearable style="width:220px" @keyup.enter="search"/>
            <el-select v-model="query.action" placeholder="全部操作类型" clearable style="width:180px">
              <el-option v-for="a in actions" :key="a" :label="a" :value="a"/>
            </el-select>
            <el-button type="primary" @click="search">查询</el-button>
            <el-button @click="reset">重置</el-button>
            <div style="flex:1"></div>
            <el-button @click="load"><el-icon><Refresh/></el-icon>刷新</el-button>
          </div>

          <el-table :data="records" v-loading="loading" stripe border>
            <el-table-column label="操作时间" width="170">
              <template #default="{row}">{{ fmt(row.createTime) }}</template>
            </el-table-column>
            <el-table-column prop="username" label="操作人" width="130">
              <template #default="{row}">{{ row.username || '—' }}</template>
            </el-table-column>
            <el-table-column label="操作类型" width="140" align="center">
              <template #default="{row}">
                <el-tag effect="plain" type="info">{{ row.action }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="detail" label="操作详情" min-width="260" show-overflow-tooltip>
              <template #default="{row}">{{ row.detail || '—' }}</template>
            </el-table-column>
            <el-table-column prop="ip" label="操作IP" width="140">
              <template #default="{row}">{{ row.ip || '—' }}</template>
            </el-table-column>
          </el-table>
          <pager :total="total" :page="query.current" :size="query.size"
                 @change="(p,s)=>{query.current=p;query.size=s;load();}"/>
        </div>
        `,
        setup() {
            const loading = ref(false);
            const records = ref([]);
            const total = ref(0);
            const actions = ref([]);
            const query = reactive({ current: 1, size: 15, keyword: '', action: '' });

            const fmt = (t) => (t ? String(t).replace('T', ' ').slice(0, 19) : '-');

            const load = async () => {
                loading.value = true;
                try {
                    const page = await Api.get('/admin/logs/page', { params: query });
                    records.value = page.records;
                    total.value = page.total;
                } finally {
                    loading.value = false;
                }
            };

            const loadActions = async () => {
                try {
                    actions.value = await Api.get('/admin/logs/actions');
                } catch (e) { /* 忽略：筛选下拉为空不影响主流程 */ }
            };

            const search = () => { query.current = 1; load(); };
            const reset = () => {
                Object.assign(query, { current: 1, size: 15, keyword: '', action: '' });
                load();
            };

            onMounted(() => { load(); loadActions(); });

            return { loading, records, total, actions, query, fmt, load, search, reset };
        }
    };

    global.LogsView = LogsView;
})(window);
