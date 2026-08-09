import React from "react";
import type {
  MatterhornCustomMediaClient,
  MatterhornCustomMediaMessageReference,
  MatterhornCustomMediaRecord
} from "matterhorn-sdk/browser";
import type { DrivePickerAdapter } from "@shared/model/drivePickerAdapter";
import { CustomMediaCatalog } from "@features/custom-media/ui/CustomMediaCatalog";

export function CustomMediaManager({
  client,
  scopeType,
  scopeId,
  drivePickerAdapter,
  onSelectReference,
  onRecordsChanged
}: {
  client: MatterhornCustomMediaClient;
  scopeType: string;
  scopeId: string;
  drivePickerAdapter?: DrivePickerAdapter;
  onSelectReference?: (reference: MatterhornCustomMediaMessageReference) => void;
  onRecordsChanged?: (records: MatterhornCustomMediaRecord[]) => void;
}) {
  return (
    <CustomMediaCatalog
      client={client}
      scopeType={scopeType}
      scopeId={scopeId}
      drivePickerAdapter={drivePickerAdapter}
      onSelectReference={onSelectReference}
      onRecordsChanged={onRecordsChanged}
    />
  );
}
