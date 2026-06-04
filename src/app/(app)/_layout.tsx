import * as React from "react";
import { Stack, useRouter } from "expo-router";
import { SheetProvider } from "react-native-actions-sheet";

import { TorrentSelectionProvider } from "~/contexts/torrent-selection";
import useScreenOptions from "~/hooks/use-screen-options";
import ActionIcon from "~/components/action-icon";
import { usePro } from "@remote-app/pro";

export const unstable_settings = {
  initialRouteName: "index",
};

export default function AppLayout() {
  const opts = useScreenOptions();
  const router = useRouter();
  const { available } = usePro();

  return (
    <TorrentSelectionProvider>
      <SheetProvider>
        <Stack screenOptions={opts}>
          <Stack.Screen name="index" options={{ title: "远程" }} />
          <Stack.Screen
            name="info/[id]"
            options={{
              title: "详情",
              headerLeft: () => (
                <ActionIcon
                  name="arrow-left"
                  onPress={() => router.dismissTo("/")}
                  style={{ paddingLeft: 0, paddingRight: 32 }}
                />
              ),
            }}
          />
          <Stack.Screen
            name="add"
            options={{
              title: "添加种子",
            }}
          />
          <Stack.Protected guard={available}>
            <Stack.Screen
              name="search"
              options={{ title: "搜索" }}
            />
          </Stack.Protected>
          <Stack.Screen
            name="paywall"
            options={{
              presentation: "modal",
              title: "已解锁",
            }}
          />
          <Stack.Screen name="settings/index" options={{ title: "设置" }} />
          <Stack.Screen
            name="settings/servers"
            options={{ title: "服务器" }}
          />
          <Stack.Screen
            name="settings/connection"
            options={{ title: "服务器" }}
          />
          <Stack.Screen
            name="settings/configuration"
            options={{ title: "服务器配置" }}
          />
          <Stack.Screen
            name="settings/security"
            options={{ title: "身份验证" }}
          />
          <Stack.Screen name="settings/theme" options={{ title: "主题" }} />
          <Stack.Screen name="settings/about" options={{ title: "关于" }} />
          <Stack.Screen
            name="settings/pro"
            options={{ title: "已解锁" }}
          />
          <Stack.Protected guard={available}>
            <Stack.Screen
              name="settings/search"
              options={{ title: "搜索" }}
            />
            <Stack.Screen
              name="settings/backup"
              options={{ title: "配置备份" }}
            />
          </Stack.Protected>
          <Stack.Screen name="settings/app-id" options={{ title: "应用 ID" }} />
          <Stack.Screen name="settings/debug" options={{ title: "调试" }} />
          <Stack.Screen
            name="settings/directories"
            options={{ title: "下载目录" }}
          />
          <Stack.Screen
            name="settings/directory"
            options={{ title: "目录" }}
          />
          {__DEV__ && (
            <Stack.Screen
              name="settings/development"
              options={{ title: "开发" }}
            />
          )}
        </Stack>
      </SheetProvider>
    </TorrentSelectionProvider>
  );
}
