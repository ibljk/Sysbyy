#!/usr/bin/env bash
# ============================================================
# 智云实验设备预约管理系统 · 云端一键启动脚本
# 适用于 Cloud Studio / Codespaces / 任意 Linux 环境
#
# 作用：自动准备环境（JDK / Maven）→ 编译 → 单端口模式启动
# 用法：bash start-cloudstudio.sh
# 说明：单端口模式下前端由后端托管、数据库为内嵌 H2，无需安装 MySQL
# ============================================================
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT/backend"

echo "=================================================="
echo "   智云实验设备预约管理系统 · 启动中"
echo "=================================================="

# ---------- 1) JDK ----------
if command -v java >/dev/null 2>&1; then
    echo "[1/4] JDK 就绪：$(java -version 2>&1 | head -1)"
else
    echo "[1/4] 未检测到 JDK，正在安装（约 1-2 分钟）..."
    if command -v apt-get >/dev/null 2>&1; then
        sudo apt-get update -qq && sudo apt-get install -y -qq openjdk-17-jdk-headless
    else
        echo "  ✗ 未找到包管理器，请手动安装 JDK 8+ 后重试"
        exit 1
    fi
    echo "      JDK 安装完成：$(java -version 2>&1 | head -1)"
fi

# ---------- 2) Maven ----------
if command -v mvn >/dev/null 2>&1; then
    echo "[2/4] Maven 就绪：$(mvn -v 2>&1 | head -1)"
else
    echo "[2/4] 未检测到 Maven，正在安装..."
    if command -v apt-get >/dev/null 2>&1; then
        sudo apt-get update -qq && sudo apt-get install -y -qq maven
    else
        echo "  ✗ 未找到包管理器，请手动安装 Maven 后重试"
        exit 1
    fi
    echo "      Maven 安装完成"
fi

# ---------- 3) 编译（jar 已存在则跳过，避免重复等待） ----------
# 云开发环境内存通常较小，限制 Maven 堆大小避免 OOM
export MAVEN_OPTS="${MAVEN_OPTS:--Xmx1024m}"
JAR="target/lab-equipment-reservation-1.0.0.jar"
if [ -f "$JAR" ]; then
    echo "[3/4] 检测到已编译的 jar，跳过编译"
else
    echo "[3/4] 正在编译（首次需下载依赖，约 2-5 分钟，请耐心等待）..."
    mvn -q clean package -DskipTests
    echo "      编译完成：$JAR"
fi

# ---------- 4) 启动（单端口：前端 + 接口同源） ----------
PORT="${PORT:-8080}"
echo "[4/4] 启动服务，端口 $PORT ..."
echo "--------------------------------------------------"
echo "   访问地址：http://localhost:$PORT"
echo "   演示账号：admin / 123456  或  student1 / 123456"
echo "   提示：在 Cloud Studio 底部「端口」面板把 $PORT 设为公开，即可分享给他人"
echo "--------------------------------------------------"

exec java -jar "$JAR" --spring.profiles.active=cloud --server.port="$PORT"
