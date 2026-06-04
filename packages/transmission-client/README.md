# @remote-app/transmission-client

![npm](https://img.shields.io/npm/v/@remote-app/transmission-client)

一个面向 Node.js 和 React Native 的轻量级 [Transmission](https://transmissionbt.com/) RPC 客户端。

## 安装

```bash
npm install @remote-app/transmission-client
```

## 使用

```typescript
import TransmissionClient from "@remote-app/transmission-client";

const client = new TransmissionClient({
  url: "http://localhost:9091/transmission/rpc",
  username: "admin",
  password: "admin",
});

// 获取所有 torrent
const response = await client.request({
  method: "torrent-get",
  arguments: {
    fields: ["id", "name", "status", "percentDone", "rateDownload"],
  },
});

console.log(response.arguments.torrents);

// 添加 torrent
await client.request({
  method: "torrent-add",
  arguments: { filename: "magnet:?xt=urn:btih:..." },
});

// 更新会话设置
await client.request({
  method: "session-set",
  arguments: { "alt-speed-down": 500 },
});
```

该客户端会自动处理 Transmission 的 CSRF 保护（409 session-id 协商）。

## API

该客户端公开一个带类型的 `request` 方法。`method` 字段决定接受哪些 arguments 以及响应的结构。

### Torrent 方法

- `torrent-start` / `torrent-start-now` / `torrent-stop`
- `torrent-verify` / `torrent-reannounce`
- `torrent-set` / `torrent-get`
- `torrent-add` / `torrent-remove`
- `torrent-set-location` / `torrent-rename-path`

### Session 方法

- `session-get` / `session-set`
- `session-stats` / `session-close`

### Queue 方法

- `queue-move-top` / `queue-move-up` / `queue-move-down` / `queue-move-bottom`

### 其他

- `blocklist-update`
- `port-test`
- `free-space`
- `group-get` / `group-set`

## 错误处理

```typescript
import TransmissionClient, {
  HTTPError,
  TransmissionError,
  ResponseParseError,
} from "@remote-app/transmission-client";

try {
  await client.request({ method: "session-stats" });
} catch (error) {
  if (error instanceof HTTPError) {
    // 非 200 HTTP 响应（例如 401 Unauthorized）
    console.error(error.status, error.message);
  } else if (error instanceof TransmissionError) {
    // Transmission 返回 result !== "success"
    console.error(error.message);
  } else if (error instanceof ResponseParseError) {
    // 响应正文不是有效的 JSON
    console.error(error.status, error.body);
  }
}
```

## 许可证

MIT
