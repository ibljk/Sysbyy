/**
 * 公告页（用户端）：查看管理员发布的全部公告
 */
(function (global) {
    const { ref, onMounted } = Vue;

    const NoticesView = {
        template: `
        <div class="page-card">
          <div class="toolbar">
            <div class="page-title-inline">系统公告</div>
            <div style="flex:1"></div>
            <el-button @click="load"><el-icon><Refresh/></el-icon>刷新</el-button>
          </div>

          <div v-loading="loading">
            <el-empty v-if="!records.length" description="暂无公告"/>
            <div v-else class="notice-list">
              <div v-for="row in records" :key="row.id" class="notice-item" :class="'lv-' + row.level">
                <div class="notice-head">
                  <el-tag :type="levelOf(row.level).type" effect="light" size="small">
                    {{ levelOf(row.level).label }}
                  </el-tag>
                  <span class="notice-title">{{ row.title }}</span>
                  <span class="notice-time">{{ fmt(row.createTime) }}</span>
                </div>
                <div class="notice-body">{{ row.content }}</div>
                <div class="notice-foot">发布人：{{ row.publisherName || '管理员' }}</div>
              </div>
            </div>
          </div>
        </div>
        `,
        setup() {
            const LEVEL_MAP = global.ANNOUNCE_LEVEL_MAP || {};
            const loading = ref(false);
            const records = ref([]);

            const levelOf = (lv) => LEVEL_MAP[lv] || { label: lv || '-', type: 'info' };
            const fmt = (t) => (t ? String(t).replace('T', ' ').slice(0, 16) : '-');

            const load = async () => {
                loading.value = true;
                try {
                    records.value = await Api.get('/announcement/list', { params: { limit: 50 } });
                } finally {
                    loading.value = false;
                }
            };

            onMounted(load);
            return { loading, records, levelOf, fmt, load };
        }
    };

    global.NoticesView = NoticesView;
})(window);
