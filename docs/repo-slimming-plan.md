# Repo Slimming Plan

这个仓库目前以 DIY 版本为目标，保留“聊天 + vault 检索 + project 对话 + OpenRouter 模型”主路径，持续删除不再使用的历史能力与素材。

## 已完成（第 1 轮）

- 删除未被代码和文档引用的图片素材（`images`）：
  - `discord-support.png`
  - `thumbnail-adv-prompt-tutorial.png`
  - `thumbnail-copilot-plus.png`
  - `thumbnail2.png`
  - `ui.jpg`
  - `chat mode image.png`
  - `relevant-notes-in-copilot-chat.png`
- 目标：先清理纯资源冗余，不影响运行逻辑。

## 已完成（第 2 轮）

- 删除历史设计与开发流程文档目录内容（`designdocs/*`）。
- 删除根目录开发辅助文档：
  - `AGENTS.md`
  - `CLAUDE.md`
  - `CONTRIBUTING.md`
- 删除已不再使用的 UI 组件：
  - `src/components/chat-components/ChatSettingsPopover.tsx`
- 精简设置入口，移除 Local Services 引导区：
  - 删除 `src/settings/v2/components/LocalServicesSection.tsx`
  - 更新 `src/settings/v2/components/ApiKeyDialog.tsx`，移除对应引用和渲染
- 删除本地服务说明文档：
  - `local_copilot.md`

## 下一步（第 3 轮：代码精简）

- 删除已停用 provider 的残留 UI/设置入口（仅保留 OpenRouter 使用路径）。
- 清理不再使用的命令与菜单注册。
- 对“仅 Plus/商业能力”残留代码做一次引用扫描后删除。

## 下一步（第 4 轮：文档收敛）

- 说明性文档统一收敛到 `docs/` 下，避免根目录散落多个策略文档。
- 建立最小文档索引：安装、模型配置、Project 工作流、排障。

## 精简原则

- 先删无引用资源，再删弱耦合模块，最后删核心路径旁支逻辑。
- 每轮删除后执行构建，确保功能可用。
- 删除优先级：不用 > 可替代 > 核心路径旁支 > 主路径核心。
