/**
 * 认证页面：登录 / 注册
 * 布局：左右分栏（左侧品牌面板含设备实拍图组，右侧玻璃表单卡垂直居中）
 *      窄屏（≤1024px）自动塌陷为单列，品牌面板收起、表单卡独占居中
 */
(function (global) {
    const { reactive, ref } = Vue;

    // 左栏品牌面板（登录 / 注册共用）
    // 结构：品牌行 → 主张 → 实拍图组（左大右二）→ 版权
    const BRAND_PANEL = (title, sub) => `
      <aside class="auth-brand">
        <div class="auth-brand-top">
          <div class="auth-brand-mark">
            <span class="logo-mark">
              <el-icon :size="18"><component :is="'Cloudy'"/></el-icon>
            </span>
            <span>
              <span class="name">智云实验设备预约</span>
              <span class="en">Zhiyun Lab Platform</span>
            </span>
          </div>
          <span class="auth-status-chip"><span class="dot"></span>系统在线 · 全天可预约</span>
        </div>

        <div class="auth-brand-body">
          <h1 class="auth-brand-title">${title}</h1>
          <p class="auth-brand-sub">${sub}</p>
        </div>

        <div class="auth-gallery">
          <div class="shot shot-hero">
            <el-image src="/assets/equipment/EQ-0001.png" fit="cover" alt="数字示波器"/>
          </div>
          <div class="shot">
            <el-image src="/assets/equipment/EQ-0011.png" fit="cover" alt="台式离心机"/>
          </div>
          <div class="shot">
            <el-image src="/assets/equipment/EQ-0008.png" fit="cover" alt="桌面 3D 打印机"/>
          </div>
        </div>

        <div class="auth-foot-note">
          <span>© 2026 智云实验设备预约系统</span>
          <span>v 1.0 · Build 2026</span>
        </div>
      </aside>`;

    // ==================== 登录 ====================
    const LoginView = {
        template: `
        <div class="auth-shell">
          ${BRAND_PANEL(
              '每台设备可查、可约、可追溯',
              '从预约申请、审批流转到归还拍照，全流程留痕，设备状态与占用时段实时同步。'
          )}
          <main class="auth-panel">
            <div class="auth-form-card">
              <div class="auth-form">
                <div class="auth-form-head">
                  <div class="auth-form-title">登录系统</div>
                  <div class="auth-form-sub">请输入账号与密码以继续使用</div>
                </div>

                <el-form :model="form" :rules="rules" ref="formRef" label-position="top" @keyup.enter="onSubmit">
                  <el-form-item label="用户名" prop="username">
                    <el-input v-model="form.username" placeholder="请输入用户名" :prefix-icon="'User'"/>
                  </el-form-item>
                  <el-form-item label="密码" prop="password">
                    <el-input v-model="form.password" type="password" show-password placeholder="请输入密码" :prefix-icon="'Lock'"/>
                  </el-form-item>
                  <el-button type="primary" size="large" style="width:100%;margin-top:6px"
                             :loading="loading" @click="onSubmit">登 录</el-button>
                </el-form>

                <div class="auth-foot">
                  还没有账号？<a class="text-link" @click="$router.to('/register')">注册新账号</a>
                </div>

                <div class="auth-hint">
                  演示账号：admin（管理员）、student1（用户），密码均为 123456
                </div>
              </div>
            </div>
          </main>
        </div>`,
        setup() {
            const formRef = ref();
            const loading = ref(false);
            const form = reactive({ username: '', password: '' });
            const rules = {
                username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
                password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
            };
            const onSubmit = async () => {
                await formRef.value.validate();
                loading.value = true;
                try {
                    const data = await Api.post('/auth/login', form);
                    AuthUtil.setLogin(data.token, data.user);
                    ElMessage.success('登录成功，欢迎回来！');
                    const role = (data.user && data.user.role) || 'USER';
                    location.hash = '#' + (global.HOME_PATH[role] || '/book');
                } finally {
                    loading.value = false;
                }
            };
            return { form, rules, formRef, loading, onSubmit };
        }
    };

    // ==================== 注册 ====================
    const RegisterView = {
        template: `
        <div class="auth-shell">
          ${BRAND_PANEL(
              '注册后即可预约实验室设备',
              '浏览设备实拍图与可用时段，提交预约申请，等待管理员审批确认。'
          )}
          <main class="auth-panel">
            <div class="auth-form-card auth-form-card--long">
              <div class="auth-form">
                <div class="auth-form-head">
                  <div class="auth-form-title">注册新账号</div>
                  <div class="auth-form-sub">注册后默认为普通用户，可浏览设备并发起预约</div>
                </div>

                <el-form :model="form" :rules="rules" ref="formRef" label-position="top">
                  <el-form-item label="用户名" prop="username">
                    <el-input v-model="form.username" placeholder="3-20位字母、数字或下划线"/>
                  </el-form-item>
                  <el-form-item label="姓名" prop="realName">
                    <el-input v-model="form.realName" placeholder="请输入真实姓名"/>
                  </el-form-item>

                  <!-- 密码组：双列并排，压缩长表单高度 -->
                  <el-row :gutter="12">
                    <el-col :span="12">
                      <el-form-item label="密码" prop="password">
                        <el-input v-model="form.password" type="password" show-password placeholder="至少6位"/>
                      </el-form-item>
                    </el-col>
                    <el-col :span="12">
                      <el-form-item label="确认密码" prop="confirm">
                        <el-input v-model="form.confirm" type="password" show-password placeholder="再次输入"/>
                      </el-form-item>
                    </el-col>
                  </el-row>

                  <!-- 联系方式组：双列并排，选填项不占独立行 -->
                  <el-row :gutter="12">
                    <el-col :span="12">
                      <el-form-item label="邮箱（选填）" prop="email">
                        <el-input v-model="form.email" placeholder="example@lab.edu.cn"/>
                      </el-form-item>
                    </el-col>
                    <el-col :span="12">
                      <el-form-item label="手机号（选填）" prop="phone">
                        <el-input v-model="form.phone" placeholder="11位手机号"/>
                      </el-form-item>
                    </el-col>
                  </el-row>

                  <el-button type="primary" size="large" style="width:100%;margin-top:6px"
                             :loading="loading" @click="onSubmit">注 册</el-button>
                </el-form>

                <div class="auth-foot">
                  已有账号？<a class="text-link" @click="$router.to('/login')">返回登录</a>
                </div>
              </div>
            </div>
          </main>
        </div>`,
        setup() {
            const formRef = ref();
            const loading = ref(false);
            const form = reactive({
                username: '', realName: '', password: '', confirm: '', email: '', phone: ''
            });
            const rules = {
                username: [
                    { required: true, message: '请输入用户名', trigger: 'blur' },
                    { pattern: /^[a-zA-Z0-9_]{3,20}$/, message: '3-20位字母、数字或下划线', trigger: 'blur' }
                ],
                realName: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
                password: [
                    { required: true, message: '请输入密码', trigger: 'blur' },
                    { min: 6, max: 32, message: '密码长度 6-32 位', trigger: 'blur' }
                ],
                confirm: [{
                    validator: (rule, value, cb) =>
                        value === form.password ? cb() : cb(new Error('两次输入的密码不一致')),
                    trigger: 'blur'
                }],
                email: [{ type: 'email', message: '邮箱格式不正确', trigger: 'blur' }],
                phone: [{ pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }]
            };
            const onSubmit = async () => {
                await formRef.value.validate();
                loading.value = true;
                try {
                    await Api.post('/auth/register', {
                        username: form.username,
                        realName: form.realName,
                        password: form.password,
                        email: form.email || undefined,
                        phone: form.phone || undefined
                    });
                    ElMessage.success('注册成功，请登录');
                    location.hash = '#/login';
                } finally {
                    loading.value = false;
                }
            };
            return { form, rules, formRef, loading, onSubmit };
        }
    };

    global.LoginView = LoginView;
    global.RegisterView = RegisterView;
})(window);
