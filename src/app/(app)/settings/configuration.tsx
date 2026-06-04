import * as React from "react";
import { StyleSheet, ToastAndroid } from "react-native";
import { z } from "zod";
import { Feather } from "@expo/vector-icons";
import { SheetManager } from "react-native-actions-sheet";
import { useNavigation } from "expo-router";
import { router } from "expo-router";

import ToggleBase from "~/components/toggle";
import Text from "~/components/text";
import View from "~/components/view";
import Pressable from "~/components/pressable";
import Screen from "~/components/screen";
import TextInputBase from "~/components/text-input";
import ActionIcon from "~/components/action-icon";
import { SettingsInlineGroup, SettingsSectionTitle } from "~/components/settings";
import {
  NetworkErrorScreen,
  LoadingScreen,
} from "~/components/utility-screens";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTheme } from "~/hooks/use-theme-color";
import { useServers, useActiveServerId } from "~/hooks/use-settings";
import {
  useServerSession,
  useServerSessionSet,
  useServerPreferences,
  useServerPreferencesSet,
} from "~/hooks/torrent";
import SelectInputBase from "~/components/select-input";
import type { SelectOption } from "~/sheets/select";
import { SELECT_SHEET_ID } from "~/sheets/ids";
import type { Server } from "~/store/settings";
import type { QBitPreferences, Session } from "~/client";

function SettingsTextInput(props: React.ComponentProps<typeof TextInputBase>) {
  return <TextInputBase variant="settings" {...props} />;
}

function SettingsToggle(props: React.ComponentProps<typeof ToggleBase>) {
  return <ToggleBase variant="settings" {...props} />;
}

function SettingsSelectInput(props: React.ComponentProps<typeof SelectInputBase>) {
  return <SelectInputBase variant="settings" {...props} />;
}

function SettingsToggleFieldLabel({
  label,
  value,
  onPress,
}: {
  label: string;
  value: boolean;
  onPress?: (checked: boolean) => void;
}) {
  return (
    <View style={styles.toggleLabel}>
      <Text style={styles.toggleLabelText}>{label}</Text>
      <SettingsToggle
        style={styles.toggleLabelControl}
        value={value}
        onPress={onPress}
        accessibilityLabel={label}
      />
    </View>
  );
}

type Form = z.infer<typeof Form>;
const Form = z
  .object({
    "speed-limit-down-enabled": z.boolean(),
    "speed-limit-down": z.coerce.number({ message: "请输入数字" }),
    "speed-limit-up-enabled": z.boolean(),
    "speed-limit-up": z.coerce.number({ message: "请输入数字" }),
    "alt-speed-enabled": z.boolean(),
    "alt-speed-down": z.coerce.number({ message: "请输入数字" }),
    "alt-speed-up": z.coerce.number({ message: "请输入数字" }),
    "alt-speed-time-enabled": z.boolean(),
    "alt-speed-time-begin-hour": z.coerce.number(),
    "alt-speed-time-begin-min": z.coerce.number(),
    "alt-speed-time-end-hour": z.coerce.number(),
    "alt-speed-time-end-min": z.coerce.number(),
    "alt-speed-time-day": z.number(),

    "seedRatioLimited": z.boolean(),
    "seedRatioLimit": z.coerce.number({ message: "请输入数字" }),

    "idle-seeding-limit-enabled": z.boolean(),
    "idle-seeding-limit": z.coerce.number({ message: "请输入数字" }),

    "download-queue-enabled": z.boolean(),
    "download-queue-size": z.coerce.number({ message: "请输入数字" }),
    "seed-queue-enabled": z.boolean(),
    "seed-queue-size": z.coerce.number({ message: "请输入数字" }),

    "dht-enabled": z.boolean().optional(),
    "lpd-enabled": z.boolean().optional(),
    "pex-enabled": z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data["speed-limit-down-enabled"] && !data["speed-limit-down"]) {
      ctx.addIssue({
        path: ["speed-limit-down"],
        code: z.ZodIssueCode.custom,
        message: "此字段必填",
      });
    }
    if (data["speed-limit-up-enabled"] && !data["speed-limit-up"]) {
      ctx.addIssue({
        path: ["speed-limit-up"],
        code: z.ZodIssueCode.custom,
        message: "此字段必填",
      });
    }
    if (data["seedRatioLimited"] && !data["seedRatioLimit"]) {
      ctx.addIssue({
        path: ["seedRatioLimit"],
        code: z.ZodIssueCode.custom,
        message: "此字段必填",
      });
    }
    if (data["idle-seeding-limit-enabled"] && !data["idle-seeding-limit"]) {
      ctx.addIssue({
        path: ["idle-seeding-limit"],
        code: z.ZodIssueCode.custom,
        message: "此字段必填",
      });
    }
    if (data["download-queue-enabled"] && !data["download-queue-size"]) {
      ctx.addIssue({
        path: ["download-queue-size"],
        code: z.ZodIssueCode.custom,
        message: "此字段必填",
      });
    }
    if (data["seed-queue-enabled"] && !data["seed-queue-size"]) {
      ctx.addIssue({
        path: ["seed-queue-size"],
        code: z.ZodIssueCode.custom,
        message: "此字段必填",
      });
    }
  });

