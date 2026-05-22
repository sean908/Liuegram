# Liuegram

Liuegram 是一个运行在 Cloudflare Workers 上的 Telegram 双向消息转发机器人。项目受 Livegram 启发，目标是提供无广告、可自部署、可扩展的客服会话体验。

当前公开分支版本：`v0.1.0-alpha.3`。

## 功能

- 用户和客服 supergroup topic 之间双向转发消息。
- 每个用户自动创建独立 topic，实现会话隔离。
- 支持完全禁言：用户消息不转发，并提示未送达。
- 支持部分禁言：用户消息仍转发，但客服 topic 中会标记禁言状态。
- 支持撤回拦截的保留副本模式：用户消息转发到客服 topic 后，客服端副本会保留。
- 支持基础 reaction 同步；受 Telegram Bot API 投递范围限制，并非所有 reaction 场景都可同步。
- 支持回复引用同步：用户和客服回复已映射消息时，另一端会尽量保留对应 reply 关系。
- 支持设置客服群管理员命令菜单。
- 支持 Cloudflare Workers + D1 免 VPS 部署。

## 当前限制

- 普通 Telegram Bot API 不提供普通私聊消息撤回事件；撤回拦截是“保留客服端副本”，不是实时撤回通知。
- 管理员在 topic 中删除消息，不会自动删除用户私聊中的对应消息。
- Telegram 命令菜单按 chat/admin scope 生效，不支持按 forum topic 单独配置。
- 不使用 MTProto/userbot，不需要登录真人账号。

## 准备

1. 创建 Telegram bot，并把 bot 加入一个开启 topics 的 forum supergroup。
2. 复制 `.env.example` 为 `.dev.vars`，填写：
   - `BOT_TOKEN`
   - `WEBHOOK_SECRET`
   - `ADMIN_GROUP_ID`
3. 创建 Cloudflare D1 数据库，并把 `wrangler.toml` 中的 `database_id` 替换为真实值。
4. 安装依赖并应用迁移：

```sh
npm install
npm run db:migrate:local
```

迁移脚本使用 `wrangler.toml` 中的 D1 binding `DB`，不要把 binding 改成数据库名。

不要把 `.dev.vars`、bot token、webhook secret、真实 supergroup ID 或真实 D1 database ID 提交到仓库。

## 开发

```sh
npm run dev
```

## 部署

先在 Cloudflare 配置生产 secret：

```sh
npx wrangler secret put BOT_TOKEN
npx wrangler secret put WEBHOOK_SECRET
npx wrangler secret put ADMIN_GROUP_ID
```

应用远程数据库迁移并部署 Worker：

```sh
npm run db:migrate:remote
npm run deploy
```

设置 Telegram webhook：

```sh
BOT_TOKEN=... \
WEBHOOK_SECRET=... \
WEBHOOK_URL=https://example.workers.dev \
npm run webhook:set
```

如需丢弃旧的积压更新：

```sh
DROP_PENDING_UPDATES=true \
BOT_TOKEN=... \
WEBHOOK_SECRET=... \
WEBHOOK_URL=https://example.workers.dev \
npm run webhook:set
```

查看 Telegram 当前记录的 webhook：

```sh
BOT_TOKEN=... npm run webhook:info
```

设置客服群管理员命令菜单：

```sh
BOT_TOKEN=... ADMIN_GROUP_ID=... npm run commands:set
```

`WEBHOOK_SECRET` 必须和 Cloudflare Worker 中配置的 secret 完全一致。

## 管理命令

以下命令在客服 forum group 的用户 topic 中使用：

- `/status`
- `/mute full`
- `/mute partial`
- `/unmute`
- `/delete_intercept on`
- `/delete_intercept off`
- `/close`

## License

MIT License. Copyright (c) 2026 sean908 <liuegram@2088.eu.org>.
