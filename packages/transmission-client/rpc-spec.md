# Transmission 的 RPC 规范
本文档描述了用于远程与 Transmission 会话交互的协议。

### 1.1 术语
使用 [RFC 4627](https://datatracker.ietf.org/doc/html/rfc4627) 中的 [JSON](https://www.json.org/) 术语。
RPC 请求和响应均以 JSON 格式表示。

### 1.2 工具
如果调用 `transmission-remote` 时带有 `--debug` 参数，它与 Transmission 服务器之间的 RPC 流量会被转储到终端。当你想将应用中的请求与另一个请求进行对照时，这会很有用。

如果运行 `transmission-qt` 时设置了环境变量 `TR_RPC_VERBOSE`，它也会将 RPC 请求和响应转储到终端以供检查。

最后，使用 Transmission Web 客户端中的浏览器开发者工具始终也是一种选择。

### 1.3 现成封装库
Transmission 项目之外的一些人编写了封装此 RPC API 的库。这些库不受 Transmission 项目支持，但列在这里，希望它们可能有用：

| 语言 | 链接
|:---|:---
| C# | https://www.nuget.org/packages/Transmission.API.RPC
| Go | https://github.com/hekmon/transmissionrpc
| Python | https://github.com/Trim21/transmission-rpc
| Rust | https://crates.io/crates/transmission-rpc


## 2 消息格式
消息以对象形式表示。有两种类型：请求（见[第 2.1 节](#21-requests)）和响应（见[第 2.2 节](#22-responses)）。

所有文本**必须**使用 UTF-8 编码。

### 2.1 请求
请求支持三个键：

1. 必需的 `method` 字符串，表示要调用的方法名称
2. 可选的 `arguments` 对象，由 key/value 对组成。允许的键由 `method` 定义。
3. 可选的 `tag` 数字，供客户端跟踪响应。如果请求提供了该值，响应 MUST 包含相同的 tag。

```json
{
   "arguments": {
     "fields": [
       "version"
     ]
   },
   "method": "session-get",
   "tag": 912313
}
```


### 2.2 响应
对请求的响应将包含：

1. 必需的 `result` 字符串，成功时其值 MUST 为 `success`，失败时为错误字符串。
2. 可选的 `arguments` 对象，由 key/value 对组成。其键内容由原始请求的 `method` 和 `arguments` 定义。
3. 可选的 `tag` 数字，如 2.1 所述。

```json
{
   "arguments": {
      "version": "2.93 (3c5870d4f5)"
   },
   "result": "success",
   "tag": 912313
}
```

### 2.3 传输机制
通过 HTTP POST 发送 JSON 编码的请求，是与 Transmission RPC 服务器通信的首选方式。当前 Transmission 实现的默认 URL 为 `http://host:9091/transmission/rpc`。客户端可以将其用作默认值，但应允许重新配置 URL，因为端口和路径可能会被更改，以支持映射和/或在单个服务器上运行多个守护进程。

#### 2.3.1 CSRF 保护
大多数 Transmission RPC 服务器要求请求携带 `X-Transmission-Session-Id` header，以防止 CSRF 攻击。

当你的请求 id 错误时——例如发送第一个请求时，或服务器使 CSRF token 过期时——Transmission RPC 服务器会返回 HTTP 409 错误，并在自己的 headers 中带上正确的 `X-Transmission-Session-Id`。

因此，处理 409 响应的正确方式是更新你的 `X-Transmission-Session-Id`，并重新发送前一个请求。

#### 2.3.2 DNS rebinding 保护
每个 RPC 请求都会进行额外检查，以确保发送请求的客户端使用的是 RPC 服务器预期可用的允许主机名之一。

如果启用了主机白名单（默认即为 true），Transmission 会检查 `Host:` HTTP header 的值（如有端口则去除端口），并将其与白名单名称之一匹配。无论主机白名单内容如何，`localhost` 和 `localhost.` 域名以及所有 IP 地址始终会被隐式允许。

有关配置的更多信息，请参阅 settings.json 文档中的 `rpc-host-whitelist-enabled` 和 `rpc-host-whitelist` 键。

#### 2.3.3 身份验证
启用身份验证是一项可在 Transmission RPC 服务器上启用的可选安全功能。身份验证通过 HTTP Basic Access Authentication 完成。

如果启用了身份验证，Transmission 会检查 `Authorization:` HTTP header 的值以验证请求凭据。该 HTTP header 的值应为 [`Basic <b64 credentials>`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Authorization#basic)，其中 <b64 credentials> 等于由用户名和密码（按此顺序）以冒号分隔后进行 base64 编码得到的字符串。

## 3 Torrent 请求
### 3.1 Torrent 操作请求
| 方法名称          | libtransmission 函数 | 说明
|:--|:--|:--
| `torrent-start`      | tr_torrentStart          | 启动 torrent
| `torrent-start-now`  | tr_torrentStartNow       | 忽略队列位置并启动 torrent
| `torrent-stop`       | tr_torrentStop           | 停止 torrent
| `torrent-verify`     | tr_torrentVerify         | 校验 torrent
| `torrent-reannounce` | tr_torrentManualUpdate   | 立即重新向 tracker 宣告

请求参数：`ids`，指定要使用哪些 torrent。
如果省略 `ids` 参数，则使用所有 torrent。

`ids` 应为以下之一：

1. 表示 torrent id 的整数
2. torrent id 数字、SHA1 hash 字符串或二者混合组成的列表
3. 字符串 `recently-active`，表示最近活跃的 torrent

注意，整数 torrent id 在 Transmission daemon 重启后并不稳定。如果需要稳定 id，请使用 torrent hash。

响应参数：无

### 3.2 Torrent 修改器：`torrent-set`
方法名称：`torrent-set`

请求参数：

| 键 | 值类型 | 值说明
|:--|:--|:--
| `bandwidthPriority`   | number   | 此 torrent 的带宽 tr_priority_t
| `downloadLimit`       | number   | 最大下载速度（KBps）
| `downloadLimited`     | boolean  | 如果遵守 `downloadLimit` 则为 true
| `files-unwanted`      | array    | 不下载的文件索引
| `files-wanted`        | array    | 要下载的文件索引
| `group`               | string   | 此 torrent 的带宽组名称
| `honorsSessionLimits` | boolean  | 如果遵守 session 上传限制则为 true
| `ids`                 | array    | torrent 列表，如 3.1 所述
| `labels`              | array    | 字符串标签数组
| `location`            | string   | torrent 内容的新位置
| `peer-limit`          | number   | 最大 peer 数量
| `priority-high`       | array    | 高优先级文件的索引
| `priority-low`        | array    | 低优先级文件的索引
| `priority-normal`     | array    | 普通优先级文件的索引
| `queuePosition`       | number   | 此 torrent 在其队列中的位置 [0...n)
| `seedIdleLimit`       | number   | torrent 级别的做种不活跃分钟数
| `seedIdleMode`        | number   | 使用哪种做种不活跃限制。见 tr_idlelimit
| `seedRatioLimit`      | double   | torrent 级别的做种比例
| `seedRatioMode`       | number   | 使用哪种比例。见 tr_ratiolimit
| `sequential_download` | boolean  | 按顺序下载 torrent 分片
| `trackerAdd`          | array    | **DEPRECATED** 改用 trackerList
| `trackerList`         | string   | announce URL 字符串，每行一个，[tiers](https://www.bittorrent.org/beps/bep_0012.html) 之间用空行分隔。
| `trackerRemove`       | array    | **DEPRECATED** 改用 trackerList
| `trackerReplace`      | array    | **DEPRECATED** 改用 trackerList
| `uploadLimit`         | number   | 最大上传速度（KBps）
| `uploadLimited`       | boolean  | 如果遵守 `uploadLimit` 则为 true

正如空的 `ids` 值是“所有 ids”的简写，对 `files-wanted`、`files-unwanted`、`priority-high`、`priority-low` 或 `priority-normal` 使用空数组，也是表示“所有文件”的简写。

   响应参数：无

### 3.3 Torrent 访问器：`torrent-get`
方法名称：`torrent-get`。

请求参数：

1. 可选的 `ids` 数组，如 3.1 所述。
2. 必需的 `fields` 键数组。（见下方列表）
3. 可选的 `format` 字符串，指定如何格式化 `torrents` 响应字段。允许值为 `objects`（默认）和 `table`。（见下方“响应参数”）

响应参数：

1. 一个 `torrents` 数组。

   如果 `format` 请求为 `objects`（默认），`torrents` 将是一个对象数组，每个对象包含与请求的 `fields` 参数匹配的 key/value 对。这是 Transmission 3 之前唯一的格式，并且具有一些明显的程序员便利性，例如可直接解析为 Javascript 对象。

   如果格式为 `table`，则 `torrents` 将是一个数组的数组。第一行保存键，其余每一行保存一个 torrent 对应这些键的值。此格式在 JSON 生成和 JSON 解析方面更高效。

2. 如果请求的 `ids` 字段为 `recently-active`，则包含最近移除 torrent 的 torrent-id 数字数组 `removed`。

注意：有关这些字段含义的更多信息，请参阅 [libtransmission/transmission.h](../libtransmission/transmission.h) 中的注释。这里的 'source' 列对应那里的数据结构。

| 键 | 值类型 | transmission.h source
|:--|:--|:--
| `activityDate` | number | tr_stat
| `addedDate` | number | tr_stat
| `availability` | array（见下文）| tr_torrentAvailability()
| `bandwidthPriority` | number | tr_priority_t
| `comment` | string | tr_torrent_view
| `corruptEver`| number | tr_stat
| `creator`| string | tr_torrent_view
| `dateCreated`| number| tr_torrent_view
| `desiredAvailable`| number| tr_stat
| `doneDate`| number | tr_stat
| `downloadDir` | string  | tr_torrent
| `downloadedEver` | number  | tr_stat
| `downloadLimit` | number  | tr_torrent
| `downloadLimited` | boolean | tr_torrent
| `editDate` | number | tr_stat
| `error` | number | tr_stat
| `errorString` | string | tr_stat
| `eta` | number | tr_stat
| `etaIdle` | number | tr_stat
| `file-count` | number | tr_info
| `files`| array（见下文）| n/a
| `fileStats`| array（见下文）| n/a
| `group`| string| n/a
| `hashString`| string| tr_torrent_view
| `haveUnchecked`| number| tr_stat
| `haveValid`| number| tr_stat
| `honorsSessionLimits`| boolean| tr_torrent
| `id` | number | tr_torrent
| `isFinished` | boolean| tr_stat
| `isPrivate` | boolean| tr_torrent
| `isStalled` | boolean| tr_stat
| `labels` | 字符串数组 | tr_torrent
| `leftUntilDone` | number| tr_stat
| `magnetLink` | string| n/a
| `manualAnnounceTime` | number| tr_stat
| `maxConnectedPeers` | number| tr_torrent
| `metadataPercentComplete` | double| tr_stat
| `name` | string| tr_torrent_view
| `peer-limit` | number| tr_torrent
| `peers` | array（见下文）| n/a
| `peersConnected` | number| tr_stat
| `peersFrom` | object（见下文）| n/a
| `peersGettingFromUs` | number| tr_stat
| `peersSendingToUs` | number| tr_stat
| `percentComplete` | double | tr_stat
| `percentDone` | double | tr_stat
| `pieces` | string（见下文）| tr_torrent
| `pieceCount`| number| tr_torrent_view
| `pieceSize`| number| tr_torrent_view
| `priorities`| array（见下文）| n/a
| `primary-mime-type`| string| tr_torrent
| `queuePosition`| number| tr_stat
| `rateDownload` (B/s)| number| tr_stat
| `rateUpload` (B/s)| number| tr_stat
| `recheckProgress`| double| tr_stat
| `secondsDownloading`| number| tr_stat
| `secondsSeeding`| number| tr_stat
| `seedIdleLimit`| number| tr_torrent
| `seedIdleMode`| number| tr_inactivelimit
| `seedRatioLimit`| double| tr_torrent
| `seedRatioMode`| number| tr_ratiolimit
| `sequential_download`| boolean| tr_torrent
| `sizeWhenDone`| number| tr_stat
| `startDate`| number| tr_stat
| `status`| number（见下文）| tr_stat
| `trackers`| array（见下文）| n/a
| `trackerList` | string | announce URL 字符串，每行一个，tiers 之间用空行分隔
| `trackerStats`| array（见下文）| n/a
| `totalSize`| number| tr_torrent_view
| `torrentFile`| string| tr_info
| `uploadedEver`| number| tr_stat
| `uploadLimit`| number| tr_torrent
| `uploadLimited`| boolean| tr_torrent
| `uploadRatio`| double| tr_stat
| `wanted`| array（见下文）| n/a
| `webseeds`| 字符串数组 | tr_tracker_view
| `webseedsSendingToUs`| number| tr_stat

`availability`：由 `pieceCount` 个数字组成的数组，表示拥有每个分片的已连接 peer 数量；如果我们自己已经拥有该分片，则为 -1。

`files`：对象数组，每个对象包含：

| 键 | 值类型 | transmission.h source
|:--|:--|:--
| `bytesCompleted` | number | tr_file_view
| `length` | number | tr_file_view
| `name` | string | tr_file_view
| `begin_piece` | number | tr_file_view
| `end_piece` | number | tr_file_view

文件会按照它们在 torrent 中的排列顺序返回。本规范中所有对“file indices”的引用都应解释为文件在该顺序中的位置，第一个文件的索引为 0。

`fileStats`：文件的非常量属性。由 `tr_info.filecount` 个对象组成的数组，顺序与 `files` 相同，每个对象包含：

| 键 | 值类型 | transmission.h source
|:--|:--|:--
| `bytesCompleted` | number | tr_file_view
| `wanted` | boolean | tr_file_view（**注意：** 不要与 `torrent-get.wanted` 混淆，后者是 0/1 数组而不是 boolean）
| `priority` | number | tr_file_view

`peers`：对象数组，每个对象包含：

| 键 | 值类型 | transmission.h source
|:--|:--|:--
| `address`            | string     | tr_peer_stat
| `clientName`         | string     | tr_peer_stat
| `clientIsChoked`     | boolean    | tr_peer_stat
| `clientIsInterested` | boolean    | tr_peer_stat
| `flagStr`            | string     | tr_peer_stat
| `isDownloadingFrom`  | boolean    | tr_peer_stat
| `isEncrypted`        | boolean    | tr_peer_stat
| `isIncoming`         | boolean    | tr_peer_stat
| `isUploadingTo`      | boolean    | tr_peer_stat
| `isUTP`              | boolean    | tr_peer_stat
| `peerIsChoked`       | boolean    | tr_peer_stat
| `peerIsInterested`   | boolean    | tr_peer_stat
| `port`               | number     | tr_peer_stat
| `progress`           | double     | tr_peer_stat
| `rateToClient` (B/s) | number     | tr_peer_stat
| `rateToPeer` (B/s)   | number     | tr_peer_stat

`peersFrom`：包含以下内容的对象：

| 键 | 值类型 | transmission.h source
|:--|:--|:--
| `fromCache`    | number     | tr_stat
| `fromDht`      | number     | tr_stat
| `fromIncoming` | number     | tr_stat
| `fromLpd`      | number     | tr_stat
| `fromLtep`     | number     | tr_stat
| `fromPex`      | number     | tr_stat
| `fromTracker`  | number     | tr_stat


`pieces`：保存 pieceCount 个标志的位字段；如果我们拥有与该位置匹配的分片，则对应标志设置为 'true'。JSON 不允许原始二进制数据，因此这是一个 base64 编码字符串。（Source: tr_torrent）

`priorities`：由 `tr_torrentFileCount()` 个数字组成的数组。每个数字都是对应文件的 `tr_priority_t` 模式。

`status`：0 到 6 之间的数字，其中：

| 值 | 含义
|:--|:--
| 0 | Torrent 已停止
| 1 | Torrent 已排队等待校验本地数据
| 2 | Torrent 正在校验本地数据
| 3 | Torrent 已排队等待下载
| 4 | Torrent 正在下载
| 5 | Torrent 已排队等待做种
| 6 | Torrent 正在做种


`trackers`：对象数组，每个对象包含：

| 键 | 值类型 | transmission.h source
|:--|:--|:--
| `announce` | string | tr_tracker_view
| `id` | number | tr_tracker_view
| `scrape` | string | tr_tracker_view
| `sitename` | string | tr_tracker_view
| `tier` | number | tr_tracker_view

`trackerStats`：对象数组，每个对象包含：

| 键 | 值类型 | transmission.h source
|:--|:--|:--
| `announce`                | string     | tr_tracker_view
| `announceState`           | number     | tr_tracker_view
| `downloadCount`           | number     | tr_tracker_view
| `hasAnnounced`            | boolean    | tr_tracker_view
| `hasScraped`              | boolean    | tr_tracker_view
| `host`                    | string     | tr_tracker_view
| `id`                      | number     | tr_tracker_view
| `isBackup`                | boolean    | tr_tracker_view
| `lastAnnouncePeerCount`   | number     | tr_tracker_view
| `lastAnnounceResult`      | string     | tr_tracker_view
| `lastAnnounceStartTime`   | number     | tr_tracker_view
| `lastAnnounceSucceeded`   | boolean    | tr_tracker_view
| `lastAnnounceTime`        | number     | tr_tracker_view
| `lastAnnounceTimedOut`    | boolean    | tr_tracker_view
| `lastScrapeResult`        | string     | tr_tracker_view
| `lastScrapeStartTime`     | number     | tr_tracker_view
| `lastScrapeSucceeded`     | boolean    | tr_tracker_view
| `lastScrapeTime`          | number     | tr_tracker_view
| `lastScrapeTimedOut`      | boolean    | tr_tracker_view
| `leecherCount`            | number     | tr_tracker_view
| `nextAnnounceTime`        | number     | tr_tracker_view
| `nextScrapeTime`          | number     | tr_tracker_view
| `scrape`                  | string     | tr_tracker_view
| `scrapeState`             | number     | tr_tracker_view
| `seederCount`             | number     | tr_tracker_view
| `sitename`                | string     | tr_tracker_view
| `tier`                    | number     | tr_tracker_view


`wanted`：由 `tr_torrentFileCount()` 个 0/1 组成的数组；如果对应文件要被下载，则为 1（true）。（Source: `tr_file_view`）

**注意：** 为了向后兼容，在 `4.x.x` 中，`wanted` 会序列化为由 `0` 或 `1` 组成的数组，应将它们视为 boolean。
这将在 `5.0.0` 中修复为返回 boolean 数组。

示例：

假设我们想获取 torrent #7 和 #10 的名称与总大小。

请求：

```json
{
   "arguments": {
       "fields": [ "id", "name", "totalSize" ],
       "ids": [ 7, 10 ]
   },
   "method": "torrent-get",
   "tag": 39693
}
```

响应：

```json
{
   "arguments": {
      "torrents": [
         {
             "id": 10,
             "name": "Fedora x86_64 DVD",
             "totalSize": 34983493932
         },
         {
             "id": 7,
             "name": "Ubuntu x86_64 DVD",
             "totalSize": 9923890123
         }
      ]
   },
   "result": "success",
   "tag": 39693
}
```

### 3.4 添加 torrent
方法名称：`torrent-add`

请求参数：

| 键 | 值类型 | 说明
|:--|:--|:--
| `cookies`             | string    | 指向一个或多个 cookie 字符串的指针。
| `download-dir`        | string    | 下载 torrent 的路径
| `filename`            | string    | .torrent 文件的文件名或 URL
| `labels`              | array     | 字符串标签数组
| `metainfo`            | string    | base64 编码的 .torrent 内容
| `paused`              | boolean   | 如果为 true，则不启动 torrent
| `peer-limit`          | number    | 最大 peer 数量
| `bandwidthPriority`   | number    | torrent 的带宽 tr_priority_t
| `files-wanted`        | array     | 要下载的文件索引
| `files-unwanted`      | array     | 不下载的文件索引
| `priority-high`       | array     | 高优先级文件的索引
| `priority-low`        | array     | 低优先级文件的索引
| `priority-normal`     | array     | 普通优先级文件的索引
| `sequential_download` | boolean   | 按顺序下载 torrent 分片

必须包含 `filename` **或** `metainfo`。所有其他参数都是可选的。

`cookies` 的格式应为 `NAME=CONTENTS`，其中 `NAME` 是 cookie 名称，`CONTENTS` 是 cookie 应包含的内容。像这样设置多个 cookie：`name1=content1; name2=content2;` 等等。有关更多信息，请参阅 [libcurl 文档](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html#CURLOPTCOOKIE)。

响应参数：

* 成功时，返回一个 `torrent-added` 对象，其形式为 3.3 中 torrent 对象之一，包含 `id`、`name` 和 `hashString` 字段。

* 尝试添加重复 torrent 时，会返回相同形式的 `torrent-duplicate` 对象，但响应的 `result` 值仍为 `success`。

### 3.5 移除 torrent
方法名称：`torrent-remove`

| 键 | 值类型 | 说明
|:--|:--|:--
| `ids`               | array   | torrent 列表，如 3.1 所述
| `delete-local-data` | boolean | 删除本地数据。（默认：false）

响应参数：无

### 3.6 移动 torrent
方法名称：`torrent-set-location`

请求参数：

| 键 | 值类型 | 说明
|:--|:--|:--
| `ids`      | array   | torrent 列表，如 3.1 所述
| `location` | string  | 新的 torrent 位置
| `move`     | boolean | 如果为 true，则从先前位置移动。否则，在 "location" 中搜索文件（默认：false）

响应参数：无

### 3.7 重命名 torrent 的路径
方法名称：`torrent-rename-path`

有关此函数用法的更多信息，请参阅 transmission.h 中 `tr_torrentRenamePath()` 的文档。尤其要注意，如果此调用成功，你会想要通过 `torrent-get` 更新 torrent 的 `files` 和 `name` 字段。

请求参数：

| 键 | 值类型 | 说明
|:--|:--|:--
| `ids` | array | torrent 列表，如 3.1 所述（必须只有 1 个 torrent）
| `path` | string | 将被重命名的文件或文件夹路径
| `name` | string | 文件或文件夹的新名称

响应参数：`path`、`name` 和 `id`，其中保存 torrent ID 整数

## 4 Session 请求
### 4.1 Session 参数
| 键 | 值类型 | 说明
|:--|:--|:--
| `alt-speed-down` | number | 最大全局下载速度（KBps）
| `alt-speed-enabled` | boolean | true 表示使用 alt speeds
| `alt-speed-time-begin` | number | 何时开启 alt speeds（单位：午夜后的分钟数）
| `alt-speed-time-day` | number | 哪些日期开启 alt speeds（参见 tr_sched_day）
| `alt-speed-time-enabled` | boolean | true 表示使用定时开启/关闭时间
| `alt-speed-time-end` | number | 何时关闭 alt speeds（单位同上）
| `alt-speed-up` | number | 最大全局上传速度（KBps）
| `blocklist-enabled` | boolean | true 表示已启用
| `blocklist-size` | number | blocklist 中规则数量
| `blocklist-url` | string | 用于 `blocklist-update` 的 blocklist 位置
| `cache-size-mb` | number | 磁盘缓存的最大大小（MB）
| `config-dir` | string | transmission 配置目录的位置
| `default-trackers` | string | announce URL，每行一个，[tiers](https://www.bittorrent.org/beps/bep_0012.html) 之间用空行分隔。
| `dht-enabled` | boolean | true 表示允许 public torrent 中的 DHT
| `download-dir` | string | 下载 torrent 的默认路径
| `download-dir-free-space` | number |  **DEPRECATED** 改用 `free-space` 方法。
| `download-queue-enabled` | boolean | 如果为 true，则限制可同时下载的 torrent 数量
| `download-queue-size` | number | 可同时下载的最大 torrent 数量（见 download-queue-enabled）
| `encryption` | string | `required`、`preferred`、`tolerated`
| `idle-seeding-limit-enabled` | boolean | 如果默认遵守做种不活跃限制则为 true
| `idle-seeding-limit` | number | 我们正在做种的 torrent 若空闲这么长时间则会停止
| `incomplete-dir-enabled` | boolean | true 表示在完成前将 torrent 保留在 incomplete-dir 中
| `incomplete-dir` | string | 启用时，未完成 torrent 的路径
| `lpd-enabled` | boolean | true 表示允许 public torrent 中的 Local Peer Discovery
| `peer-limit-global` | number | 全局最大 peer 数量
| `peer-limit-per-torrent` | number | 全局最大 peer 数量
| `peer-port-random-on-start` | boolean | true 表示启动时随机选择 peer port
| `peer-port` | number | 端口号
| `pex-enabled` | boolean | true 表示允许 public torrent 中的 PEX
| `port-forwarding-enabled` | boolean | true 表示要求上游路由器使用 UPnP 或 NAT-PMP 将配置的 peer port 转发到 transmission
| `queue-stalled-enabled` | boolean | 是否将空闲 torrent 视为 stalled
| `queue-stalled-minutes` | number | 空闲 N 分钟的 torrent 不计入 seed-queue-size 或 download-queue-size
| `rename-partial-files` | boolean | true 表示向未完成文件追加 `.part`
| `reqq` | number | 一个 peer 被允许在客户端中排队的未完成 block 请求数量
| `rpc-version-minimum` | number | 支持的最低 RPC API 版本
| `rpc-version-semver` | string | 采用 [semver](https://semver.org) 兼容字符串表示的当前 RPC API 版本
| `rpc-version` | number | 当前 RPC API 版本
| `script-torrent-added-enabled` | boolean | 是否调用 `added` 脚本
| `script-torrent-added-filename` | string | 要运行的脚本文件名
| `script-torrent-done-enabled` | boolean | 是否调用 `done` 脚本
| `script-torrent-done-filename` | string | 要运行的脚本文件名
| `script-torrent-done-seeding-enabled` | boolean | 是否调用 `seeding-done` 脚本
| `script-torrent-done-seeding-filename` | string | 要运行的脚本文件名
| `seed-queue-enabled` | boolean | 如果为 true，则限制可同时上传的 torrent 数量
| `seed-queue-size` | number | 可同时上传的最大 torrent 数量（见 seed-queue-enabled）
| `seedRatioLimit` | double | torrent 使用的默认做种比例
| `seedRatioLimited` | boolean | 如果默认遵守 seedRatioLimit 则为 true
| `sequential_download` | boolean | true 表示添加的 torrent 默认启用顺序下载
| `session-id` | string | 当前 `X-Transmission-Session-Id` 值
| `speed-limit-down-enabled` | boolean | true 表示已启用
| `speed-limit-down` | number | 最大全局下载速度（KBps）
| `speed-limit-up-enabled` | boolean | true 表示已启用
| `speed-limit-up` | number | 最大全局上传速度（KBps）
| `start-added-torrents` | boolean | true 表示添加的 torrent 会立即启动
| `trash-original-torrent-files` | boolean | true 表示会删除已添加 torrent 的 .torrent 文件
| `units` | object | 见下文
| `utp-enabled` | boolean | true 表示允许 UTP
| `version` | string | 长版本字符串 `$version ($revision)`


`units`：包含以下内容的对象：

| 键 | 值类型 | transmission.h source
|:--|:--|:--
| `speed-units`  | array  | 4 个字符串：KB/s、MB/s、GB/s、TB/s
| `speed-bytes`  | number | 一个 KB 中的字节数（kB 为 1000；KiB 为 1024）
| `size-units`   | array  | 4 个字符串：KB/s、MB/s、GB/s、TB/s
| `size-bytes`   | number | 一个 KB 中的字节数（kB 为 1000；KiB 为 1024）
| `memory-units` | array  | 4 个字符串：KB/s、MB/s、GB/s、TB/s
| `memory-bytes` | number | 一个 KB 中的字节数（kB 为 1000；KiB 为 1024）

`rpc-version` 表示 RPC 服务器支持的 RPC 接口版本。
当新版 Transmission 改变 RPC 接口时，它会递增。

`rpc-version-minimum` 表示 RPC 服务器支持的最旧 API。
当新版 Transmission 以不向后兼容的方式改变 RPC 接口时，它会变化。没有计划让这种行为变得常见。

#### 4.1.1 修改器
方法名称：`session-set`

请求参数：4.1 参数中的可变属性，即除以下之外的所有属性：

* `blocklist-size`
* `config-dir`
* `rpc-version-minimum`,
* `rpc-version-semver`
* `rpc-version`
* `session-id`
* `units`
* `version`

响应参数：无

#### 4.1.2 访问器
方法名称：`session-get`

请求参数：可选的 `fields` 键数组（见 4.1）

响应参数：如果存在请求的 `fields` 参数，则为与其匹配的 key/value 对；否则为所有支持的字段（见 4.1）。

### 4.2 Session 统计信息
方法名称：`session-stats`

请求参数：无

响应参数：

| 键 | 值类型 | 说明
|:--|:--|:--
| `activeTorrentCount`       | number
| `downloadSpeed`            | number
| `pausedTorrentCount`       | number
| `torrentCount`             | number
| `uploadSpeed`              | number
| `cumulative-stats`         | stats object（见下文）
| `current-stats`            | stats object（见下文）

stats object 包含：

| 键 | 值类型 | transmission.h source
|:--|:--|:--
| `uploadedBytes`    | number     | tr_session_stats
| `downloadedBytes`  | number     | tr_session_stats
| `filesAdded`       | number     | tr_session_stats
| `sessionCount`     | number     | tr_session_stats
| `secondsActive`    | number     | tr_session_stats

### 4.3 Blocklist
方法名称：`blocklist-update`

请求参数：无

响应参数：数字 `blocklist-size`

### 4.4 端口检查
此方法测试你的传入 peer port 是否可从外部访问。

方法名称：`port-test`

请求参数：可选参数 `ip_protocol`。
`ip_protocol` 是一个字符串，指定端口测试要使用的 IP 协议版本。
设置为 `ipv4` 以检查 IPv4，或设置为 `ipv6` 以检查 IPv6。
为了向后兼容，允许省略此参数以获得 Transmission `4.1.0` 之前的行为，即检查操作系统碰巧用来连接我们端口测试服务的 IP 协议；坦率地说，这并不很有用。

响应参数：

| 键 | 值类型 | 说明
| :-- | :-- | :--
| `port-is-open` | boolean | 端口打开时为 true，端口关闭时为 false
| `ip_protocol` | string | 如果测试在 IPv4 上执行则为 `ipv4`，如果测试在 IPv6 上执行则为 `ipv6`，如果无法确定则未设置

### 4.5 Session 关闭
此方法告知 transmission session 关闭。

方法名称：`session-close`

请求参数：无

响应参数：无

### 4.6 队列移动请求
| 方法名称 | transmission.h source
|:--|:--
| `queue-move-top` | tr_torrentQueueMoveTop()
| `queue-move-up` | tr_torrentQueueMoveUp()
| `queue-move-down` | tr_torrentQueueMoveDown()
| `queue-move-bottom` | tr_torrentQueueMoveBottom()

请求参数：

| 键 | 值类型 | 说明
|:--|:--|:--
| `ids` | array | torrent 列表，如 3.1 所述。

响应参数：无

### 4.7 可用空间
此方法测试客户端指定文件夹中有多少可用空间。

方法名称：`free-space`

请求参数：

| 键 | 值类型 | 说明
|:--|:--|:--
| `path` | string | 要查询的目录

响应参数：

| 键 | 值类型 | 说明
|:--|:--|:--
| `path` | string | 与请求参数相同
| `size-bytes` | number | 该目录中可用空间的大小（字节）
| `total_size` | number | 该目录的总容量（字节）

### 4.8 带宽组
#### 4.8.1 带宽组修改器：`group-set`
方法名称：`group-set`

请求参数：

| 键 | 值类型 | 说明
|:--|:--|:--
| `honorsSessionLimits` | boolean  | 如果遵守 session 上传限制则为 true
| `name` | string | 带宽组名称
| `speed-limit-down-enabled` | boolean | true 表示已启用
| `speed-limit-down` | number | 最大全局下载速度（KBps）
| `speed-limit-up-enabled` | boolean | true 表示已启用
| `speed-limit-up` | number | 最大全局上传速度（KBps）

响应参数：无

#### 4.8.2 带宽组访问器：`group-get`
方法名称：`group-get`

请求参数：可选参数 `group`。
`group` 可以是命名带宽组的字符串，也可以是此类字符串的列表。
如果省略 `group`，则使用所有带宽组。

响应参数：

| 键 | 值类型 | 说明
|:--|:--|:--
|`group`| array | 带宽组说明对象列表

带宽组说明对象包含：

| 键 | 值类型 | 说明
|:--|:--|:--
| `honorsSessionLimits` | boolean  | 如果遵守 session 上传限制则为 true
| `name` | string | 带宽组名称
| `speed-limit-down-enabled` | boolean | true 表示已启用
| `speed-limit-down` | number | 最大全局下载速度（KBps）
| `speed-limit-up-enabled` | boolean | true 表示已启用
| `speed-limit-up` | number | 最大全局上传速度（KBps）

## 5 协议版本
本节列出了对 RPC 协议所做的更改。

有两种方式可以检查 API 兼容性。由于大多数开发者都了解 [semver](https://semver.org/)，因此推荐使用 session-get 的 `rpc-version-semver`。该值是 RPC 协议版本号的 semver 兼容字符串。

由于 Transmission 早于 semver 1.0 规范，之前的方案是让 RPC 版本成为整数，并在每次发生更改时递增。这就是 session-get 的 `rpc-version`。`rpc-version-minimum` 列出了与当前版本兼容的最旧版本；也就是说，编写为使用 `rpc-version-minimum` 的应用仍可在运行 `rpc-version` 的 Transmission 版本上工作。

破坏性更改用 :bomb: emoji 标记。

Transmission 1.30（`rpc-version-semver` 1.0.0，`rpc-version`: 1）

初始修订。

Transmission 1.40（`rpc-version-semver` 1.1.0，`rpc-version`: 2）

| 方法 | 说明
|:---|:---
| `torrent-get` | `peers` 新增 `port`

Transmission 1.41（`rpc-version-semver` 1.2.0，`rpc-version`: 3）

| 方法 | 说明
|:---|:---
| `session-get`      | 新 arg `version`
| `torrent-get`      | 新 arg `downloaders`
| `torrent-remove`   | 新方法

Transmission 1.50（`rpc-version-semver` 1.3.0，`rpc-version`: 4）

| 方法 | 说明
|:---|:---
|`session-get`       | 新 arg `rpc-version-minimum`
|`session-get`       | 新 arg `rpc-version`
|`session-stats`     | 添加 `cumulative-stats`
|`session-stats`     | 添加 `current-stats`
|`torrent-get`       | 新 arg `downloadDir`

Transmission 1.60（`rpc-version-semver` 2.0.0，`rpc-version`: 5）

| 方法 | 说明
|:---|:---
| `session-get` | :bomb: 将 `peer-limit` 重命名为 `peer-limit-global`
| `session-get` | :bomb: 将 `pex-allowed` 重命名为 `pex-enabled`
| `session-get` | :bomb: 将 `port` 重命名为 `peer-port`
| `torrent-get` | :bomb: 移除 arg `downloadLimitMode`
| `torrent-get` | :bomb: 移除 arg `uploadLimitMode`
| `torrent-set` | :bomb: 将 `speed-limit-down-enabled` 重命名为 `downloadLimited`
| `torrent-set` | :bomb: 将 `speed-limit-down` 重命名为 `downloadLimit`
| `torrent-set` | :bomb: 将 `speed-limit-up-enabled` 重命名为 `uploadLimited`
| `torrent-set` | :bomb: 将 `speed-limit-up` 重命名为 `uploadLimit`
| `blocklist-update` | 新方法
| `port-test` | 新方法
| `session-get` | 新 arg `alt-speed-begin`
| `session-get` | 新 arg `alt-speed-down`
| `session-get` | 新 arg `alt-speed-enabled`
| `session-get` | 新 arg `alt-speed-end`
| `session-get` | 新 arg `alt-speed-time-enabled`
| `session-get` | 新 arg `alt-speed-up`
| `session-get` | 新 arg `blocklist-enabled`
| `session-get` | 新 arg `blocklist-size`
| `session-get` | 新 arg `peer-limit-per-torrent`
| `session-get` | 新 arg `seedRatioLimit`
| `session-get` | 新 arg `seedRatioLimited`
| `torrent-add` | 新 arg `files-unwanted`
| `torrent-add` | 新 arg `files-wanted`
| `torrent-add` | 新 arg `priority-high`
| `torrent-add` | 新 arg `priority-low`
| `torrent-add` | 新 arg `priority-normal`
| `torrent-get` | 新 arg `bandwidthPriority`
| `torrent-get` | 新 arg `fileStats`
| `torrent-get` | 新 arg `honorsSessionLimits`
| `torrent-get` | 新 arg `percentDone`
| `torrent-get` | 新 arg `pieces`
| `torrent-get` | 新 arg `seedRatioLimit`
| `torrent-get` | 新 arg `seedRatioMode`
| `torrent-get` | 新 arg `torrentFile`
| `torrent-get` | 新 ids 选项 `recently-active`
| `torrent-reannounce` | 新方法
| `torrent-set` | 新 arg `bandwidthPriority`
| `torrent-set` | 新 arg `honorsSessionLimits`
| `torrent-set` | 新 arg `seedRatioLimit`
| `torrent-set` | 新 arg `seedRatioLimited`

Transmission 1.70（`rpc-version-semver` 2.1.0，`rpc-version`: 6）

| 方法 | 说明
|:---|:---
| `method torrent-set-location` | 新方法

Transmission 1.80（`rpc-version-semver` 3.0.0，`rpc-version`: 7）

| 方法 | 说明
|:---|:---
| `torrent-get` | :bomb: 移除 arg `announceResponse`（使用 `trackerStats instead`）
| `torrent-get` | :bomb: 移除 arg `announceURL`（使用 `trackerStats instead`）
| `torrent-get` | :bomb: 移除 arg `downloaders`（使用 `trackerStats instead`）
| `torrent-get` | :bomb: 移除 arg `lastAnnounceTime`（使用 `trackerStats instead`）
| `torrent-get` | :bomb: 移除 arg `lastScrapeTime`（使用 `trackerStats instead`）
| `torrent-get` | :bomb: 移除 arg `leechers`（使用 `trackerStats instead`）
| `torrent-get` | :bomb: 移除 arg `nextAnnounceTime`（使用 `trackerStats instead`）
| `torrent-get` | :bomb: 移除 arg `nextScrapeTime`（使用 `trackerStats instead`）
| `torrent-get` | :bomb: 移除 arg `scrapeResponse`（使用 `trackerStats instead`）
| `torrent-get` | :bomb: 移除 arg `scrapeURL`（使用 `trackerStats instead`）
| `torrent-get` | :bomb: 移除 arg `seeders`（使用 `trackerStats instead`）
| `torrent-get` | :bomb: 移除 arg `swarmSpeed`
| `torrent-get` | :bomb: 移除 arg `timesCompleted`（使用 `trackerStats instead`）
| `session-set` | 新 arg `incomplete-dir-enabled`
| `session-set` | 新 arg `incomplete-dir`
| `torrent-get` | 新 arg `magnetLink`
| `torrent-get` | 新 arg `metadataPercentComplete`
| `torrent-get` | 新 arg `trackerStats`

Transmission 1.90（`rpc-version-semver` 3.1.0，`rpc-version`: 8）

| 方法 | 说明
|:---|:---
| `session-set` | 新 arg `rename-partial-files`
| `session-get` | 新 arg `rename-partial-files`
| `session-get` | 新 arg `config-dir`
| `torrent-add` | 新 arg `bandwidthPriority`
| `torrent-get` | 新 trackerStats arg `lastAnnounceTimedOut`

Transmission 1.92（`rpc-version-semver` 3.2.0，`rpc-version`: 8）

注意：由于疏忽，此版本中未递增 `rpc-version`。

| 方法 | 说明
|:---|:---
| `torrent-get` | 新 trackerStats arg `lastScrapeTimedOut`

Transmission 2.00（`rpc-version-semver` 3.3.0，`rpc-version`: 9）

| 方法 | 说明
|:---|:---
| `session-set` | 新 arg `start-added-torrents`
| `session-set` | 新 arg `trash-original-torrent-files`
| `session-get` | 新 arg `start-added-torrents`
| `session-get` | 新 arg `trash-original-torrent-files`
| `torrent-get` | 新 arg `isFinished`

Transmission 2.10（`rpc-version-semver` 3.4.0，`rpc-version`: 10）

| 方法 | 说明
|:---|:---
| `session-get` | 新 arg `cache-size-mb`
| `session-get` | 新 arg `units`
| `session-set` | 新 arg `idle-seeding-limit-enabled`
| `session-set` | 新 arg `idle-seeding-limit`
| `torrent-set` | 新 arg `seedIdleLimit`
| `torrent-set` | 新 arg `seedIdleMode`
| `torrent-set` | 新 arg `trackerAdd`
| `torrent-set` | 新 arg `trackerRemove`
| `torrent-set` | 新 arg `trackerReplace`

Transmission 2.12（`rpc-version-semver` 3.5.0，`rpc-version`: 11）

| 方法 | 说明
|:---|:---
| `session-get` | 新 arg `blocklist-url`
| `session-set` | 新 arg `blocklist-url`

Transmission 2.20（`rpc-version-semver` 3.6.0，`rpc-version`: 12）

| 方法 | 说明
|:---|:---
| `session-get` | 新 arg `download-dir-free-space`
| `session-close` | 新方法

Transmission 2.30（`rpc-version-semver` 4.0.0，`rpc-version`: 13）

| 方法 | 说明
|:---|:---
| `torrent-get` | :bomb: 移除 arg `peersKnown`
| `torrent-get` | `peers` 列表新增 arg `isUTP`
| `torrent-add` | 新 arg `cookies`

Transmission 2.40（`rpc-version-semver` 5.0.0，`rpc-version`: 14）

| 方法 | 说明
|:---|:---
| `torrent-get` | :bomb: `status` 字段的值已更改
| `queue-move-bottom` | 新方法
| `queue-move-down` | 新方法
| `queue-move-top` | 新方法
| `session-set` | 新 arg `download-queue-enabled`
| `session-set` | 新 arg `download-queue-size`
| `session-set` | 新 arg `queue-stalled-enabled`
| `session-set` | 新 arg `queue-stalled-minutes`
| `session-set` | 新 arg `seed-queue-enabled`
| `session-set` | 新 arg `seed-queue-size`
| `torrent-get` | peersFrom 中新增 arg `fromLpd`
| `torrent-get` | 新 arg `isStalled`
| `torrent-get` | 新 arg `queuePosition`
| `torrent-set` | 新 arg `queuePosition`
| `torrent-start-now` | 新方法

Transmission 2.80（`rpc-version-semver` 5.1.0，`rpc-version`: 15）

| 方法 | 说明
|:---|:---
| `torrent-get`         | 新 arg `etaIdle`
| `torrent-rename-path` | 新方法
| `free-space`          | 新方法
| `torrent-add`         | 新返回 arg `torrent-duplicate`

Transmission 3.00（`rpc-version-semver` 5.2.0，`rpc-version`: 16）

| 方法 | 说明
|:---|:---
| `session-get` | 新请求 arg `fields`
| `session-get` | 新 arg `session-id`
| `torrent-get` | 新 arg `labels`
| `torrent-set` | 新 arg `labels`
| `torrent-get` | 新 arg `editDate`
| `torrent-get` | 新请求 arg `format`

Transmission 4.0.0（`rpc-version-semver` 5.3.0，`rpc-version`: 17）

| 方法 | 说明
|:---|:---
| `/upload` | :warning: 移除未文档化的 `/upload` endpoint
| `session-get` | :warning: **DEPRECATED** `download-dir-free-space`。改用 `free-space`。
| `free-space` | 新返回 arg `total_size`
| `session-get` | 新 arg `default-trackers`
| `session-get` | 新 arg `rpc-version-semver`
| `session-get` | 新 arg `script-torrent-added-enabled`
| `session-get` | 新 arg `script-torrent-added-filename`
| `session-get` | 新 arg `script-torrent-done-seeding-enabled`
| `session-get` | 新 arg `script-torrent-done-seeding-filename`
| `torrent-add` | 新 arg `labels`
| `torrent-get` | 新 arg `availability`
| `torrent-get` | 新 arg `file-count`
| `torrent-get` | 新 arg `group`
| `torrent-get` | 新 arg `percentComplete`
| `torrent-get` | 新 arg `primary-mime-type`
| `torrent-get` | 新 arg `tracker.sitename`
| `torrent-get` | 新 arg `trackerStats.sitename`
| `torrent-get` | 新 arg `trackerList`
| `torrent-set` | 新 arg `group`
| `torrent-set` | 新 arg `trackerList`
| `torrent-set` | :warning: **DEPRECATED** `trackerAdd`。改用 `trackerList`。
| `torrent-set` | :warning: **DEPRECATED** `trackerRemove`。改用 `trackerList`。
| `torrent-set` | :warning: **DEPRECATED** `trackerReplace`。改用 `trackerList`。
| `group-set` | 新方法
| `group-get` | 新方法
| `torrent-get` | :warning: 旧 arg `wanted` 在 Transmission 3.00 及更早版本中实现为 `0` 或 `1` 数组，尽管文档记录为 boolean 数组。Transmission 4.0.0 和 4.0.1 通过返回 boolean 数组“修复”了这一点；但实际上，此更改对任何期望 `0` 或 `1` 的第三方代码造成了未宣布的破坏性更改。因此，4.0.2 恢复了 3.00 的行为，并更新此规范以匹配代码。

Transmission 4.1.0（`rpc-version-semver` 5.4.0，`rpc-version`: 18）
| 方法 | 说明
|:---|:---
| `session-get` | 新 arg `sequential_download`
| `session-set` | 新 arg `sequential_download`
| `torrent-add` | 新 arg `sequential_download`
| `torrent-get` | 新 arg `sequential_download`
| `torrent-set` | 新 arg `sequential_download`
| `torrent-get` | 新 arg `files.begin_piece`
| `torrent-get` | 新 arg `files.end_piece`
| `port-test` | 新 arg `ip_protocol`