const transmissionDayOptions: SelectOption[] = [
  { id: "127", label: "每天", left: "calendar" as const, value: 127 },
  { id: "62", label: "工作日", left: "calendar" as const, value: 62 },
  { id: "65", label: "周末", left: "calendar" as const, value: 65 },
  { id: "2", label: "周一", left: "calendar" as const, value: 2 },
  { id: "4", label: "周二", left: "calendar" as const, value: 4 },
  { id: "8", label: "周三", left: "calendar" as const, value: 8 },
  { id: "16", label: "周四", left: "calendar" as const, value: 16 },
  { id: "32", label: "周五", left: "calendar" as const, value: 32 },
  { id: "64", label: "周六", left: "calendar" as const, value: 64 },
  { id: "1", label: "周日", left: "calendar" as const, value: 1 },
];

function sessionToFormValues(s: Session): Form {
  return {
    ...s,
    "alt-speed-time-begin-hour": Math.floor(s["alt-speed-time-begin"] / 60),
    "alt-speed-time-begin-min": s["alt-speed-time-begin"] % 60,
    "alt-speed-time-end-hour": Math.floor(s["alt-speed-time-end"] / 60),
    "alt-speed-time-end-min": s["alt-speed-time-end"] % 60,
  };
}

function formValuesToSession(f: Form): Partial<Session> {
  const { "alt-speed-time-begin-hour": bh, "alt-speed-time-begin-min": bm, "alt-speed-time-end-hour": eh, "alt-speed-time-end-min": em, ...rest } = f;
  return {
    ...rest,
    "alt-speed-time-begin": bh * 60 + bm,
    "alt-speed-time-end": eh * 60 + em,
  };
}

