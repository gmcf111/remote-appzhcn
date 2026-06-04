import { TorrentStatus } from "~/client";

function formatBytes(units: string[]): (bytes: number) => string {
  return (bytes: number): string => {
    const step = 1024;
    for (let i = 0; i < units.length; i++) {
      if (bytes < Math.pow(step, i + 2)) {
        return `${(bytes / Math.pow(step, i + 1)).toFixed(2)} ${units[i]}`;
      }
    }
    return `无限`;
  };
}

export const formatSpeed = formatBytes(["kB/s", "MB/s", "GB/s", "TB/s", "PB/s"]);
export const formatSize = formatBytes(["kB", "MB", "GB", "TB", "PB"]);

export const formatETA = (eta: number): string => {
  if (eta < 0) {
    return "";
  }

  const days = Math.floor(eta / 86400);
  const hours = Math.floor(eta / 3600) % 24;
  const minutes = Math.floor(eta / 60) % 60;
  const seconds = eta % 60;

  if (days > 7) {
    return `${days} 天`;
  } else if (days > 0) {
    return `${days} 天 ${hours} 小时`;
  } else if (hours > 0) {
    return `${hours} 小时 ${minutes} 分钟`;
  } else if (minutes > 0) {
    return `${minutes} 分钟 ${seconds} 秒`;
  }

  return `${seconds} 秒`;
};

export const formatStatus = (status: TorrentStatus): string => {
  switch (status) {
    case TorrentStatus.STOPPED:
      return "已停止";
    case TorrentStatus.QUEUED_TO_VERIFY_LOCAL_DATA:
      return "排队校验本地数据";
    case TorrentStatus.VERIFYING_LOCAL_DATA:
      return "正在校验本地数据";
    case TorrentStatus.QUEUED_TO_DOWNLOAD:
      return "排队下载";
    case TorrentStatus.DOWNLOADING:
      return "下载中";
    case TorrentStatus.QUEUED_TO_SEED:
      return "排队做种";
    case TorrentStatus.SEEDING:
      return "做种中";
  }
};
