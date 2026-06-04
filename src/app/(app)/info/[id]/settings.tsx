import * as React from "react";
import { ToastAndroid } from "react-native";
import { useGlobalSearchParams } from "expo-router";
import { useIsFocused } from "expo-router/react-navigation";
import { z } from "zod";
import { Mode, Priority } from "~/client";

import Toggle from "~/components/toggle";
import TextInput from "~/components/text-input";
import Screen from "~/components/screen";
import SelectInput from "~/components/select-input";
import { SettingsFieldRow, SettingsSectionTitle } from "~/components/settings";
import { useHeaderAction } from "~/contexts/header-action";
import { useTorrentSettings, useTorrentSet } from "~/hooks/torrent";
import { useServer } from "~/hooks/use-settings";
import {
  NetworkErrorScreen,
  LoadingScreen,
} from "~/components/utility-screens";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTheme } from "~/hooks/use-theme-color";

type Form = z.infer<typeof Form>;
const Form = z
  .object({
    bandwidthPriority: z.number().optional(),

    honorsSessionLimits: z.boolean().optional(),
    downloadLimited: z.boolean(),
    downloadLimit: z.coerce.number({ message: "请输入数字" }),
    uploadLimited: z.boolean(),
    uploadLimit: z.coerce.number({ message: "请输入数字" }),

    seedIdleMode: z.number(),
    seedIdleLimit: z.coerce.number({ message: "请输入数字" }),
    seedRatioMode: z.number(),
    seedRatioLimit: z.coerce.number({ message: "请输入数字" }),
  })
  .superRefine((data, ctx) => {
    if (data["downloadLimited"] && !data["downloadLimit"]) {
      ctx.addIssue({
        path: ["downloadLimit"],
        code: z.ZodIssueCode.custom,
        message: "此字段必填",
      });
    }
    if (data["uploadLimited"] && !data["uploadLimit"]) {
      ctx.addIssue({
        path: ["uploadLimit"],
        code: z.ZodIssueCode.custom,
        message: "此字段必填",
      });
    }
    if (data["seedRatioMode"] === Mode.SINGLE && !data["seedRatioLimit"]) {
      ctx.addIssue({
        path: ["seedRatioLimit"],
        code: z.ZodIssueCode.custom,
        message: "此字段必填",
      });
    }
    if (data["seedIdleMode"] === Mode.SINGLE && !data["seedIdleLimit"]) {
      ctx.addIssue({
        path: ["seedIdleLimit"],
        code: z.ZodIssueCode.custom,
        message: "此字段必填",
      });
    }
  });