function ConfigurationForm({ server }: { server: Server }) {
  const { data: session, isLoading, error, refetch } = useServerSession(server);
  const { mutate } = useServerSessionSet(server);
  const { red } = useTheme();
  const inset = useSafeAreaInsets();
  const navigation = useNavigation();
  // libtorrent4j doesn't expose alt-speed scheduling, idle-seeding-limit, or
  // a runtime PEX toggle. Hide those rows when configuring a local engine
  // rather than show controls that don't do anything.
  const isLocal = server.type === "local";

  const formValues = React.useMemo(
    () => session && sessionToFormValues(session),
    [session],
  );

  const { control, handleSubmit, watch } = useForm({
    mode: "onBlur",
    resolver: zodResolver(Form),
    values: formValues ?? undefined,
  });

  const onSubmit = handleSubmit(
    React.useCallback(
      (f: Form) => {
        mutate(formValuesToSession(f), {
          onSuccess: () => {
            ToastAndroid.show(
              "服务器已更新",
              ToastAndroid.SHORT
            );
            router.back();
          },
          onError: () => {
            ToastAndroid.show("更新服务器失败", ToastAndroid.SHORT);
          },
        });
      },
      [mutate]
    )
  );

  React.useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <ActionIcon name="save" onPress={onSubmit} />
      ),
    });
  }, [navigation, onSubmit]);

  if (error) {
    return <NetworkErrorScreen error={error} refetch={refetch} />;
  }

  if (isLoading || !session) {
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
        <SettingsSectionTitle title="速度限制" first />

        <View style={styles.row}>
          <Controller
            name="speed-limit-down-enabled"
            control={control}
            render={({ field }) => (
              <SettingsToggleFieldLabel
                label="下载 (KB/s)"
                value={field.value}
                onPress={field.onChange}
              />
            )}
          />
          <Controller
            name="speed-limit-down"
            control={control}
            render={({ field, fieldState }) => (
              <>
                <SettingsTextInput
                  keyboardType="numeric"
                  editable={watch("speed-limit-down-enabled")}
                  value={field.value?.toString() || ""}
                  onChangeText={field.onChange}
                  style={[fieldState.error ? { borderColor: red } : {}]}
                />
                <Text style={[styles.error, { color: red }]}>
                  {fieldState.error?.message}
                </Text>
              </>
            )}
          />
        </View>

        <View style={styles.row}>
          <Controller
            name="speed-limit-up-enabled"
            control={control}
            render={({ field }) => (
              <SettingsToggleFieldLabel
                label="上传 (KB/s)"
                value={field.value}
                onPress={field.onChange}
              />
            )}
          />
          <Controller
            name="speed-limit-up"
            control={control}
            render={({ field, fieldState }) => (
              <>
                <SettingsTextInput
                  keyboardType="numeric"
                  editable={watch("speed-limit-up-enabled")}
                  value={field.value?.toString() || ""}
                  onChangeText={field.onChange}
                  style={[fieldState.error ? { borderColor: red } : {}]}
                />
                <Text style={[styles.error, { color: red }]}>
                  {fieldState.error?.message}
                </Text>
              </>
            )}
          />
        </View>

        {!isLocal && (
          <>
            <SettingsSectionTitle title="备用速度限制" />

            <View style={styles.row}>
              <Controller
                name="alt-speed-enabled"
            control={control}
            render={({ field }) => (
              <SettingsToggle
                value={field.value}
                onPress={field.onChange}
                label="启用备用速度限制"
                description="使用备用上传和下载限制。"
              />
            )}
          />
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>下载 (kB/s)</Text>
          <Controller
            name="alt-speed-down"
            control={control}
            render={({ field, fieldState }) => (
              <>
                <SettingsTextInput
                  keyboardType="numeric"
                  value={field.value?.toString() || ""}
                  onChangeText={field.onChange}
                  style={[fieldState.error ? { borderColor: red } : {}]}
                />
                <Text style={[styles.error, { color: red }]}>
                  {fieldState.error?.message}
                </Text>
              </>
            )}
          />
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>上传 (kB/s)</Text>
          <Controller
            name="alt-speed-up"
            control={control}
            render={({ field, fieldState }) => (
              <>
                <SettingsTextInput
                  keyboardType="numeric"
                  value={field.value?.toString() || ""}
                  onChangeText={field.onChange}
                  style={[fieldState.error ? { borderColor: red } : {}]}
                />
                <Text style={[styles.error, { color: red }]}>
                  {fieldState.error?.message}
                </Text>
              </>
            )}
          />
        </View>

        <View style={styles.row}>
          <Controller
            name="alt-speed-time-enabled"
            control={control}
            render={({ field }) => (
              <SettingsToggle
                value={field.value}
                onPress={field.onChange}
                label="定时启用备用速度限制"
                description="按时间和日期应用备用限制。"
              />
            )}
          />
        </View>

        {watch("alt-speed-time-enabled") && (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>从</Text>
              <SettingsInlineGroup>
                <Controller
                  name="alt-speed-time-begin-hour"
                  control={control}
                  render={({ field }) => (
                    <SettingsTextInput
                      containerStyle={{ flex: 1 }}
                      keyboardType="numeric"
                      placeholder="HH"
                      value={field.value?.toString() || ""}
                      onChangeText={field.onChange}
                    />
                  )}
                />
                <Text style={{ fontSize: 20 }}>:</Text>
                <Controller
                  name="alt-speed-time-begin-min"
                  control={control}
                  render={({ field }) => (
                    <SettingsTextInput
                      containerStyle={{ flex: 1 }}
                      keyboardType="numeric"
                      placeholder="MM"
                      value={field.value?.toString() || ""}
                      onChangeText={field.onChange}
                    />
                  )}
                />
              </SettingsInlineGroup>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>到</Text>
              <SettingsInlineGroup>
                <Controller
                  name="alt-speed-time-end-hour"
                  control={control}
                  render={({ field }) => (
                    <SettingsTextInput
                      containerStyle={{ flex: 1 }}
                      keyboardType="numeric"
                      placeholder="HH"
                      value={field.value?.toString() || ""}
                      onChangeText={field.onChange}
                    />
                  )}
                />
                <Text style={{ fontSize: 20 }}>:</Text>
                <Controller
                  name="alt-speed-time-end-min"
                  control={control}
                  render={({ field }) => (
                    <SettingsTextInput
                      containerStyle={{ flex: 1 }}
                      keyboardType="numeric"
                      placeholder="MM"
                      value={field.value?.toString() || ""}
                      onChangeText={field.onChange}
                    />
                  )}
                />
              </SettingsInlineGroup>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>日期</Text>
              <Controller
                name="alt-speed-time-day"
                control={control}
                render={({ field }) => (
                  <SettingsSelectInput
                    title="日期"
                    value={field.value}
                    options={transmissionDayOptions}
                    onChange={field.onChange}
                  />
                )}
              />
            </View>
          </>
        )}
          </>
        )}

        <SettingsSectionTitle title="做种" />

        <View style={styles.row}>
          <Controller
            name="seedRatioLimited"
            control={control}
            render={({ field }) => (
              <SettingsToggleFieldLabel
                label="达到分享率后停止做种"
                value={field.value}
                onPress={field.onChange}
              />
            )}
          />
          <Controller
            name="seedRatioLimit"
            control={control}
            render={({ field, fieldState }) => (
              <>
                <SettingsTextInput
                  keyboardType="numeric"
                  editable={watch("seedRatioLimited")}
                  value={field.value?.toString() || ""}
                  onChangeText={field.onChange}
                  style={[fieldState.error ? { borderColor: red } : {}]}
                />
                <Text style={[styles.error, { color: red }]}>
                  {fieldState.error?.message}
                </Text>
              </>
            )}
          />
        </View>

        {!isLocal && (
          <View style={styles.row}>
            <Controller
              name="idle-seeding-limit-enabled"
              control={control}
              render={({ field }) => (
                <SettingsToggleFieldLabel
                  label="空闲做种停止时间（分钟）"
                  value={field.value}
                  onPress={field.onChange}
                />
              )}
            />
            <Controller
              name="idle-seeding-limit"
              control={control}
              render={({ field, fieldState }) => (
                <>
                  <SettingsTextInput
                    keyboardType="numeric"
                    editable={watch("idle-seeding-limit-enabled")}
                    value={field.value?.toString() || ""}
                    onChangeText={field.onChange}
                    style={[fieldState.error ? { borderColor: red } : {}]}
                  />
                  <Text style={[styles.error, { color: red }]}>
                    {fieldState.error?.message}
                  </Text>
                </>
              )}
            />
          </View>
        )}

        <SettingsSectionTitle title="队列" />

        <View style={styles.row}>
          <Controller
            name="download-queue-enabled"
            control={control}
            render={({ field }) => (
              <SettingsToggleFieldLabel
                label="下载队列大小"
                value={field.value}
                onPress={field.onChange}
              />
            )}
          />
          <Controller
            name="download-queue-size"
            control={control}
            render={({ field, fieldState }) => (
              <>
                <SettingsTextInput
                  keyboardType="numeric"
                  editable={watch("download-queue-enabled")}
                  value={field.value?.toString() || ""}
                  onChangeText={field.onChange}
                  style={[fieldState.error ? { borderColor: red } : {}]}
                />
                <Text style={[styles.error, { color: red }]}>
                  {fieldState.error?.message}
                </Text>
              </>
            )}
          />
        </View>

        <View style={styles.row}>
          <Controller
            name="seed-queue-enabled"
            control={control}
            render={({ field }) => (
              <SettingsToggleFieldLabel
                label="做种队列大小"
                value={field.value}
                onPress={field.onChange}
              />
            )}
          />
          <Controller
            name="seed-queue-size"
            control={control}
            render={({ field, fieldState }) => (
              <>
                <SettingsTextInput
                  keyboardType="numeric"
                  editable={watch("seed-queue-enabled")}
                  value={field.value?.toString() || ""}
                  onChangeText={field.onChange}
                  style={[fieldState.error ? { borderColor: red } : {}]}
                />
                <Text style={[styles.error, { color: red }]}>
                  {fieldState.error?.message}
                </Text>
              </>
            )}
          />
        </View>

        {(server.type === "transmission" || server.type === "local") && (
          <>
            <SettingsSectionTitle title="Peer 发现" />

            <View style={[styles.row, { gap: 16 }]}>
              <Controller
                name="dht-enabled"
                control={control}
                render={({ field }) => (
                  <SettingsToggle
                    value={field.value ?? false}
                    onPress={field.onChange}
                    label="启用 DHT"
                    description="从分布式网络查找 Peer。"
                  />
                )}
              />
              <Controller
                name="lpd-enabled"
                control={control}
                render={({ field }) => (
                  <SettingsToggle
                    value={field.value ?? false}
                    onPress={field.onChange}
                    label="启用本地 Peer 发现"
                    description="在本地网络中查找 Peer。"
                  />
                )}
              />
              {!isLocal && (
                <Controller
                  name="pex-enabled"
                  control={control}
                  render={({ field }) => (
                    <SettingsToggle
                      value={field.value ?? false}
                      onPress={field.onChange}
                      label="启用 Peer 交换"
                      description="与已连接 Peer 交换 Peer 列表。"
                    />
                  )}
                />
              )}
            </View>
          </>
        )}
      </KeyboardAwareScrollView>
    </Screen>
  );
}

