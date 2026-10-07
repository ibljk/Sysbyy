/**
 * API 请求层：axios 封装 + 统一鉴权 + 统一响应处理
 */
(function (global) {
    // 后端服务地址（前后端分离部署时请修改为实际地址）
    const BASE_URL = global.API_BASE_URL || 'http://localhost:8080/api';

    const TOKEN_KEY = 'lab_token';
    const USER_KEY = 'lab_user';

    const http = axios.create({
        baseURL: BASE_URL,
        timeout: 20000
    });

    // 请求拦截器：自动附加 JWT
    http.interceptors.request.use(function (config) {
        const token = localStorage.getItem(TOKEN_KEY);
        if (token) {
            config.headers['Authorization'] = 'Bearer ' + token;
        }
        return config;
    }, function (error) {
        return Promise.reject(error);
    });

    // 响应拦截器：统一解包 Result{code,message,data}
    http.interceptors.response.use(function (response) {
        const result = response.data;
        if (result && result.code === 200) {
            return result.data;
        }
        if (result && (result.code === 401)) {
            global.AuthUtil && global.AuthUtil.logout();
            location.hash = '#/login';
        }
        const msg = (result && result.message) || '请求失败';
        global.ElMessage && global.ElMessage.error(msg);
        return Promise.reject(new Error(msg));
    }, function (error) {
        const res = error.response;
        if (res && res.status === 401) {
            global.AuthUtil && global.AuthUtil.logout();
            location.hash = '#/login';
        }
        const msg = (res && res.data && res.data.message) || error.message || '网络异常';
        global.ElMessage && global.ElMessage.error(msg);
        return Promise.reject(error);
    });

    global.Api = http;
    global.TOKEN_KEY = TOKEN_KEY;
    global.USER_KEY = USER_KEY;

    /**
     * 登录态管理
     */
    global.AuthUtil = {
        setLogin(token, user) {
            localStorage.setItem(TOKEN_KEY, token);
            localStorage.setItem(USER_KEY, JSON.stringify(user));
        },
        getToken() {
            return localStorage.getItem(TOKEN_KEY);
        },
        getUser() {
            try {
                return JSON.parse(localStorage.getItem(USER_KEY));
            } catch (e) {
                return null;
            }
        },
        logout() {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
        }
    };
})(window);