export default function TorrentSettingsScreen() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const server = useServer();
  const { data: torrent, error, isLoading, refetch } = useTorrentSettings(id);

  const { mutate } = useTorrentSet(id);
  const { red } = useTheme();
  const isTransmission = server?.type !== "qbittorrent";
  const inset = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { setAction } = useHeaderAction();

  const { control, handleSubmit, watch, reset } = useForm({
    mode: "onBlur",
    resolver: zodResolver(Form),
    values: torrent,
    resetOptions: { keepDirtyValues: true },
  });
  const downloadLimited = watch("downloadLimited");
  const uploadLimited = watch("uploadLimited");
  const seedRatioMode = watch("seedRatioMode");
  const seedIdleMode = watch("seedIdleMode");

  const onSubmit = handleSubmit(
    React.useCallback(
      (f: Form) => {
        const params: Form = isTransmission ? f : {
          ...f,
          downloadLimited: f.downloadLimit > 0,
          uploadLimited: f.uploadLimit > 0,
        };
        mutate(params, {
          onSuccess: () => {
            ToastAndroid.show(
              "种子设置已更新",
              ToastAndroid.SHORT
            );
          },
          onError: () => {
            ToastAndroid.show("更新服务器失败", ToastAndroid.SHORT);
          },
        });
      },
      [mutate, isTransmission]
    )
  );

  const onSubmitRef = React.useRef(onSubmit);
  onSubmitRef.current = onSubmit;

  React.useEffect(() => {
    if (isFocused) {
      setAction(() => () => onSubmitRef.current());
    } else {
      setAction(null);
      reset();
    }
    return () => setAction(null);
  }, [isFocused, setAction, reset]);

  if (error) {
    return <NetworkErrorScreen error={error} refetch={refetch} />;
  }

  if (isLoading || !torrent) {
    return <LoadingScreen />;
  }

  return (
    <Screen>
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        bottomOffset={8}
        contentInset={{ bottom: inset.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <SettingsSectionTitle title="带宽" first />

        {isTransmission && (
          <>
            <SettingsFieldRow label="传输优先级">
              <Controller
                name="bandwidthPriority"
                control={control}
                render={({ field }) => (
                  <SelectInput
                    variant="settings"
                    value={field.value ?? Priority.NORMAL}
                    onChange={field.onChange}
                    options={[
                      {
                        label: "高",
                        left: "chevrons-up" as const,
                        value: Priority.HIGH,
                      },
                      {
                        label: "普通",
                        left: "minus" as const,
                        value: Priority.NORMAL,
                      },
                      {
                        label: "低",
                        left: "chevrons-down" as const,
                        value: Priority.LOW,
                      },
                    ]}
                    title="传输优先级"
                  />
                )}
              />
            </SettingsFieldRow>

            <SettingsFieldRow>
              <Controller
                name="honorsSessionLimits"
                control={control}
                render={({ field }) => (
                  <Toggle
                    variant="settings"
                    value={field.value ?? true}
                    onPress={field.onChange}
                    label="遵循会话限制"
                    description="此种子使用服务器全局速度限制。"
                  />
                )}
              />
            </SettingsFieldRow>
          </>
        )}

        {isTransmission ? (
          <>
            <SettingsFieldRow>
              <Controller
                name="downloadLimited"
                control={control}
                render={({ field }) => (
                  <Toggle
                    variant="settings"
                    value={field.value}
                    onPress={field.onChange}
                    label="启用下载限制"
                  />
                )}
              />
            </SettingsFieldRow>

            <Controller
              name="downloadLimit"
              control={control}
              render={({ field, fieldState }) => (
                <SettingsFieldRow
                  label="下载限制 (KB/s)"
                  error={fieldState.error?.message}
                  reserveErrorSpace
                >
                  <TextInput
                    variant="settings"
                    keyboardType="numeric"
                    editable={downloadLimited}
                    value={field.value?.toString() || ""}
                    onChangeText={field.onChange}
                    style={fieldState.error ? { borderColor: red } : undefined}
                  />
                </SettingsFieldRow>
              )}
            />

            <SettingsFieldRow>
              <Controller
                name="uploadLimited"
                control={control}
                render={({ field }) => (
                  <Toggle
                    variant="settings"
                    value={field.value}
                    onPress={field.onChange}
                    label="启用上传限制"
                  />
                )}
              />
            </SettingsFieldRow>

            <Controller
              name="uploadLimit"
              control={control}
              render={({ field, fieldState }) => (
                <SettingsFieldRow
                  label="上传限制 (KB/s)"
                  error={fieldState.error?.message}
                  reserveErrorSpace
                >
                  <TextInput
                    variant="settings"
                    keyboardType="numeric"
                    editable={uploadLimited}
                    value={field.value?.toString() || ""}
                    onChangeText={field.onChange}
                    style={fieldState.error ? { borderColor: red } : undefined}
                  />
                </SettingsFieldRow>
              )}
            />
          </>
        ) : (
          <>
            <Controller
              name="downloadLimit"
              control={control}
              render={({ field, fieldState }) => (
                <SettingsFieldRow
                  label="下载限制 (KB/s，0 表示不限速)"
                  error={fieldState.error?.message}
                  reserveErrorSpace
                >
                  <TextInput
                    variant="settings"
                    keyboardType="numeric"
                    value={field.value?.toString() || ""}
                    onChangeText={field.onChange}
                    style={fieldState.error ? { borderColor: red } : undefined}
                  />
                </SettingsFieldRow>
              )}
            />

            <Controller
              name="uploadLimit"
              control={control}
              render={({ field, fieldState }) => (
                <SettingsFieldRow
                  label="上传限制 (KB/s，0 表示不限速)"
                  error={fieldState.error?.message}
                  reserveErrorSpace
                >
                  <TextInput
                    variant="settings"
                    keyboardType="numeric"
                    value={field.value?.toString() || ""}
                    onChangeText={field.onChange}
                    style={fieldState.error ? { borderColor: red } : undefined}
                  />
                </SettingsFieldRow>
              )}
            />
          </>
        )}

        <SettingsSectionTitle title="做种" />

        <SettingsFieldRow label="达到分享率后停止做种">
          <Controller
            name="seedRatioMode"
            control={control}
            render={({ field }) => (
              <SelectInput
                variant="settings"
                value={field.value}
                onChange={field.onChange}
                options={[
                  {
                    label: "全局设置",
                    left: "globe" as const,
                    value: Mode.GLOBAL,
                  },
                  {
                    label: "按分享率停止",
                    left: "sliders" as const,
                    value: Mode.SINGLE,
                  },
                  {
                    label: "不限",
                    left: "zap" as const,
                    value: Mode.UNLIMITED,
                  },
                ]}
                title="分享率限制模式"
              />
            )}
          />
        </SettingsFieldRow>

        <Controller
          name="seedRatioLimit"
          control={control}
          render={({ field, fieldState }) => (
            <SettingsFieldRow
              label="分享率限制"
              error={fieldState.error?.message}
              reserveErrorSpace
            >
              <TextInput
                variant="settings"
                keyboardType="numeric"
                editable={seedRatioMode === Mode.SINGLE}
                value={field.value?.toString() || ""}
                onChangeText={field.onChange}
                style={fieldState.error ? { borderColor: red } : undefined}
              />
            </SettingsFieldRow>
          )}
        />

        <SettingsFieldRow label="空闲时停止做种">
          <Controller
            name="seedIdleMode"
            control={control}
            render={({ field }) => (
              <SelectInput
                variant="settings"
                value={field.value}
                onChange={field.onChange}
                options={[
                  {
                    label: "全局设置",
                    left: "globe" as const,
                    value: Mode.GLOBAL,
                  },
                  {
                    label: "无活动时停止",
                    left: "sliders" as const,
                    value: Mode.SINGLE,
                  },
                  {
                    label: "不限",
                    left: "zap" as const,
                    value: Mode.UNLIMITED,
                  },
                ]}
                title="空闲模式"
              />
            )}
          />
        </SettingsFieldRow>

        <Controller
          name="seedIdleLimit"
          control={control}
          render={({ field, fieldState }) => (
            <SettingsFieldRow
              label="空闲做种限制（分钟）"
              error={fieldState.error?.message}
              reserveErrorSpace
            >
              <TextInput
                variant="settings"
                keyboardType="numeric"
                editable={seedIdleMode === Mode.SINGLE}
                value={field.value?.toString() || ""}
                onChangeText={field.onChange}
                style={fieldState.error ? { borderColor: red } : undefined}
              />
            </SettingsFieldRow>
          )}
        />
      </KeyboardAwareScrollView>
    </Screen>
  );
}
