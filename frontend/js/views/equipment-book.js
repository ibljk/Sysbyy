/**
 * 设备预约视图（用户端）：图片卡片浏览 + 立即预约
 */
(function (global) {
    const { ref, reactive, computed, onMounted } = Vue;

    const EquipmentBookView = {
        template: `
        <div>
          <!-- 公告横幅：展示最新公告，可关闭，点击进入公告列表 -->
          <div v-for="n in visibleNotices" :key="n.id" class="notice-banner" :class="'lv-' + n.level">
            <span class="notice-banner-tag">{{ levelOf(n.level).label }}</span>
            <span class="notice-banner-title">{{ n.title }}</span>
            <span class="notice-banner-text">{{ n.content }}</span>
            <a class="notice-banner-more" @click="$router.to('/notices')">全部公告</a>
            <span class="notice-banner-close" @click="dismissNotice(n)">×</span>
          </div>

          <div class="page-head">
            <div>
              <div class="page-head-title">选择设备，发起预约</div>
              <div class="page-head-sub">提交后由管理员审批，请确认预约时段与实验安排一致</div>
            </div>
            <el-button type="success" plain @click="$router.to('/reservations')">查看我的预约</el-button>
          </div>

          <div class="page-card">
            <div class="toolbar">
              <el-input v-model="query.keyword" placeholder="设备名称 / 编号 / 型号" clearable style="width:220px"
                        @keyup.enter="search" :prefix-icon="'Search'"/>
              <el-select v-model="query.categoryId" placeholder="设备类别" clearable>
                <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id"/>
              </el-select>
              <el-select v-model="query.labId" placeholder="实验室" clearable>
                <el-option v-for="l in labs" :key="l.id" :label="l.name" :value="l.id"/>
              </el-select>
              <el-select v-model="query.status" placeholder="设备状态" clearable style="width:130px">
                <el-option v-for="f in EQUIP_FILTERS" :key="f.value" :label="f.label" :value="f.value"/>
              </el-select>
              <el-button type="primary" @click="search">查询</el-button>
              <el-button @click="reset">重置</el-button>
            </div>

            <!-- 加载骨架 -->
            <div v-if="loading" class="book-grid">
              <div v-for="i in 8" :key="i" class="book-card skeleton-card">
                <div class="skeleton-block" style="height:170px"></div>
                <div style="padding:12px"><div class="skeleton-block" style="height:14px;width:60%"></div></div>
              </div>
            </div>

            <el-empty v-else-if="!records.length" description="没有符合条件的设备，试试调整筛选条件"/>

            <div v-else class="book-grid">
              <div v-for="row in records" :key="row.id" class="book-card">
                <div class="book-img" @click="openDetail(row)">
                  <el-image :src="equipImg(row)" fit="cover" lazy style="width:100%;height:100%"/>
                  <div v-if="row.stock > 1" class="stock-count">×{{ row.stock }}</div>
                  <div class="book-status">
                    <el-tag size="small" :type="stockTag(row).type"
                            effect="dark" round>{{ stockTag(row).text }}</el-tag>
                  </div>
                </div>
                <div class="book-body">
                  <div class="book-name" @click="openDetail(row)">{{ row.name }}</div>
                  <div class="book-meta">
                    <span><el-icon><component :is="'Collection'"/></el-icon>{{ row.categoryName || '-' }}</span>
                    <span><el-icon><component :is="'LocationInformation'"/></el-icon>{{ (row.labName || '').replace('  ', ' ') }}</span>
                  </div>
                  <div class="book-foot">
                    <span class="book-code">{{ row.code }}</span>
                    <el-button size="small" type="primary"
                               :disabled="row.status === 'REPAIR'"
                               @click="openBook(row)">
                      {{ row.status === 'REPAIR' ? '维修中' : '立即预约' }}
                    </el-button>
                  </div>
                </div>
              </div>
            </div>

            <pager :total="total" :page="query.current" :size="query.size" @change="onPageChange"/>
          </div>
        </div>

        <!-- 设备详情 -->
        <el-dialog v-model="detailVisible" :title="detail.name" width="640px">
          <div style="display:flex;gap:16px">
            <el-image :src="detailImg" fit="cover" style="width:220px;height:150px;border-radius:10px;flex-shrink:0"
                      :preview-src-list="[detailImg]" preview-teleported/>
            <div style="flex:1;font-size:13px;color:#606266;line-height:2">
              <div><b style="color:#303133">编号：</b>{{ detail.code }}</div>
              <div><b style="color:#303133">型号：</b>{{ detail.model || '-' }}</div>
              <div><b style="color:#303133">类别：</b>{{ detail.categoryName || '-' }}</div>
              <div><b style="color:#303133">实验室：</b>{{ detail.labName || '-' }}</div>
              <div><b style="color:#303133">购入日期：</b>{{ fmtDate(detail.purchaseDate) }}</div>
              <div><b style="color:#303133">设备数量：</b>{{ detail.stock || 1 }} 台<template v-if="detail.occupiedNow">（当前占用 {{ detail.occupiedNow }} 台，可多人同时预约）</template></div>
              <div><b style="color:#303133">当前状态：</b>
                <el-tag :type="stockTag(detail).type" size="small">{{ stockTag(detail).text }}</el-tag></div>
            </div>
          </div>
          <div style="margin-top:12px;font-size:13px;color:#606266">
            <b style="color:#303133">设备描述：</b>{{ detail.description || '暂无描述' }}
          </div>
          <template #footer>
            <el-button type="primary" :disabled="detail.status === 'REPAIR'" @click="openBook(detail)">
              立即预约
            </el-button>
          </template>
        </el-dialog>

        <!-- 发起预约 -->
        <el-dialog v-model="bookVisible" title="发起设备预约" width="560px" :close-on-click-modal="false" @open="loadBookOptions">
          <el-alert type="info" :closable="false" style="margin-bottom:14px"
                    title="提交后需管理员审批；支持跨天连续预约，单次最长 30 天（含首尾）；开始/结束时刻分别为首日与末日的时刻，需在实验室开放时间内。" />
          <el-form :model="bookForm" :rules="bookRules" ref="bookFormRef" label-width="90px">
            <el-form-item label="预约设备">
              <div style="display:flex;align-items:center;gap:10px;width:100%">
                <el-image :src="bookEquipImg()" fit="cover" style="width:64px;height:44px;border-radius:6px;flex-shrink:0"/>
                <span style="font-size:13px">{{ bookTarget.name }}（{{ bookTarget.code }}）</span>
              </div>
            </el-form-item>
            <el-form-item label="日期范围" prop="dateRange">
              <el-date-picker v-model="bookForm.dateRange" type="daterange"
                              value-format="YYYY-MM-DD" :disabled-date="disabledDate"
                              start-placeholder="开始日期" end-placeholder="结束日期"
                              range-separator="至" style="width:100%"/>
            </el-form-item>
            <el-row :gutter="12">
              <el-col :span="12">
                <el-form-item label="开始时刻" prop="startTime">
                  <el-time-picker v-model="bookForm.startTime" format="HH:mm" value-format="HH:mm:ss"
                                  placeholder="首日时刻" style="width:100%"/>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="结束时刻" prop="endTime">
                  <el-time-picker v-model="bookForm.endTime" format="HH:mm" value-format="HH:mm:ss"
                                  placeholder="末日时刻" style="width:100%"/>
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="预约用途" prop="purpose">
              <el-input v-model="bookForm.purpose" type="textarea" :rows="2" maxlength="200"
                        show-word-limit placeholder="请说明使用设备的用途"/>
            </el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="bookVisible = false">取消</el-button>
            <el-button type="primary" :loading="saving" @click="submitBook">提交申请</el-button>
          </template>
        </el-dialog>
        `,
        setup() {
            const loading = ref(false);
            const records = ref([]);
            const total = ref(0);
            const categories = ref([]);
            const labs = ref([]);
            const query = reactive({ current: 1, size: 12, keyword: '', categoryId: null, labId: null, status: '' });

            const detailVisible = ref(false);
            const detail = reactive({});
            const detailImg = ref('');

            const bookVisible = ref(false);
            const saving = ref(false);
            const bookFormRef = ref();
            const bookTarget = reactive({ name: '', code: '', image: '' });
            const bookForm = reactive({ equipmentId: null, dateRange: [], startTime: '', endTime: '', purpose: '' });
            // 本地日期解析，避免 UTC 时区偏移
            const parseD = (s) => {
                const p = String(s).split('-').map(Number);
                return new Date(p[0], p[1] - 1, p[2]);
            };
            const todayStr = () => {
                const d = new Date();
                const p = (n) => String(n).padStart(2, '0');
                return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
            };
            const MAX_SPAN_DAYS = 30;
            const bookRules = {
                dateRange: [
                    { required: true, message: '请选择预约日期范围', trigger: 'change' },
                    {
                        validator: (rule, v, cb) => {
                            if (!v || v.length !== 2) return cb();
                            if (v[0] < todayStr()) return cb(new Error('开始日期不能早于今天'));
                            const span = Math.round((parseD(v[1]) - parseD(v[0])) / 86400000) + 1;
                            if (span > MAX_SPAN_DAYS) return cb(new Error(`单次预约最长 ${MAX_SPAN_DAYS} 天（含首尾）`));
                            cb();
                        },
                        trigger: 'change'
                    }
                ],
                startTime: [{ required: true, message: '请选择开始时刻', trigger: 'change' }],
                endTime: [{ required: true, message: '请选择结束时刻', trigger: 'change' }],
                purpose: [{ required: true, message: '请填写预约用途', trigger: 'blur' }]
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

            const loadOptions = async () => {
                if (!categories.value.length) categories.value = await Api.get('/category/list');
                if (!labs.value.length) labs.value = await Api.get('/lab/list');
            };

            const search = () => { query.current = 1; load(); };
            const reset = () => {
                Object.assign(query, { current: 1, keyword: '', categoryId: null, labId: null, status: '' });
                load();
            };
            const onPageChange = (p, s) => { query.current = p; query.size = s; load(); };

            const openDetail = (row) => {
                Object.assign(detail, row);
                detailImg.value = global.equipImg(row);
                detailVisible.value = true;
            };

            const openBook = (row) => {
                Object.assign(bookTarget, row);
                Object.assign(bookForm, { equipmentId: row.id, date: '', startTime: '', endTime: '', purpose: '' });
                bookVisible.value = true;
            };

            const loadBookOptions = async () => {
                // 打开弹窗时刷新设备最新状态（可能刚被预约）
                if (bookForm.equipmentId) {
                    try {
                        const fresh = await Api.get('/equipment/' + bookForm.equipmentId);
                        if (fresh) Object.assign(bookTarget, fresh);
                    } catch (e) { /* 忽略 */ }
                }
            };

            const disabledDate = (date) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const max = new Date(today);
                max.setDate(max.getDate() + 30);
                return date < today || date > max;
            };

            const submitBook = async () => {
                try { await bookFormRef.value.validate(); } catch (e) { return; }
                const [d0, d1] = bookForm.dateRange;
                if (d0 === d1 && bookForm.endTime <= bookForm.startTime) {
                    ElMessage.warning('同一天预约时，结束时刻必须晚于开始时刻');
                    return;
                }
                saving.value = true;
                try {
                    await Api.post('/reservation', {
                        equipmentId: bookForm.equipmentId,
                        date: d0,
                        endDate: d1,
                        startTime: bookForm.startTime,
                        endTime: bookForm.endTime,
                        purpose: bookForm.purpose
                    });
                    ElMessage.success('预约申请已提交，请等待管理员审批');
                    bookVisible.value = false;
                    load();
                } finally {
                    saving.value = false;
                }
            };

            const bookEquipImg = () => global.equipImg(bookTarget);
            const stockTag = (row) => global.equipStockLabel(row);

            /* ---------- 顶部公告横幅 ---------- */
            const DISMISS_KEY = 'lab_dismissed_notices';
            const notices = ref([]);
            const dismissed = ref([]);
            try {
                dismissed.value = JSON.parse(localStorage.getItem(DISMISS_KEY) || '[]');
            } catch (e) {
                dismissed.value = [];
            }
            const visibleNotices = computed(() =>
                notices.value.filter(n => dismissed.value.indexOf(n.id) === -1).slice(0, 2));
            const levelOf = (lv) => (global.ANNOUNCE_LEVEL_MAP || {})[lv] || { label: '通知', type: 'info' };
            const dismissNotice = (n) => {
                dismissed.value = dismissed.value.concat([n.id]).slice(-50);
                localStorage.setItem(DISMISS_KEY, JSON.stringify(dismissed.value));
            };
            const loadNotices = async () => {
                try {
                    notices.value = (await Api.get('/announcement/banner')) || [];
                } catch (e) {
                    notices.value = [];
                }
            };

            onMounted(() => { loadOptions(); load(); loadNotices(); });

            return { loading, records, total, categories, labs, query,
                     detailVisible, detail, detailImg,
                     bookVisible, saving, bookFormRef, bookTarget, bookForm, bookRules, bookEquipImg,
                     search, reset, onPageChange, openDetail, openBook, loadBookOptions,
                     disabledDate, submitBook, stockTag,
                     visibleNotices, levelOf, dismissNotice,
                     EQUIP_FILTERS: global.EQUIP_FILTERS,
                     equipImg: global.equipImg, fmtDate: global.fmtDate };
        }
    };

    global.EquipmentBookView = EquipmentBookView;
})(window);
