import * as React from "react";
import { SectionList, StyleSheet } from "react-native";
import { useGlobalSearchParams } from "expo-router";

import Text from "~/components/text";
import Screen from "~/components/screen";
import TorrentItem from "~/components/torrent-item";
import { useTorrentInfo } from "~/hooks/torrent";
import KeyValue, { KeyValueProps } from "~/components/key-value";
import { formatSize, formatStatus } from "~/utils/formatters";
import {
  NetworkErrorScreen,
  LoadingScreen,
} from "~/components/utility-screens";
import { count } from "~/utils/pieces";

export default function TorrentDetailsScreen() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const { data: torrent, error, isLoading, refetch } = useTorrentInfo(id);

  const data = React.useMemo<
    {
      section: string;
      data: KeyValueProps[];
    }[]
  >(() => {
    if (!torrent) {
      return [];
    }

    return [
      {
        section: "信息",
        data: [
          {
            field: "名称",
            value: torrent.name,
          },
          {
            field: "状态",
            value: formatStatus(torrent.status),
          },
          {
            field: "Magnet 链接",
            value: torrent.magnetLink,
            copy: true,
          },
        ],
      },
      {
        section: "数据",
        data: [
          {
            field: "进度",
            value: `${(torrent.percentDone * 100).toFixed(1)}%`,
          },
          {
            field: "已下载",
            value: formatSize(torrent.downloadedEver),
          },
          {
            field: "已上传",
            value: `${formatSize(
              torrent.uploadedEver
            )} (${torrent.uploadRatio.toFixed(2)})`,
          },
          {
            field: "分块",
            value: `${count(torrent.pieces)}/${
              torrent.pieceCount
            } (${formatSize(torrent.pieceSize)})`,
          },
          {
            field: "Peer",
            value: `${torrent.peersSendingToUs} - ${torrent.peersGettingFromUs}`,
          },
        ],
      },
      {
        section: "文件",
        data: [
          {
            field: "位置",
            value: torrent.downloadDir,
          },
          {
            field: "总大小",
            value: formatSize(torrent.totalSize),
          },
          {
            field: "文件",
            value: torrent.filesCount,
          },
        ],
      },
      {
        section: "日期",
        data: [
          {
            field: "已添加",
            value: new Date(torrent.addedDate * 1000).toLocaleString(),
          },
          {
            field: "最后活动",
            value: new Date(torrent.activityDate * 1000).toLocaleString(),
          },
          ...(torrent.doneDate !== 0
            ? [
                {
                  field: "已完成",
                  value: new Date(torrent.doneDate * 1000).toLocaleString(),
                },
              ]
            : []),
        ],
      },
    ];
  }, [torrent]);

  if (error) {
    return <NetworkErrorScreen error={error} refetch={refetch} />;
  }

  if (isLoading || !torrent) {
    return <LoadingScreen />;
  }

  return (
    <Screen style={{ paddingTop: 16 }}>
      <TorrentItem disabled torrent={torrent} />
      <SectionList
        // fadingEdgeLength={64}
        sections={data}
        renderSectionHeader={({ section }) => (
          <Text style={styles.title}>{section.section}</Text>
        )}
        renderItem={({ item }) => <KeyValue {...item} />}
        keyExtractor={({ field }) => field}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: "RobotoMono-Medium",
    fontSize: 24,
    marginBottom: 8,
    marginTop: 24,
  },
});