type QBitForm = z.infer<typeof QBitForm>;
const QBitForm = z.object({
  // Connection
  max_connec_enabled: z.boolean(),
  max_connec: z.coerce.number(),
  max_connec_per_torrent_enabled: z.boolean(),
  max_connec_per_torrent: z.coerce.number(),
  max_uploads_enabled: z.boolean(),
  max_uploads: z.coerce.number(),
  max_uploads_per_torrent_enabled: z.boolean(),
  max_uploads_per_torrent: z.coerce.number(),

  // Speed
  dl_limit: z.coerce.number(),
  up_limit: z.coerce.number(),
  alt_dl_limit: z.coerce.number(),
  alt_up_limit: z.coerce.number(),
  scheduler_enabled: z.boolean(),
  schedule_from_hour: z.coerce.number(),
  schedule_from_min: z.coerce.number(),
  schedule_to_hour: z.coerce.number(),
  schedule_to_min: z.coerce.number(),
  scheduler_days: z.number(),

  // Seed
  max_ratio_enabled: z.boolean(),
  max_ratio: z.coerce.number(),
  max_seeding_time_enabled: z.boolean(),
  max_seeding_time: z.coerce.number(),
  max_inactive_seeding_time_enabled: z.boolean(),
  max_inactive_seeding_time: z.coerce.number(),
  max_ratio_act: z.number(),

  // Queue
  queueing_enabled: z.boolean(),
  max_active_downloads: z.coerce.number(),
  max_active_uploads: z.coerce.number(),
  max_active_torrents: z.coerce.number(),

  // Peer discovery
  dht: z.boolean(),
  pex: z.boolean(),
  lsd: z.boolean(),
  encryption: z.number(),
});

