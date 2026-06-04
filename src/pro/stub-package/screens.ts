import * as React from "react";
import { StyleSheet } from "react-native";

import Screen from "~/components/screen";
import Text from "~/components/text";

function MessageScreen({ title, message }: { title: string; message: string }) {
  return React.createElement(
    Screen,
    { style: styles.container },
    React.createElement(Text, { style: styles.title }, title),
    React.createElement(Text, { style: styles.message }, message),
  );
}

export function PaywallScreen() {
  return React.createElement(MessageScreen, {
    title: "已移除 Pro 限制",
    message: "此版本无需购买即可使用已包含的功能。",
  });
}

export function SearchScreen() {
  return React.createElement(MessageScreen, {
    title: "搜索不可用",
    message: "当前开源版本未包含索引器搜索实现。",
  });
}

export function SearchConfigScreen() {
  return React.createElement(MessageScreen, {
    title: "搜索配置不可用",
    message: "当前开源版本未包含索引器搜索配置实现。",
  });
}

export function ProSettingsScreen() {
  return React.createElement(MessageScreen, {
    title: "已移除 Pro 限制",
    message: "此版本不会检查购买状态。",
  });
}

export function BackupSettingsScreen() {
  return React.createElement(MessageScreen, {
    title: "配置备份不可用",
    message: "当前开源版本未包含配置备份实现。",
  });
}

export function AppIdScreen() {
  return React.createElement(MessageScreen, {
    title: "应用 ID 不可用",
    message: "当前开源版本未包含应用 ID 管理实现。",
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontFamily: "RobotoMono-Medium",
    fontSize: 20,
    marginBottom: 12,
    textAlign: "center",
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
});
