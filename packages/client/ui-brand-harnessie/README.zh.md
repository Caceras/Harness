---
description: "面向侧栏与会话首屏的 Harnessie 品牌填充及 Harnessie 配色，仅在 harnessie 构建中生效；供部署或替换 Harnessie 身份的用户与维护者阅读。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-brand-harnessie

[English](README.md) | 中文

## 概述

本包让以 `harnessie` profile 构建的客户端呈现 Harnessie 身份：侧栏显示兔子吉祥物与 Harnessie 名称，空会话标题前显示兔子，链接、信息按钮、焦点环与消息气泡使用青色与蓝绿色配色。其他构建 profile 保留外壳回退与默认配色。本包不保留运行时状态，也不影响模型请求。

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

`DSH_CLIENT_BUILD_PROFILE` 决定渲染哪个品牌。`harnessie` 构建填充 `sidebar.brand.mark`、`sidebar.brand.name` 与 `conversation.hero.brand.mark`，注册 `brandHarnessie` 词典并应用配色；任何其他取值都不注册任何内容，由官方包或外壳回退决定呈现。浏览器标题需同时设置 `DSH_CLIENT_TITLE=Harnessie`：

```sh
DSH_CLIENT_BUILD_PROFILE=harnessie DSH_CLIENT_TITLE=Harnessie pnpm run build
```

同一 profile 还让 Web 应用构建附带 Harnessie 安装清单、PNG 图标与 service worker；[`deploy/harnessie`](../../../deploy/harnessie/Dockerfile) 正是以这种方式构建容器镜像。

### 替换品牌

使用其他身份的部署不组合本包，而是组合自己的、占据相同 slot 的包。占据 slot 是唯一的组合路径；这里不存在任何品牌配置面。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现内部细节——点击展开</summary>

侧栏标志与名称作为一组感知声明的注册集安装，首屏标志则在其自身声明上单独安装：嵌套的 `ctx.slots.inject()` 调用会等待各自的声明方，因此无论本行在声明方之前还是之后激活，注册集都能生效，并在声明撤销时干净地撤回。吉祥物是以 data URL 内联进 bundle 的 PNG。配色是一个 `?inline` 样式表，由插件持有的 effect 追加到文档 head；它在 `html body` 下重新定义 `--dsw-static-deepseek-*` 色阶，优先级高于主题自身的 `body` 规则。浏览器半边是 [`src/client/index.ts`](src/client/index.ts)；node 半边是一个空的 Loader 席位。

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

- **没有 slot 的品牌图像保持默认** — 聊天中的运行状态鲸鱼与 Desktop 引导插图没有 slot，因此 `harnessie` 构建仍会显示它们。
- **浏览器标题相互独立** — `DSH_CLIENT_TITLE` 在构建时选择标题文本，而不是通过 UI slot。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作背景——点击展开</summary>

无。

</details>