const encryptionOptions: SelectOption[] = [
  { id: "0", label: "优先加密", left: "lock" as const, value: 0 },
  { id: "1", label: "强制加密", left: "lock" as const, value: 1 },
  { id: "2", label: "允许未加密", left: "unlock" as const, value: 2 },
];

const schedulerDaysOptions: SelectOption[] = [
  { id: "0", label: "每天", left: "calendar" as const, value: 0 },
  { id: "1", label: "工作日", left: "calendar" as const, value: 1 },
  { id: "2", label: "周末", left: "calendar" as const, value: 2 },
  { id: "3", label: "周一", left: "calendar" as const, value: 3 },
  { id: "4", label: "周二", left: "calendar" as const, value: 4 },
  { id: "5", label: "周三", left: "calendar" as const, value: 5 },
  { id: "6", label: "周四", left: "calendar" as const, value: 6 },
  { id: "7", label: "周五", left: "calendar" as const, value: 7 },
  { id: "8", label: "周六", left: "calendar" as const, value: 8 },
  { id: "9", label: "周日", left: "calendar" as const, value: 9 },
];

const seedingActionOptions: SelectOption[] = [
  { id: "0", label: "停止种子", left: "square" as const, value: 0 },
  { id: "1", label: "移除种子", left: "trash" as const, value: 1 },
  { id: "3", label: "移除种子及其文件", left: "trash-2" as const, value: 3 },
  { id: "2", label: "启用超级做种", left: "zap" as const, value: 2 },
];

function prefsToFormValues(prefs: QBitPreferences): QBitForm {
  return {
    ...prefs,
    max_connec_enabled: prefs.max_connec >= 0,
    max_connec: prefs.max_connec >= 0 ? prefs.max_connec : 500,
    max_connec_per_torrent_enabled: prefs.max_connec_per_torrent >= 0,
    max_connec_per_torrent: prefs.max_connec_per_torrent >= 0 ? prefs.max_connec_per_torrent : 100,
    max_uploads_enabled: prefs.max_uploads >= 0,
    max_uploads: prefs.max_uploads >= 0 ? prefs.max_uploads : 20,
    max_uploads_per_torrent_enabled: prefs.max_uploads_per_torrent >= 0,
    max_uploads_per_torrent: prefs.max_uploads_per_torrent >= 0 ? prefs.max_uploads_per_torrent : 4,
  };
}

function formValuesToPrefs(f: QBitForm): Record<string, unknown> {
  const result: Record<string, unknown> = { ...f };
  result.max_connec = f.max_connec_enabled ? f.max_connec : -1;
  result.max_connec_per_torrent = f.max_connec_per_torrent_enabled ? f.max_connec_per_torrent : -1;
  result.max_uploads = f.max_uploads_enabled ? f.max_uploads : -1;
  result.max_uploads_per_torrent = f.max_uploads_per_torrent_enabled ? f.max_uploads_per_torrent : -1;
  delete result.max_connec_enabled;
  delete result.max_connec_per_torrent_enabled;
  delete result.max_uploads_enabled;
  delete result.max_uploads_per_torrent_enabled;
  return result;
}

