import { useEffect, useMemo, useState } from "react";
import type { MatterhornRoom } from "matterhorn-sdk/client";
import type {
  MatterhornNotificationPreferencesClient,
  MatterhornNotificationPreferencesDocument,
  NotificationMode,
  NotificationMute,
  NotificationPreference,
  NotificationResolution,
  NotificationScope
} from "matterhorn-sdk/browser";
import type { Mosh } from "../../../../types";

export type NotificationPreferencesController = {
  client: MatterhornNotificationPreferencesClient;
  error?: string;
  followed(threadId: string): boolean;
  preference(scope: NotificationScope): NotificationPreference | undefined;
  ready: boolean;
  resolve(scope: NotificationScope, categoryId?: string): NotificationResolution;
  setFollowed(threadId: string, followed: boolean): Promise<void>;
  setMode(scope: NotificationScope, mode: NotificationMode): Promise<void>;
  setMute(scope: NotificationScope, mute: NotificationMute): Promise<void>;
};

export function useNotificationPreferences(live: MatterhornRoom<Mosh>): NotificationPreferencesController {
  const client = live.notificationPreferences;
  const [document, setDocument] = useState<MatterhornNotificationPreferencesDocument>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    const unsubscribe = client.subscribe((next) => {
      if (active) setDocument(next);
    });
    void client.load().then((next) => {
      if (!active) return;
      setDocument(next);
      setError(undefined);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "Notification preferences are unavailable.");
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [client]);

  return useMemo(() => ({
    client,
    error,
    followed: (threadId: string) => client.isThreadFollowed(threadId),
    preference: (scope: NotificationScope) => client.get(scope),
    ready: Boolean(document) && !error,
    resolve: (scope: NotificationScope, categoryId?: string) => client.resolve(scope, categoryId ? { categoryId } : undefined),
    async setFollowed(threadId: string, followed: boolean) {
      if (followed) await client.followThread(threadId);
      else await client.unfollowThread(threadId);
    },
    async setMode(scope: NotificationScope, mode: NotificationMode) {
      await client.upsert(scope, mode, client.get(scope)?.mute ?? null);
    },
    async setMute(scope: NotificationScope, mute: NotificationMute) {
      await client.upsert(scope, client.get(scope)?.mode ?? "inherit", mute);
    }
  }), [client, document, error]);
}
