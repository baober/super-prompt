# Super Prompt

Prompt 管理与 AI 优化系统。通过 Web 界面管理、编辑和 AI 优化各类 AI 工具的 Prompt，替代本地 Markdown 文件手动管理方式。

## 功能

- 📁 **多项目管理** — 每个项目对应一个 Markdown 文件，支持创建/重命名/删除/排序
- 📝 **Prompt 管理** — 卡片式列表，支持编辑、标签、拖拽排序、一级撤销
- ✨ **AI 优化** — 一键调用 LLM 优化 Prompt，支持 OpenAI 兼容 API 和 Ollama
- 🔍 **跨项目搜索** — 按内容和标签子串匹配
- 📥 **导出** — 下载项目原始 Markdown 文件
- 🌓 **深色/浅色主题** + 🌐 **中文/英文** 双语切换
- 📂 **侧栏** — 可拖拽调整宽度、折叠/展开

## 快速开始

```bash
# 1. 克隆项目
git clone <repo-url> && cd super-prompt

# 2. 安装 Python 依赖
uv sync

# 3. 安装前端依赖
cd frontend && npm install && cd ..

# 4. 复制配置文件并按需修改
cp config.sample.yaml config.yaml

# 5. 启动应用
./start.sh
```

打开浏览器访问 http://localhost:5173

### 启动参数

| 命令 | 说明 |
|------|------|
| `./start.sh` | 前台启动（`Ctrl+C` 停止） |
| `./start.sh bg` | 后台启动，PID 记录到 `.super-prompt.pid` |
| `./start.sh stop` | 停止后台运行的服务 |

## 配置

复制 `config.sample.yaml` 为 `config.yaml`，然后根据需要修改：

```yaml
server:
  host: "127.0.0.1"      # 绑定地址（127.0.0.1 仅本机，0.0.0.0 允许局域网访问）
  frontend_port: 5173    # 前端端口（修改后需重启）
  backend_port: 8000     # 后端端口（修改后需重启）

storage:
  prompt_dir: "./prompts" # Prompt 文件存储目录（支持绝对路径）

llm_providers:            # LLM 配置，支持多个，同时只能启用一个
  - id: "provider-1"
    name: "GPT-4o"
    type: "openai_compatible"  # openai_compatible 或 ollama
    base_url: "https://api.openai.com/v1"
    api_key: "sk-xxx"
    model: "gpt-4o"
    enabled: true

appearance:
  theme: "dark"           # dark 或 light
  language: "zh"          # zh 或 en
```

> **注意**：`config.yaml` 已被 `.gitignore` 忽略，不会提交到仓库。请勿将 API Key 等敏感信息提交到代码仓库。

LLM 配置也可以在启动后通过 Web 界面的「设置」页面管理。

## 开发

```bash
# 后端开发服务器（自动重载）
uv run uvicorn backend.main:app --reload --port 8000

# 前端开发服务器
cd frontend && npm run dev

# 运行后端测试
uv run python -m pytest backend/tests/ -v

# 运行单个测试文件
uv run python -m pytest backend/tests/test_config.py -v

# 前端类型检查
cd frontend && npx tsc --noEmit
```

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | React + TypeScript + Vite + Tailwind CSS |
| 后端 | Python + FastAPI |
| 存储 | 本地 Markdown 文件（YAML frontmatter） |
| AI | OpenAI 兼容 API |
