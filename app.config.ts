import "tsx/cjs";
import type { ExpoConfig } from "expo/config";
import * as fs from "fs";
import * as path from "path";

const packageJson = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf8"),
);

const [major, minor, patch] = packageJson.version.split(".").map(Number);
const versionCode = major * 10_000 + minor * 100 + patch;

const proPackagePath = path.resolve(process.cwd(), "packages/pro/package.json");
const hasProPackage = fs.existsSync(proPackagePath);

const proPlugins: (string | [string, unknown])[] = hasProPackage
  ? ["./packages/pro/plugins/with-torrent-engine.ts"]
  : [];

export default {
  name:
    process.env.APP_ENV === "development"
      ? "Remote App 中文版（开发版）"
      : "Remote App 中文版",
  slug: "remote-appzhcn",
  owner: process.env.EXPO_OWNER,
  version: packageJson.version,
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "remote",
  userInterfaceStyle: "automatic",
  platforms: ["android", "ios"],
  updates: {
    fallbackToCacheTimeout: 0,
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "cn.gmcf111.remoteappzhcn",
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      monochromeImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    package:
      process.env.APP_ENV === "development"
        ? "cn.gmcf111.remoteappzhcn.dev"
        : "cn.gmcf111.remoteappzhcn",
    versionCode,
    softwareKeyboardLayoutMode: "pan",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        dark: {
          image: "./assets/images/splash-icon-dark.png",
          backgroundColor: "#000000",
        },
        imageWidth: 240,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
      },
    ],
    [
      "expo-font",
      {
        fonts: [
          "./assets/fonts/RobotoMono-Regular.ttf",
          "./assets/fonts/RobotoMono-Medium.ttf",
        ],
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          usesCleartextTraffic: true,
          compileSdkVersion: 36,
          targetSdkVersion: 36,
          buildToolsVersion: "36.0.0",
          enableMinifyInReleaseBuilds: false,
        },
      },
    ],
    [
      "expo-notifications",
      {
        icon: "./assets/images/notification-icon.png",
        color: "#ffffff",
      },
    ],
    "expo-asset",
    "expo-background-task",
    "./plugins/with-intents.ts",
    "./plugins/with-user-ca.ts",
    "./plugins/with-abis-splits.ts",
    ...proPlugins,
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: "5c267c32-bf92-4346-be2b-1085f33264ff",
    },
  },
} satisfies ExpoConfig;
