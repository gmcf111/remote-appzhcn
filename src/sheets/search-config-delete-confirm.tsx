import * as React from "react";
import { router } from "expo-router";

import ActionSheet, { SheetProps } from "~/components/action-sheet";
import { useTheme } from "~/hooks/use-theme-color";
import { useSearchStore } from "~/hooks/use-settings";
import { SEARCH_CONFIG_DELETE_CONFIRM_SHEET_ID } from "./ids";

export type Payload = {
  label?: string;
};

function SearchConfigDeleteConfirmSheet({
  payload,
  ...props
}: SheetProps<typeof SEARCH_CONFIG_DELETE_CONFIRM_SHEET_ID>) {
  const { red } = useTheme();
  const { store } = useSearchStore();

  const onDelete = React.useCallback(() => {
    store(null);
    router.back();
  }, [store]);

  return (
    <ActionSheet
      title={`删除 ${payload?.label ?? "搜索配置"}？`}
      options={[
        {
          label: "删除",
          left: "trash",
          color: red,
          onPress: onDelete,
        },
      ]}
      {...props}
    />
  );
}

SearchConfigDeleteConfirmSheet.sheetId = SEARCH_CONFIG_DELETE_CONFIRM_SHEET_ID;

export default SearchConfigDeleteConfirmSheet;
