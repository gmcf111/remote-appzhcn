import * as React from "react";
import { Image, Linking, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

import Screen from "~/components/screen";
import View from "~/components/view";
import Text from "~/components/text";
import Pressable from "~/components/pressable";
import { SettingsListRow } from "~/components/settings";
import { useTheme } from "~/hooks/use-theme-color";
import { getAppVersion } from "~/utils/app-version";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const icon = require("../../../../assets/images/icon.png");

const links = [
  {
    title: "代码仓库",
    description: "浏览源代码并跟踪开发进度",
    url: "https://github.com/gmcf111/remote-appzhcn",
  },
  {
    title: "问题跟踪",
    description: "报告错误并请求新功能",
    url: "https://github.com/gmcf111/remote-appzhcn/issues",
  },
];

export default function AboutScreen() {
  const { tint, gray, lightGray } = useTheme();
  const appVersion = getAppVersion();

  return (
    <Screen variant="scroll" contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Image
          source={icon}
          style={styles.icon}
        />
        <Text style={styles.title}>Remote App 中文版</Text>
        <Text style={[styles.version, { color: lightGray }]}>
          {appVersion}
        </Text>
      </View>
      {links.map((link) => (
        <SettingsListRow key={link.url} style={styles.cardWrap}>
          <Pressable
            style={styles.card}
            onPress={() => Linking.openURL(link.url).catch(() => undefined)}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: tint }]}>
                {link.title}{" "}
              </Text>
              <Feather name="external-link" color={tint} size={16} />
            </View>
            <Text style={[styles.cardDescription, { color: gray }]}>
              {link.description}
            </Text>
          </Pressable>
        </SettingsListRow>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 32,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  icon: {
    width: 80,
    height: 80,
    borderRadius: 16,
    marginBottom: 16,
  },
  title: {
    fontFamily: "RobotoMono-Medium",
    fontSize: 20,
    marginBottom: 4,
  },
  version: {
    fontFamily: "RobotoMono-Regular",
    fontSize: 14,
  },
  card: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  cardWrap: {
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  cardTitle: {
    fontFamily: "RobotoMono-Medium",
    fontSize: 16,
  },
  cardDescription: {
    fontFamily: "RobotoMono-Regular",
    fontSize: 13,
  },
});
