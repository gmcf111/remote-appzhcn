import * as React from "react";
import { StyleSheet, SectionList } from "react-native";
import { useRouter } from "expo-router";

import Text from "~/components/text";
import Option, { OptionProps } from "~/components/option";
import Screen from "~/components/screen";
import View from "~/components/view";
import { SettingsSectionTitle } from "~/components/settings";
import {
  useColorScheme,
  useColorSchemePreference,
  usePreferencesStore,
  useServers,
} from "~/hooks/use-settings";
import { useTheme } from "~/hooks/use-theme-color";
import { getAppVersion } from "~/utils/app-version";

import { usePro } from "@remote-app/pro";

type SettingsSectionKey = "server" | "app" | "development";

type SettingsSection = {
  key: SettingsSectionKey;
  title: string;
  data: OptionProps[];
};

function getThemeLabel(colorScheme: "system" | "dark" | "light"): string {
  switch (colorScheme) {
    case "system":
      return "跟随系统";
    case "dark":
      return "深色";
    case "light":
      return "浅色";
  }
}

function getAuthenticationLabel(authentication: boolean): string {
  return authentication ? "开启" : "关闭";
}

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const colorSchemePreference = useColorSchemePreference();
  const { authentication } = usePreferencesStore();
  const servers = useServers();
  const { available } = usePro();
  const { lightGray } = useTheme();
  const router = useRouter();
  const appVersion = getAppVersion();

  const themeLabel = React.useMemo(
    () => getThemeLabel(colorSchemePreference),
    [colorSchemePreference]
  );
  const authenticationLabel = React.useMemo(
    () => getAuthenticationLabel(authentication),
    [authentication]
  );

  const sections = React.useMemo<SettingsSection[]>(() => {
    const serverRows: OptionProps[] = [
      {
        id: "servers",
        left: "server",
        label: "服务器",
        onPress: () => router.push("/settings/servers"),
        showChevron: true,
        variant: "compact",
      },
    ];

    if (servers.length > 0) {
      serverRows.push(
        {
          id: "configuration",
          left: "sliders",
          label: "服务器配置",
          onPress: () => router.push("/settings/configuration"),
          showChevron: true,
          variant: "compact",
        },
        {
          id: "directories",
          left: "folder",
          label: "下载目录",
          onPress: () => router.push("/settings/directories"),
          showChevron: true,
          variant: "compact",
        }
      );

      if (available) {
        serverRows.push({
          id: "search",
          left: "search",
          label: "搜索",
          onPress: () => router.push("/settings/search"),
          showChevron: true,
          variant: "compact",
        });
      }
    }

    const appRows: OptionProps[] = [
      {
        id: "security",
        left: "lock",
        label: "身份验证",
        value: authenticationLabel,
        onPress: () => router.push("/settings/security"),
        showChevron: true,
        variant: "compact",
      },
      {
        id: "theme",
        left: colorScheme === "dark" ? "moon" : "sun",
        label: "主题",
        value: themeLabel,
        onPress: () => router.push("/settings/theme"),
        showChevron: true,
        variant: "compact",
      },
    ];

    if (available) {
      appRows.push({
        id: "backup",
        left: "download",
        label: "配置备份",
        onPress: () => router.push("/settings/backup"),
        showChevron: true,
        variant: "compact",
      });
    }

    appRows.push({
      id: "about",
      left: "info",
      label: "关于",
      onPress: () => router.push("/settings/about"),
      showChevron: true,
      variant: "compact",
    });

    const devRows: OptionProps[] = __DEV__
      ? [
          {
            id: "development",
            left: "code",
            label: "开发",
            onPress: () => router.push("/settings/development"),
            showChevron: true,
            variant: "compact",
          },
        ]
      : [];

    const list: SettingsSection[] = [
      { key: "server", title: "服务器", data: serverRows },
      { key: "app", title: "应用", data: appRows },
    ];

    if (devRows.length > 0) {
      list.push({ key: "development", title: "开发", data: devRows });
    }

    return list;
  }, [
    authenticationLabel,
    available,
    colorScheme,
    router,
    servers.length,
    themeLabel,
  ]);

  return (
    <Screen style={styles.screen}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id ?? item.label}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        renderSectionHeader={({ section }) => (
          <SettingsSectionTitle
            title={section.title}
            variant="settings"
            first={section.key === sections[0]?.key}
          />
        )}
        renderItem={({ item, index, section }) => {
          const isLast = index === section.data.length - 1;

          return (
            <View style={[styles.rowContainer, isLast && styles.rowLast]}>
              <Option {...item} />
            </View>
          );
        }}
        ListFooterComponent={
          <Text color={lightGray} style={styles.version}>
            版本 {appVersion}
          </Text>
        }
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
  version: {
    textAlign: "center",
    marginTop: 16,
    fontSize: 12,
  },
});
