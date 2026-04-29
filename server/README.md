# Push Server / 推送服务端

Updated / 更新时间: 2026-04-15

## Purpose / 用途

This folder contains the lightweight Web Push relay server used by SchatPhone's real-push baseline.  
本目录包含 SchatPhone 真推送基线所使用的轻量 Web Push 中继服务端。

It is intentionally small and replaceable.  
它被刻意保持为轻量且可替换。

## What It Does / 它负责什么

- Stores browser push subscriptions by `deviceId` / 按 `deviceId` 保存浏览器推送订阅
- Exposes VAPID public key to the frontend / 向前端提供 VAPID 公钥
- Sends real system notifications through Web Push / 通过 Web Push 发送真正的系统通知
- Provides a `test push` endpoint for Settings verification / 提供 Settings 内使用的测试推送接口

## What It Does Not Do / 它暂时不负责什么

- It does not generate AI events by itself while the app is fully closed.  
  它暂时不会在页面完全关闭时自行生成 AI 事件。
- It does not replace the app's current scheduler or restore-time settlement logic.  
  它不替代应用当前的调度器与恢复补算逻辑。

## Commands / 命令

```bash
npm run push:server
npm run push:keys
```

## Endpoints / 接口

- `GET /health`
- `GET /api/push/health`
- `GET /api/push/vapid-public-key`
- `POST /api/push/subscribe`
- `POST /api/push/unsubscribe`
- `POST /api/push/notify`
- `POST /api/push/test`

## Data Files / 数据文件

- `server/data/push-config.json`: generated VAPID keys / 自动生成的 VAPID 密钥
- `server/data/push-subscriptions.json`: saved device subscriptions / 已保存的设备订阅

Both files are ignored by Git.  
这两个文件都已被 Git 忽略。

## Local Testing / 本地测试

1. Run the app dev server: `npm run dev`
2. Run the push relay server: `npm run push:server`
3. Open Settings -> Notifications -> Real Push
4. Enter a reachable push server URL if needed
5. Click `Authorize & subscribe`
6. Click `Send test push`

1. 运行前端：`npm run dev`
2. 运行推送服务：`npm run push:server`
3. 打开 Settings -> Notifications -> Real Push
4. 如有需要，填写手机可访问的 Push Server 地址
5. 点击“授权并订阅”
6. 点击“发送测试推送”

## 2026-04-16 Update / 2026-04-16 更新

- Scheduled push queue is now available for future delivery jobs.
- 定时推送队列现已可用于未来送达任务。
- Map trip arrival reminder is the first business scenario using this queue.
- 地图行程到达提醒是首个使用该定时推送队列的业务场景。