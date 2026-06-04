import * as React from "react";
import { SectionList, StyleSheet } from "react-native";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";

import Text from "~/components/text";
import View from "~/components/view";
import Pressable from "~/components/pressable";
import Screen from "~/components/screen";
import Option, { OptionProps } from "~/components/option";
import { SettingsSectionTitle } from "~/components/settings";
import TorrentsNotifierTask from "~/tasks/torrents-notifier";
import { useServersStore, useSearchStore } from "~/hooks/use-settings";
import { useTheme } from "~/hooks/use-theme-color";
import { getAppId, generateAppId } from "@remote-app/pro";
import { generateServerId } from "~/store/settings";
import { storage } from "~/store/storage";
import { debugHref } from "~/lib/debug-href";

type DevSection = {
  key: string;
  title: string;
  data: OptionProps[];
};

function StorageInspector() {
  const { gray, lightGray } = useTheme();
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [keys, setKeys] = React.useState(() => storage.getAllKeys().sort());

  const toggle = React.useCallback((key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const clearAll = React.useCallback(() => {
    storage.clearAll();
    setKeys([]);
    setExpanded(new Set());
  }, []);

  return (
    <View>
      <SettingsSectionTitle title="存储" variant="settings" />
      {keys.map((key) => {
        const isExpanded = expanded.has(key);
        const value = storage.getString(key);
        return (
          <Pressable
            key={key}
            style={styles.storageRow}
            onPress={() => toggle(key)}
          >
            <Text style={styles.storageKey} numberOfLines={isExpanded ? undefined : 1}>
              {key}
            </Text>
            {isExpanded && value != null && (
              <Text
                color={gray}
                style={styles.storageValue}
                selectable
              >
                {tryFormatJson(value)}
              </Text>
            )}
          </Pressable>
        );
      })}
      {keys.length === 0 && (
        <Text color={lightGray} style={styles.emptyText}>
          没有已存储的键
        </Text>
      )}
      {keys.length > 0 && (
        <Pressable style={styles.clearAll} onPress={clearAll}>
          <Text color="red">全部清除</Text>
        </Pressable>
      )}
    </View>
  );
}

function tryFormatJson(value: string): string {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

export default function Development() {
  const router = useRouter();
  const { store } = useServersStore();
  const { store: storeSearch } = useSearchStore();
  const [appId, setAppId] = React.useState(() => getAppId());

  const sections = React.useMemo<DevSection[]>(() => {
    const navigation: OptionProps[] = [
      {
        id: "sitemap",
        left: "map",
        label: "站点地图",
        showChevron: true,
        variant: "compact",
        onPress: () => router.push("/_sitemap"),
      },
    ];

    const actions: OptionProps[] = [
      {
        id: "task",
        left: "play",
        label: "后台任务",
        variant: "compact",
        onPress: async () => {
          const result = await TorrentsNotifierTask();
          console.log("[dev] Task result:", result);
        },
      },
      {
        id: "notification",
        left: "bell",
        label: "测试通知",
        variant: "compact",
        onPress: async () => {
          await Notifications.requestPermissionsAsync();
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "测试通知",
              body: "这是一条测试通知",
            },
            trigger: null,
          });
        },
      },
      {
        id: "debug",
        left: "alert-triangle",
        label: "测试调试页面",
        showChevron: true,
        variant: "compact",
        onPress: () => {
          router.push(debugHref({
            url: "https://my-server.example.com:9091/transmission/rpc",
            username: "admin",
            password: "hunter2",
            errorName: "HTTPError",
            errorMessage: "<!DOCTYPE html><html><head><title>401 未授权</title></head><body><h1>401 未授权</h1><p>此服务器无法验证你是否有权访问请求的文档。可能是你提供了错误的凭据（例如密码错误），也可能是浏览器不知道如何提供所需凭据。</p><p>此外，在尝试使用 ErrorDocument 处理请求时遇到了 401 未授权错误。</p><hr><address>Apache/2.4.41 (Ubuntu) 服务器 my-server.example.com 端口 9091</address></body></html>",
            errorStatus: 401,
            errorBody: "<html><body><h1>401 未授权</h1></body></html>",
          }));
        },
      },
    ];

    const servers: OptionProps[] = [
      {
        id: "mock",
        left: "radio",
        label: "模拟服务器",
        variant: "compact",
        onPress: () => {
          const now = Date.now();
          const id = generateServerId();
          store({
            servers: [{ id, name: "app", url: "app-testing-url", type: "transmission" as const, createdAt: now, updatedAt: now }],
            activeServerId: id,
          });
        },
      },
      {
        id: "local-transmission",
        left: "hard-drive",
        label: "本地 Transmission",
        variant: "compact",
        onPress: () => {
          const now = Date.now();
          const id = generateServerId();
          store({
            servers: [{
              id,
              name: "transmission",
              url: "http://192.168.0.201:9091/transmission/rpc",
              type: "transmission" as const,
              username: "test",
              password: "test",
              createdAt: now,
              updatedAt: now,
            }],
            activeServerId: id,
          });
        },
      },
      {
        id: "local-qbittorrent",
        left: "hard-drive",
        label: "本地 qBittorrent",
        variant: "compact",
        onPress: () => {
          const now = Date.now();
          const id = generateServerId();
          store({
            servers: [{
              id,
              name: "qbittorrent",
              url: "http://192.168.0.201:8080",
              type: "qbittorrent" as const,
              username: "test",
              password: "test",
              createdAt: now,
              updatedAt: now,
            }],
            activeServerId: id,
          });
        },
      },
    ];

    const search: OptionProps[] = [
      {
        id: "search-jackett",
        left: "search",
        label: "Jackett（测试）",
        variant: "compact",
        onPress: () =>
          storeSearch({
            url: "http://192.168.0.201:9117/api/v2.0/indexers/all/results/torznab",
            apiKey: "xpl1bxyzmuucojf4gyvlkupafdv1cyw2",
            type: "jackett" as const,
          }),
      },
      {
        id: "search-prowlarr",
        left: "search",
        label: "Prowlarr（测试）",
        variant: "compact",
        onPress: () =>
          storeSearch({
            url: "http://192.168.0.201:9696/api/v1/search",
            apiKey: "2734bd05b127419a92f1aaf3e7e8ed28",
            type: "prowlarr" as const,
          }),
      },
    ];

    const appIdSection: OptionProps[] = [
      {
        id: "regenerate-appid",
        left: "refresh-cw",
        label: "重新生成",
        variant: "compact",
        onPress: () => setAppId(generateAppId()),
      },
    ];

    return [
      { key: "navigation", title: "导航", data: navigation },
      { key: "actions", title: "操作", data: actions },
      { key: "servers", title: "服务器", data: servers },
      { key: "search", title: "搜索", data: search },
      { key: "appid", title: "应用 ID", data: appIdSection },
    ];
  }, [router, store, storeSearch]);

  return (
    <Screen style={styles.screen}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id ?? item.label}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        renderSectionHeader={({ section }) => (
          <>
            {section.key === "appid" && (
              <View style={styles.appIdContainer}>
                <SettingsSectionTitle
                  title={section.title}
                  variant="settings"
                  first={false}
                />
                <Text selectable style={styles.appId}>{appId}</Text>
              </View>
            )}
            {section.key !== "appid" && (
              <SettingsSectionTitle
                title={section.title}
                variant="settings"
                first={section.key === sections[0]?.key}
              />
            )}
          </>
        )}
        renderItem={({ item, index, section }) => {
          const isLast = index === section.data.length - 1;
          return (
            <View style={[styles.rowContainer, isLast && styles.rowLast]}>
              <Option {...item} />
            </View>
          );
        }}
        ListFooterComponent={<StorageInspector />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingTop: 8,
  },
  content: {
    paddingBottom: 24,
  },
  rowContainer: {
    marginBottom: 8,
  },
  rowLast: {
    marginBottom: 12,
  },
  appIdContainer: {
    marginBottom: 8,
  },
  appId: {
    fontFamily: "RobotoMono-Medium",
    fontSize: 12,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  storageRow: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  storageKey: {
    fontFamily: "RobotoMono-Medium",
    fontSize: 13,
  },
  storageValue: {
    fontFamily: "RobotoMono-Regular",
    fontSize: 11,
    marginTop: 8,
  },
  emptyText: {
    textAlign: "center",
    marginVertical: 16,
    fontSize: 13,
  },
  clearAll: {
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 8,
  },
});
