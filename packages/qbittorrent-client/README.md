# @remote-app/qbittorrent-client

![npm](https://img.shields.io/npm/v/@remote-app/qbittorrent-client)

一个面向 Node.js 和 React Native 的轻量级 [qBittorrent](https://www.qbittorrent.org/) WebUI API 客户端。

## 安装

```bash
npm install @remote-app/qbittorrent-client
```

## 使用

```typescript
import QBittorrentClient from "@remote-app/qbittorrent-client";

const client = new QBittorrentClient({
  url: "http://localhost:8080",
  username: "admin",
  password: "adminadmin",
});

// 列出所有 torrent
const torrents = await client.info();

// 使用过滤器列出 torrent
const downloading = await client.info({ filter: "downloading" });

// 通过 URL 添加 torrent
await client.add({ urls: "magnet:?xt=urn:btih:..." });

// 启动和停止 torrent
await client.start(["<hash>"]);
await client.stop(["<hash>"]);

// 获取传输信息
const transfer = await client.transferInfo();
console.log(transfer.dl_info_speed, transfer.up_info_speed);
```

该客户端会自动处理基于 cookie 的身份验证，并在收到 403 响应时重新进行身份验证。

## API

### Torrent

| 方法 | 说明 |
|---|---|
| `info(params?)` | 列出 torrent（支持可选过滤器、排序、分页） |
| `properties(hash)` | 获取 torrent 属性 |
| `files(hash)` | 获取 torrent 文件 |
| `trackers(hash)` | 获取 torrent tracker |
| `pieceStates(hash)` | 获取分片下载状态 |
| `add(params)` | 添加 torrent（通过 URL 或 `.torrent` Blob） |
| `delete(hashes, deleteFiles?)` | 删除 torrent |
| `start(hashes)` | 启动 torrent |
| `stop(hashes)` | 停止 torrent |
| `recheck(hashes)` | 重新校验 torrent |
| `reannounce(hashes)` | 重新向 tracker 宣告 torrent |
| `setDownloadLimit(hashes, limit)` | 设置每个 torrent 的下载限制（字节/秒） |
| `setUploadLimit(hashes, limit)` | 设置每个 torrent 的上传限制（字节/秒） |
| `setShareLimits(hashes, ratio, seedingTime, inactiveTime)` | 设置分享限制 |
| `setLocation(hashes, location)` | 将 torrent 移动到新位置 |
| `rename(hash, name)` | 重命名 torrent |
| `filePrio(hash, fileIds, priority)` | 设置文件优先级 |
| `setForceStart(hashes, value)` | 强制启动 torrent |
| `topPrio(hashes)` / `bottomPrio(hashes)` | 移动到队列顶部/底部 |
| `increasePrio(hashes)` / `decreasePrio(hashes)` | 在队列中上移/下移 |

### 传输

| 方法 | 说明 |
|---|---|
| `transferInfo()` | 获取全局传输信息 |
| `speedLimitsMode()` | 获取备用速度限制模式（0 或 1） |
| `toggleSpeedLimitsMode()` | 切换备用速度限制 |
| `setGlobalDownloadLimit(limit)` | 设置全局下载限制（字节/秒） |
| `setGlobalUploadLimit(limit)` | 设置全局上传限制（字节/秒） |

### 应用

| 方法 | 说明 |
|---|---|
| `version()` | 获取 qBittorrent 版本 |
| `webapiVersion()` | 获取 WebUI API 版本 |
| `preferences()` | 获取应用程序首选项 |
| `setPreferences(prefs)` | 设置应用程序首选项 |
| `defaultSavePath()` | 获取默认保存路径 |
| `shutdown()` | 关闭 qBittorrent |

### Peer

| 方法 | 说明 |
|---|---|
| `torrentPeers(hash, rid?)` | 获取 torrent peer 数据 |

## 错误处理

```typescript
import QBittorrentClient, {
  HTTPError,
  QBittorrentError,
} from "@remote-app/qbittorrent-client";

try {
  await client.info();
} catch (error) {
  if (error instanceof HTTPError) {
    // 非 200 HTTP 响应（例如 403 Forbidden）
    console.error(error.status, error.message);
  } else if (error instanceof QBittorrentError) {
    // API 级别错误（例如登录失败、添加 torrent 失败）
    console.error(error.message);
  }
}
```

## 许可证

MIT
