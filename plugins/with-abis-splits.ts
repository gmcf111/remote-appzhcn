import { withAppBuildGradle } from "@expo/config-plugins";
import type { ConfigPlugin } from "@expo/config-plugins";

const SPLITS_BLOCK = `android {
    splits {
        abi {
            enable true
            reset()
            include 'armeabi-v7a', 'arm64-v8a', 'x86_64'
            universalApk false
        }
    }`;

const plugin: ConfigPlugin = (config) => {
  return withAppBuildGradle(config, (config) => {
    config.modResults.contents = config.modResults.contents.replace(
      /^android\s*\{/m,
      SPLITS_BLOCK,
    );
    return config;
  });
};

export default plugin;
