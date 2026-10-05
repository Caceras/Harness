---
description: "面向侧栏与会话首屏的 Harnessie 品牌填充及 Harnessie 配色，仅在 harnessie 构建中生效；供部署或替换 Harnessie 身份的用户与维护者阅读。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-brand-harnessie

[English](README.md) | 中文

## 概述

本包让以 `harnessie` profile 构建的客户端呈现 Harnessie 身份：侧栏显示兔子吉祥物与 Harnessie 名称，空会话显示兔子与 Harnessie 标题，回合运行时显示跳动的兔子，侧栏底部提供安装操作，链接、信息按钮、焦点环与消息气泡使用青色与蓝绿色配色。其他构建 profile 保留外壳回退与默认配色。本包不影响模型请求。

## 目录

- [使用本包](#use-this-package)
- [理解实现](#understand-the-implementation)
- [进一步探索](#further-exploration)
- [模型体验](#model-experience)
- [已知限制与延期工作](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

-----

<a id="use-this-package"></a>
## 使用本包

在 Harnessie 部署中，将本插件挂载到浏览器插件名单，然后以 `DSH_CLIENT_BUILD_PROFILE=harnessie` 构建客户端，让填充得以注册。随附的 Web 名单已在官方品牌包旁挂载本包。

### 选择 profile

`DSH_CLIENT_BUILD_PROFILE` 决定渲染哪个品牌。`harnessie` 构建填充 `sidebar.brand.mark`、`sidebar.brand.name`、`conversation.hero.brand.mark` 与 `conversation.hero.headline`，向 `sidebar.footer.action` 添加 `harnessie-install` 条目，注册 `brandHarnessie` 词典并应用配色；任何其他取值都不注册任何内容，由官方包或外壳回退决定呈现。浏览器标题需同时设置 `DSH_CLIENT_TITLE=Harnessie`：

```sh
DSH_CLIENT_BUILD_PROFILE=harnessie DSH_CLIENT_TITLE=Harnessie pnpm run build
```

同一 profile 还让 Web 应用构建附带 Harnessie 安装清单、PNG 图标与 service worker；[`deploy/harnessie`](../../../deploy/harnessie/Dockerfile) 正是以这种方式构建容器镜像。

### 安装应用

当浏览器通过 `beforeinstallprompt` 提供安装时，安装操作会打开浏览器自带的安装对话框；文档头部脚本会保留在插件加载之前到达的提供。没有提供时，该操作会说明通过浏览器菜单安装的途径。页面以已安装应用窗口运行时，以及浏览器报告安装完成后，该操作会隐藏。延迟的对话框只能打开一次；下一次提供会在之后的页面加载中到达。

### 替换品牌

使用其他身份的部署不组合本包，而是组合自己的、占据相同 slot 的包。占据 slot 是唯一的组合路径；这里不存在任何品牌配置面。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现内部细节——点击展开</summary>

侧栏标志与名称作为一组感知声明的注册集安装，首屏标志则在其自身声明上单独安装：嵌套的 `ctx.slots.inject()` 调用会等待各自的声明方，因此无论本行在声明方之前还是之后激活，注册集都能生效，并在声明撤销时干净地撤回。吉祥物是以 data URL 内联进 bundle 的 PNG。配色是一个 `?inline` 样式表，由插件持有的 effect 连同 `--harnessie-mascot` 图片 URL 一起追加到文档 head；它在 `html body` 下重新定义 `--dsw-static-deepseek-*` 色阶，优先级高于主题自身的 `body` 规则，并在 `[data-chat-running]` 内按 CSS 模块类名后缀 `_runningIcon` 匹配运行状态图标，用吉祥物覆盖它。[`src/client/install.ts`](src/client/install.ts) 保存安装状态，安装操作通过其 `useInstallState` hook 读取。浏览器半边是 [`src/client/index.ts`](src/client/index.ts)；node 半边是一个空的 Loader 席位。

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

当品牌表层不够用时阅读以下页面。它们从本包占据的 slot 一路讲到渲染这些 slot 的外壳。

- [ui-sidebar](../ui-sidebar/README.zh.md) — 声明 `sidebar.brand.mark` 与 `sidebar.brand.name` 并渲染其回退。
- [ui-conversation](../ui-conversation/README.zh.md) — 在首屏中声明 `conversation.hero.brand.mark`。
- [ui-brand-official](../ui-brand-official/README.zh.md) — 同一组侧栏 slot 的官方填充。

-----

<a id="model-experience"></a>
## 模型体验

无，本包只提供浏览器呈现；这里没有任何内容进入模型请求。

#### KV Cache 影响

无；本包既不组装也不发送 provider 请求。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

这些限制规定了 Harnessie 呈现的提供方式。它们是本包当前的约束，而非任务清单。

- **运行标记依赖类名** — 聊天的运行图标没有 slot，因此兔子通过 CSS 模块类名后缀 `_runningIcon` 替换它；若该命名改变，会重新显示默认鲸鱼。
- **Desktop 引导插图保持默认** — 引导截图没有 slot。
- **浏览器标题相互独立** — `DSH_CLIENT_TITLE` 在构建时选择标题文本，而不是通过 UI slot。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作背景——点击展开</summary>

无。

</details>
