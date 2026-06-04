import * as React from "react";
import { FlatList, StyleSheet } from "react-native";
import { useGlobalSearchParams } from "expo-router";

import Text from "~/components/text";
import View from "~/components/view";
import Screen from "~/components/screen";
import { useTorrentTrackers } from "~/hooks/torrent";
import {
  LoadingScreen,
  NetworkErrorScreen,
} from "~/components/utility-screens";
import Separator from "~/components/separator";
import KeyValue from "~/components/key-value";

function na(count: number) {
  return count > 0 ? count : "无";
}

export default function TrackersScreen() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const { data: torrent, error, isLoading, refetch } = useTorrentTrackers(id);
  if (error) {
    return <NetworkErrorScreen error={error} refetch={refetch} />;
  }

  if (isLoading || !torrent) {
    return <LoadingScreen />;
  }

  return (
    <Screen style={styles.container}>
      <FlatList
        data={torrent.trackerStats}
        renderItem={({ item: tracker }) => {
          // Tracker URLs can be udp://, http://, https://, ws[s]://. URL()
          // handles them all, but it throws on empty/garbage strings — fall
          // back to the raw string instead of crashing the row.
          let host = tracker.announce || "（未知）";
          try {
            host = new URL(tracker.announce).host || host;
          } catch {
            // keep fallback
          }
          const lastAnnounce =
            tracker.lastAnnounceTime > 0
              ? new Date(tracker.lastAnnounceTime * 1_000).toLocaleString()
              : "无";
          const nextAnnounce =
            tracker.nextAnnounceTime > 0
              ? new Date(tracker.nextAnnounceTime * 1_000).toLocaleString()
              : "无";

          const lastScrape =
            tracker.lastScrapeTime > 0
              ? new Date(tracker.lastScrapeTime * 1_000).toLocaleString()
              : "无";
          const nextScrape =
            tracker.lastScrapeTime > 0
              ? new Date(tracker.nextScrapeTime * 1_000).toLocaleString()
              : "无";

          return (
            <View style={{ gap: 8 }}>
              <Text numberOfLines={1} style={styles.title}>
                层级 {tracker.tier + 1} - {host}
              </Text>
              <View>
                <KeyValue
                  style={styles.kv}
                  field="上次通告"
                  value={lastAnnounce}
                />
                <KeyValue
                  style={styles.kv}
                  field="结果"
                  value={
                    tracker.lastAnnounceSucceeded
                      ? `${na(tracker.lastAnnouncePeerCount)} 个 Peer`
                      : tracker.lastAnnounceResult
                  }
                />
                <KeyValue
                  style={styles.kv}
                  field="下次通告"
                  value={nextAnnounce}
                />
              </View>
              <View>
                <KeyValue
                  style={styles.kv}
                  field="上次抓取"
                  value={lastScrape}
                />
                <KeyValue
                  style={styles.kv}
                  field="结果"
                  value={
                    tracker.lastScrapeSucceeded
                      ? `成功`
                      : tracker.lastScrapeResult
                  }
                />
                <KeyValue
                  style={styles.kv}
                  field="下次抓取"
                  value={nextScrape}
                />
              </View>
              <View>
                <KeyValue
                  style={styles.kv}
                  field="做种者"
                  value={na(tracker.seederCount)}
                />
                <KeyValue
                  style={styles.kv}
                  field="下载者"
                  value={na(tracker.leecherCount)}
                />
                <KeyValue
                  style={styles.kv}
                  field="已下载"
                  value={na(tracker.downloadCount)}
                />
              </View>
            </View>
          );
        }}
        keyExtractor={({ announce, scrape }) => announce + scrape}
        ItemSeparatorComponent={Separator}
        ListEmptyComponent={
          <View style={styles.message}>
            <Text style={styles.title}>未找到 Tracker</Text>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "stretch",
    paddingTop: 16,
    paddingBottom: 24,
  },
  title: {
    fontFamily: "RobotoMono-Medium",
    fontSize: 16,
  },
  kv: {
    marginBottom: 0,
  },
  message: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
