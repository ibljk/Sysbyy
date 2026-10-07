/**
 * 应用入口：全局注册、路由、主布局逻辑
 */
(function (global) {
    const { ref, reactive, computed, onMounted } = Vue;

    // 路由表
    const ROUTES = {
        '/login': { title: '登录', component: 'LoginView', auth: false },
        '/register': { title: '注册', component: 'RegisterView', auth: false },
        '/dashboard': { title: '统计看板', component: 'DashboardView', admin: true },
        '/equipment': { title: '设备管理', component: 'EquipmentManageView', admin: true },
        '/book': { title: '设备预约', component: 'EquipmentBookView' },
        '/labs': { title: '实验室管理', component: 'LabsView', admin: true },
        '/reservations': { title: '我的预约', component: 'ReservationsView' },
        '/approval': { title: '预约管理', component: 'ApprovalView', admin: true },
        '/users': { title: '用户管理', component: 'UsersView', admin: true },
        '/system': { title: '系统管理', component: 'SystemView', admin: true },
        // 新增模块
        '/maintenance': { title: '维护报修', component: 'MaintenanceView', admin: true },
        '/qualification': { title: '资质认证', component: 'QualificationView', admin: true },
        '/announcement': { title: '公告管理', component: 'AnnouncementView', admin: true },
        '/logs': { title: '操作日志', component: 'LogsView', admin: true },
        '/repair': { title: '设备报修', component: 'RepairView' },
        '/notices': { title: '系统公告', component: 'NoticesView' }
    };

    // 用户端默认首页 / 管理员默认首页（定义在 utils.js 的 global.HOME_PATH）

    // 菜单配置（管理员端 / 用户端分离，按角色过滤展示）
    const MENUS = [
        // 用户端（普通用户）
        { path: '/book', title: '设备预约', icon: 'Collection', user: true },
        { path: '/reservations', title: '我的预约', icon: 'Calendar', user: true },
        { path: '/repair', title: '设备报修', icon: 'Tools', user: true },
        { path: '/notices', title: '系统公告', icon: 'Bell', user: true },
        // 管理员端
        { path: '/dashboard', title: '统计看板', icon: 'DataAnalysis', admin: true },
        { path: '/equipment', title: '设备管理', icon: 'Cpu', admin: true },
        { path: '/approval', title: '预约管理', icon: 'DocumentChecked', admin: true },
        { path: '/maintenance', title: '维护报修', icon: 'Tools', admin: true },
        { path: '/qualification', title: '资质认证', icon: 'Medal', admin: true },
        { path: '/announcement', title: '公告管理', icon: 'Bell', admin: true },
        { path: '/logs', title: '操作日志', icon: 'Tickets', admin: true },
        { path: '/labs', title: '实验室管理', icon: 'OfficeBuilding', admin: true },
        { path: '/users', title: '用户管理', icon: 'UserFilled', admin: true },
        { path: '/system', title: '系统管理', icon: 'Setting', admin: true }
    ];

    const App = {
        template: '#app-template',
        setup() {
            const user = ref(AuthUtil.getUser());
            const hashPath = ref(getPath());

            function getPath() {
                const h = location.hash.replace(/^#/, '');
                const path = h.split('?')[0] || '/book';
                return ROUTES[path] ? path : '/book';
            }

            // 当前视图（含权限守卫）
            const currentView = computed(() => {
                const route = ROUTES[hashPath.value];
                if (!route) return null;
                if (route.auth === false) return route.component;
                if (!user.value) return 'LoginView';
                // 非管理员访问管理页 → 落到用户端设备预约
                if (route.admin && user.value.role !== 'ADMIN') return 'EquipmentBookView';
                return route.component;
            });

            const isAdmin = computed(() => user.value && user.value.role === 'ADMIN');
            // 菜单按角色过滤：管理员显示 admin 菜单，其余显示 user 菜单
            const menus = computed(() =>
                isAdmin.value
                    ? MENUS.filter(m => m.admin)
                    : MENUS.filter(m => m.user));
            // 基于响应式 hashPath 计算，保证路由切换时菜单高亮 / 页面标题同步更新
            const activeMenu = computed(() => hashPath.value);
            const pageTitle = computed(() => {
                const route = ROUTES[hashPath.value];
                return route ? route.title : '';
            });

            // 菜单点击
            const onMenuSelect = (path) => {
                location.hash = '#' + path;
            };

            // 顶部下拉
            const pwdDialogVisible = ref(false);
            const pwdLoading = ref(false);
            const pwdFormRef = ref();
            const pwdForm = reactive({ oldPassword: '', newPassword: '', confirm: '' });
            const pwdRules = {
                oldPassword: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
                newPassword: [
                    { required: true, message: '请输入新密码', trigger: 'blur' },
                    { min: 6, max: 32, message: '密码长度 6-32 位', trigger: 'blur' }
                ],
                confirm: [{
                    validator: (rule, value, cb) =>
                        value === pwdForm.newPassword ? cb() : cb(new Error('两次输入的密码不一致')),
                    trigger: 'blur'
                }]
            };

            const onHeaderCommand = (cmd) => {
                if (cmd === 'logout') {
                    AuthUtil.logout();
                    user.value = null;
                    location.hash = '#/login';
                    ElMessage.success('已退出登录');
                } else if (cmd === 'password') {
                    Object.assign(pwdForm, { oldPassword: '', newPassword: '', confirm: '' });
                    pwdDialogVisible.value = true;
                }
            };

            const submitPassword = async () => {
                await pwdFormRef.value.validate();
                pwdLoading.value = true;
                try {
                    await Api.put('/user/password', {
                        oldPassword: pwdForm.oldPassword,
                        newPassword: pwdForm.newPassword
                    });
                    ElMessage.success('密码修改成功');
                    pwdDialogVisible.value = false;
                } finally {
                    pwdLoading.value = false;
                }
            };

            // 监听路由变化
            onMounted(() => {
                window.addEventListener('hashchange', () => {
                    const u = AuthUtil.getUser();
                    if (u && !user.value) user.value = u;
                    if (!u && user.value) user.value = null;
                    // 权限守卫：非管理员访问管理页时，修正地址栏回用户端设备预约
                    const p = getPath();
                    const route = ROUTES[p];
                    if (route && route.admin && user.value && user.value.role !== 'ADMIN' && p !== '/book') {
                        location.hash = '#/book';
                        return;
                    }
                    hashPath.value = p;
                });
            });

            return { user, currentView, menus, activeMenu, pageTitle, isAdmin,
                     onMenuSelect, onHeaderCommand, pwdDialogVisible, pwdLoading, pwdFormRef,
                     pwdForm, pwdRules, submitPassword, ROLE_MAP: global.ROLE_MAP };
        }
    };

    const app = Vue.createApp(App);

    // 注册 Element Plus（含中文语言包）
    const locale = (typeof global.ElementPlusLocaleZhCn !== 'undefined') ? global.ElementPlusLocaleZhCn : undefined;
    app.use(global.ElementPlus, locale ? { locale } : undefined);

    // 全局注册图标组件。
    // 说明：DOM 模板（x-template）会把 <Search/> 解析为小写 search，故额外注册小写别名；
    // 跳过 HTML/内置保留标签名（select/menu/view 等），避免 Vue 警告。
    const NATIVE_TAGS = new Set(['a','abbr','address','area','article','aside','audio','b','base','bdi','bdo',
        'blockquote','body','br','button','canvas','caption','cite','code','col','colgroup','data','datalist',
        'dd','del','details','dfn','dialog','div','dl','dt','em','embed','fieldset','figcaption','figure',
        'footer','form','h1','h2','h3','h4','h5','h6','head','header','hgroup','hr','html','i','iframe','img',
        'input','ins','kbd','label','legend','li','link','main','map','mark','menu','meta','meter','nav',
        'noscript','object','ol','optgroup','option','output','p','param','picture','pre','progress','q','rp',
        'rt','ruby','s','samp','script','section','select','slot','small','source','span','strong','style',
        'sub','summary','sup','table','tbody','td','template','textarea','tfoot','th','thead','time','title',
        'tr','track','u','ul','var','video','wbr','svg','math','filter','switch','view']);
    if (global.ElementPlusIconsVue) {
        for (const [name, comp] of Object.entries(global.ElementPlusIconsVue)) {
            app.component(name, comp);
            const lower = name.toLowerCase();
            if (!NATIVE_TAGS.has(lower)) {
                app.component(lower, comp);
            }
        }
    }

    // 全局组件
    app.component('status-tag', global.StatusTag);
    app.component('pager', global.Pager);

    // 注册全部视图组件（currentView 以字符串形式使用 :is 动态渲染，必须注册）
    const VIEW_COMPONENTS = [
        'LoginView', 'RegisterView', 'DashboardView', 'EquipmentManageView', 'EquipmentBookView',
        'LabsView', 'ReservationsView', 'ApprovalView', 'UsersView', 'SystemView',
        // 新增模块：维护报修 / 资质认证 / 公告管理 / 操作日志 / 设备报修 / 系统公告
        'MaintenanceView', 'QualificationView', 'AnnouncementView', 'LogsView', 'RepairView', 'NoticesView'
    ];
    VIEW_COMPONENTS.forEach(name => {
        if (global[name]) {
            app.component(name, global[name]);
        } else {
            console.error('视图组件未找到: ' + name);
        }
    });

    // 提供 $router（供模板中 this.$router.to 使用）
    app.config.globalProperties.$router = {
        to(path) { location.hash = '#' + path; }
    };

    app.mount('#app');
})(window);
