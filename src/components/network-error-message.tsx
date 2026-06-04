import * as React from "react";
import { StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { startActivityAsync, ActivityAction } from "expo-intent-launcher";
import View, { ViewProps } from "./view";
import Text from "./text";
import Button from "./button";
import { useTheme } from "~/hooks/use-theme-color";
import { useServer } from "~/hooks/use-settings";
import { debugHref } from "~/lib/debug-href";

export type NetworkErrorMessageProps = {
  error: Error;
  refetch: () => void;
} & ViewProps;

function hasStatus(error: Error): error is Error & { status: number } {
  return "status" in error && typeof (error as { status: unknown }).status === "number";
}

function hasBody(error: Error): error is Error & { body: string } {
  return "body" in error && typeof (error as { body: unknown }).body === "string";
}

export default React.memo(function NetworkErrorMessage({
  error,
  refetch,
  style,
  ...props
}: NetworkErrorMessageProps) {
  const router = useRouter();
  const { red } = useTheme();
  const server = useServer();

  let title = "连接失败";
  let message = error.message || "未知错误";

  if (hasStatus(error)) {
    title = error.message ? `${error.status}: ${error.message}` : `HTTP 状态 ${error.status}`;
    message = "";
  }

  if (error.name === "TransmissionError" || error.name === "QBittorrentError") {
    title = "服务器错误";
  }

  if (hasBody(error) && !hasStatus(error)) {
    title = "意外响应";
    message = "";
  }

  const onDebug = React.useCallback(() => {
    if (!server) return;
    router.push(debugHref({
      url: server.url,
      username: server.username,
      password: server.password,
      errorName: error.name,
      errorMessage: error.message,
      errorStatus: hasStatus(error) ? error.status : undefined,
      errorBody: hasBody(error) ? error.body : undefined,
    }));
  }, [server, error, router]);

  return (
    <View style={[styles.container, style]} {...props}>
      <Text color={red} style={styles.text}>
        {title}
      </Text>
      {message ? (
        <Text color={red} style={styles.text}>
          {message}
        </Text>
      ) : null}
      <View style={styles.buttons}>
        <Button
          onPress={() =>
            router.push(
              server
                ? `/settings/connection?id=${server.id}`
                : "/settings/connection",
            )
          }
          title="连接设置"
        />
        <Button
          onPress={() => startActivityAsync(ActivityAction.WIFI_SETTINGS)}
          title="网络设置"
        />
        <Button onPress={onDebug} title="调试" />
        <Button onPress={refetch} title="重试" />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: "column",
    justifyContent: "center",
  },
  text: {
    textAlign: "center",
    fontSize: 20,
  },
  buttons: {
    gap: 16,
    marginTop: 20,
  },
});