function QBitConfigForm({ server }: { server: Server }) {
  const { data: raw, isLoading, error, refetch } = useServerPreferences(server);
  const { mutate } = useServerPreferencesSet(server);
  const inset = useSafeAreaInsets();
  const navigation = useNavigation();

  const prefs = raw as QBitPreferences | undefined;
  const formValues = React.useMemo(
    () => prefs && prefsToFormValues(prefs),
    [prefs],
  );

  const { control, handleSubmit, watch } = useForm({
    mode: "onBlur",
    resolver: zodResolver(QBitForm),
    values: formValues ?? undefined,
  });

  const onSubmit = handleSubmit(
    React.useCallback(
      (f: QBitForm) => {
        mutate(formValuesToPrefs(f), {
          onSuccess: () => {
            ToastAndroid.show("服务器已更新", ToastAndroid.SHORT);
            router.back();
          },
          onError: () => {
            ToastAndroid.show("更新服务器失败", ToastAndroid.SHORT);
          },
        });
      },
      [mutate],
    ),
  );

  React.useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <ActionIcon name="save" onPress={onSubmit} />
      ),
    });
  }, [navigation, onSubmit]);

  if (error) {
    return <NetworkErrorScreen error={error} refetch={refetch} />;
  }

  if (isLoading || !prefs) {
    return <LoadingScreen />;
  }

  const anySeedLimitEnabled =
    watch("max_ratio_enabled") ||
    watch("max_seeding_time_enabled") ||
    watch("max_inactive_seeding_time_enabled");

  return (
    <Screen>
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        bottomOffset={8}
        contentInset={{ bottom: inset.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <SettingsSectionTitle title="连接限制" first />

        <View style={styles.row}>
          <Controller
            name="max_connec_enabled"
            control={control}
            render={({ field }) => (
              <SettingsToggleFieldLabel
                label="全局最大连接数"
                value={field.value}
                onPress={field.onChange}
              />
            )}
          />
          <Controller
            name="max_connec"
            control={control}
            render={({ field }) => (
              <SettingsTextInput
                keyboardType="numeric"
                editable={watch("max_connec_enabled")}
                value={field.value?.toString() || ""}
                onChangeText={field.onChange}
              />
            )}
          />
        </View>

        <View style={styles.row}>
          <Controller
            name="max_connec_per_torrent_enabled"
            control={control}
            render={({ field }) => (
              <SettingsToggleFieldLabel
                label="单种子最大连接数"
                value={field.value}
                onPress={field.onChange}
              />
            )}
          />
          <Controller
            name="max_connec_per_torrent"
            control={control}
            render={({ field }) => (
              <SettingsTextInput
                keyboardType="numeric"
                editable={watch("max_connec_per_torrent_enabled")}
                value={field.value?.toString() || ""}
                onChangeText={field.onChange}
              />
            )}
          />
        </View>

        <View style={styles.row}>
          <Controller
            name="max_uploads_enabled"
            control={control}
            render={({ field }) => (
              <SettingsToggleFieldLabel
                label="全局最大上传槽数"
                value={field.value}
                onPress={field.onChange}
              />
            )}
          />
          <Controller
            name="max_uploads"
            control={control}
            render={({ field }) => (
              <SettingsTextInput
                keyboardType="numeric"
                editable={watch("max_uploads_enabled")}
                value={field.value?.toString() || ""}
                onChangeText={field.onChange}
              />
            )}
          />
        </View>

        <View style={styles.row}>
          <Controller
            name="max_uploads_per_torrent_enabled"
            control={control}
            render={({ field }) => (
              <SettingsToggleFieldLabel
                label="单种子最大上传槽数"
                value={field.value}
                onPress={field.onChange}
              />
            )}
          />
          <Controller
            name="max_uploads_per_torrent"
            control={control}
            render={({ field }) => (
              <SettingsTextInput
                keyboardType="numeric"
                editable={watch("max_uploads_per_torrent_enabled")}
                value={field.value?.toString() || ""}
                onChangeText={field.onChange}
              />
            )}
          />
        </View>

        <SettingsSectionTitle title="速度限制" />

        <View style={styles.row}>
          <Text style={styles.label}>下载 (KB/s，0 表示不限速)</Text>
          <Controller
            name="dl_limit"
            control={control}
            render={({ field }) => (
              <SettingsTextInput
                keyboardType="numeric"
                value={field.value?.toString() || ""}
                onChangeText={field.onChange}
              />
            )}
          />
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>上传 (KB/s，0 表示不限速)</Text>
          <Controller
            name="up_limit"
            control={control}
            render={({ field }) => (
              <SettingsTextInput
                keyboardType="numeric"
                value={field.value?.toString() || ""}
                onChangeText={field.onChange}
              />
            )}
          />
        </View>

        <SettingsSectionTitle title="备用速度限制" />

        <View style={styles.row}>
          <Text style={styles.label}>下载 (KB/s)</Text>
          <Controller
            name="alt_dl_limit"
            control={control}
            render={({ field }) => (
              <SettingsTextInput
                keyboardType="numeric"
                value={field.value?.toString() || ""}
                onChangeText={field.onChange}
              />
            )}
          />
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>上传 (KB/s)</Text>
          <Controller
            name="alt_up_limit"
            control={control}
            render={({ field }) => (
              <SettingsTextInput
                keyboardType="numeric"
                value={field.value?.toString() || ""}
                onChangeText={field.onChange}
              />
            )}
          />
        </View>

        <View style={styles.row}>
          <Controller
            name="scheduler_enabled"
            control={control}
            render={({ field }) => (
              <SettingsToggle
                value={field.value}
                onPress={field.onChange}
                label="定时启用备用速度限制"
                description="按计划应用备用速度限制。"
              />
            )}
          />
        </View>

        {watch("scheduler_enabled") && (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>从</Text>
              <SettingsInlineGroup>
                <Controller
                  name="schedule_from_hour"
                  control={control}
                  render={({ field }) => (
                    <SettingsTextInput
                      containerStyle={{ flex: 1 }}
                      keyboardType="numeric"
                      placeholder="HH"
                      value={field.value?.toString() || ""}
                      onChangeText={field.onChange}
                    />
                  )}
                />
                <Text style={{ fontSize: 20 }}>:</Text>
                <Controller
                  name="schedule_from_min"
                  control={control}
                  render={({ field }) => (
                    <SettingsTextInput
                      containerStyle={{ flex: 1 }}
                      keyboardType="numeric"
                      placeholder="MM"
                      value={field.value?.toString() || ""}
                      onChangeText={field.onChange}
                    />
                  )}
                />
              </SettingsInlineGroup>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>到</Text>
              <SettingsInlineGroup>
                <Controller
                  name="schedule_to_hour"
                  control={control}
                  render={({ field }) => (
                    <SettingsTextInput
                      containerStyle={{ flex: 1 }}
                      keyboardType="numeric"
                      placeholder="HH"
                      value={field.value?.toString() || ""}
                      onChangeText={field.onChange}
                    />
                  )}
                />
                <Text style={{ fontSize: 20 }}>:</Text>
                <Controller
                  name="schedule_to_min"
                  control={control}
                  render={({ field }) => (
                    <SettingsTextInput
                      containerStyle={{ flex: 1 }}
                      keyboardType="numeric"
                      placeholder="MM"
                      value={field.value?.toString() || ""}
                      onChangeText={field.onChange}
                    />
                  )}
                />
              </SettingsInlineGroup>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>日期</Text>
              <Controller
                name="scheduler_days"
                control={control}
                render={({ field }) => (
                  <SettingsSelectInput
                    title="日期"
                    value={field.value}
                    options={schedulerDaysOptions}
                    onChange={field.onChange}
                  />
                )}
              />
            </View>
          </>
        )}

        <SettingsSectionTitle title="做种" />

        <View style={styles.row}>
          <Controller
            name="max_ratio_enabled"
            control={control}
            render={({ field }) => (
              <SettingsToggleFieldLabel
                label="当分享率达到"
                value={field.value}
                onPress={field.onChange}
              />
            )}
          />
          <Controller
            name="max_ratio"
            control={control}
            render={({ field }) => (
              <SettingsTextInput
                keyboardType="numeric"
                editable={watch("max_ratio_enabled")}
                value={field.value?.toString() || ""}
                onChangeText={field.onChange}
              />
            )}
          />
        </View>

        <View style={styles.row}>
          <Controller
            name="max_seeding_time_enabled"
            control={control}
            render={({ field }) => (
              <SettingsToggleFieldLabel
                label="当总做种时间达到（分钟）"
                value={field.value}
                onPress={field.onChange}
              />
            )}
          />
          <Controller
            name="max_seeding_time"
            control={control}
            render={({ field }) => (
              <SettingsTextInput
                keyboardType="numeric"
                editable={watch("max_seeding_time_enabled")}
                value={field.value?.toString() || ""}
                onChangeText={field.onChange}
              />
            )}
          />
        </View>

        <View style={styles.row}>
          <Controller
            name="max_inactive_seeding_time_enabled"
            control={control}
            render={({ field }) => (
              <SettingsToggleFieldLabel
                label="当空闲做种时间达到（分钟）"
                value={field.value}
                onPress={field.onChange}
              />
            )}
          />
          <Controller
            name="max_inactive_seeding_time"
            control={control}
            render={({ field }) => (
              <SettingsTextInput
                keyboardType="numeric"
                editable={watch("max_inactive_seeding_time_enabled")}
                value={field.value?.toString() || ""}
                onChangeText={field.onChange}
              />
            )}
          />
        </View>

        {anySeedLimitEnabled && (
          <View style={styles.row}>
            <Text style={styles.label}>然后</Text>
            <Controller
              name="max_ratio_act"
              control={control}
              render={({ field }) => (
                <SettingsSelectInput
                  title="做种动作"
                  value={field.value}
                  options={seedingActionOptions}
                  onChange={field.onChange}
                />
              )}
            />
          </View>
        )}

        <SettingsSectionTitle title="队列" />

        <View style={styles.row}>
          <Controller
            name="queueing_enabled"
            control={control}
            render={({ field }) => (
              <SettingsToggle
                value={field.value}
                onPress={field.onChange}
                label="启用队列"
                description="对活动种子使用队列限制。"
              />
            )}
          />
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>最大活动下载数</Text>
          <Controller
            name="max_active_downloads"
            control={control}
            render={({ field }) => (
              <SettingsTextInput
                keyboardType="numeric"
                editable={watch("queueing_enabled")}
                value={field.value?.toString() || ""}
                onChangeText={field.onChange}
              />
            )}
          />
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>最大活动上传数</Text>
          <Controller
            name="max_active_uploads"
            control={control}
            render={({ field }) => (
              <SettingsTextInput
                keyboardType="numeric"
                editable={watch("queueing_enabled")}
                value={field.value?.toString() || ""}
                onChangeText={field.onChange}
              />
            )}
          />
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>最大活动种子数</Text>
          <Controller
            name="max_active_torrents"
            control={control}
            render={({ field }) => (
              <SettingsTextInput
                keyboardType="numeric"
                editable={watch("queueing_enabled")}
                value={field.value?.toString() || ""}
                onChangeText={field.onChange}
              />
            )}
          />
        </View>

        <SettingsSectionTitle title="Peer 发现" />

        <View style={[styles.row, { gap: 16 }]}>
          <Controller
            name="dht"
            control={control}
            render={({ field }) => (
              <SettingsToggle
                value={field.value}
                onPress={field.onChange}
                label="启用 DHT"
                description="从分布式网络查找 Peer。"
              />
            )}
          />
          <Controller
            name="pex"
            control={control}
            render={({ field }) => (
              <SettingsToggle
                value={field.value}
                onPress={field.onChange}
                label="启用 Peer 交换"
                description="与已连接 Peer 交换 Peer 列表。"
              />
            )}
          />
          <Controller
            name="lsd"
            control={control}
            render={({ field }) => (
              <SettingsToggle
                value={field.value}
                onPress={field.onChange}
                label="启用本地 Peer 发现"
                description="在本地网络中查找 Peer。"
              />
            )}
          />
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>加密</Text>
          <Controller
            name="encryption"
            control={control}
            render={({ field }) => (
              <SettingsSelectInput
                title="加密"
                value={field.value}
                options={encryptionOptions}
                onChange={field.onChange}
              />
            )}
          />
        </View>
      </KeyboardAwareScrollView>
    </Screen>
  );
}

export default function ServerConfigurationScreen() {
  const servers = useServers();
  const activeServerId = useActiveServerId();
  const { text } = useTheme();

  const [selectedId, setSelectedId] = React.useState<string | undefined>(
    activeServerId ?? servers[0]?.id
  );

  const server = selectedId
    ? servers.find((s) => s.id === selectedId)
    : undefined;

  const onPickServer = React.useCallback(() => {
    const options: SelectOption[] = servers.map((s) => ({
      id: s.id,
      label: s.name,
      value: s.id,
      left: "server" as const,
      right: s.id === selectedId ? ("check" as const) : undefined,
    }));

    SheetManager.show(SELECT_SHEET_ID, {
      payload: {
        title: "选择服务器",
        options,
        onSelect: (value) => setSelectedId(String(value)),
      },
    });
  }, [servers, selectedId]);

  if (servers.length === 0) {
    return (
      <Screen>
        <Text>尚未配置服务器</Text>
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {servers.length > 1 && (
        <Pressable style={styles.serverSelector} onPress={onPickServer}>
          <Feather name="server" size={16} color={text} />
          <Text style={styles.serverName}>{server?.name ?? "选择服务器"}</Text>
          <Feather name="chevron-down" size={16} color={text} />
        </Pressable>
      )}
      {server && (
        server.type === "qbittorrent"
          ? <QBitConfigForm server={server} />
          : <ConfigurationForm server={server} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  serverSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  serverName: {
    flex: 1,
    fontFamily: "RobotoMono-Medium",
    fontSize: 15,
  },
  row: {
    marginBottom: 14,
  },
  toggleLabel: {
    position: "relative",
    paddingRight: 44,
    marginBottom: 8,
  },
  toggleLabelText: {
    fontFamily: "RobotoMono-Medium",
    fontSize: 13,
    lineHeight: 18,
  },
  toggleLabelControl: {
    position: "absolute",
    right: 0,
    top: "50%",
    transform: [{ translateY: -16 }],
  },
  label: {
    fontFamily: "RobotoMono-Medium",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  error: {
    fontSize: 12,
    marginTop: 4,
  },
});
