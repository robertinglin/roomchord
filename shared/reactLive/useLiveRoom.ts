import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { backendOfflineMessage, createRoomKitExampleHost, type RoomKitExampleHostBridge, type RoomKitExampleOperation } from "../frontend/liveHost";
import type { LiveRoomOptions, LiveRoomStatus, RoomKitActor, RoomKitDraftOperation, RoomKitHostResult, RoomKitLaunchEnvelope } from "./types";

let globalSeq = 0;

function clone<T>(value: T): T {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

function defaultActor(appName: string): RoomKitActor {
  const slug = appSlug(appName);
  return {
    memberId: `${slug}-admin`,
    deviceId: `dev-${slug}`,
    role: "admin",
    displayName: `${appName} Admin`
  };
}

function appSlug(appName: string): string {
  return appName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "roomkit";
}

export function useLiveRoom<State>(options: LiveRoomOptions<State>) {
  const defaultRoomId = useMemo(() => `${appSlug(options.appName)}-room`, [options.appName]);
  const roomId = options.envelope?.room?.id || defaultRoomId;
  const roomName = options.envelope?.room?.name || options.appName;
  const sourceActor = options.actor || options.envelope?.actor;
  const sourceMemberId = sourceActor?.memberId;
  const sourceDeviceId = sourceActor?.deviceId;
  const sourceRole = sourceActor?.role;
  const sourceDisplayName = sourceActor?.displayName;
  const sourceAvatar = sourceActor?.avatar;
  const sourceAvatarUrl = sourceActor?.avatarUrl;
  const sourceProfileImageUrl = sourceActor?.profileImageUrl;
  const hasSourceActor = Boolean(sourceActor);
  const actor = useMemo<RoomKitActor>(() => {
    if (hasSourceActor) {
      return {
        memberId: sourceMemberId || "",
        deviceId: sourceDeviceId || "",
        role: sourceRole || "member",
        displayName: sourceDisplayName,
        avatar: sourceAvatar,
        avatarUrl: sourceAvatarUrl,
        profileImageUrl: sourceProfileImageUrl
      };
    }
    return defaultActor(options.appName);
  }, [hasSourceActor, options.appName, sourceAvatar, sourceAvatarUrl, sourceDeviceId, sourceDisplayName, sourceMemberId, sourceProfileImageUrl, sourceRole]);
  const envelopeActor = options.envelope?.actor;
  const hasEnvelopeActor = Boolean(envelopeActor);
  const credentialId = options.envelope?.credentialGrant?.credentialId;
  const envelope = useMemo<RoomKitLaunchEnvelope>(() => {
    const next: RoomKitLaunchEnvelope = { room: { id: roomId, name: roomName } };
    if (credentialId) next.credentialGrant = { credentialId };
    if (hasEnvelopeActor) next.actor = actor;
    return next;
  }, [actor, credentialId, hasEnvelopeActor, roomId, roomName]);
  const hasInitialState = options.initialState !== undefined;
  const [state, setState] = useState<State>(() => clone(hasInitialState ? options.initialState as State : options.emptyState));
  const [ready, setReady] = useState(hasInitialState);
  const [status, setStatus] = useState<LiveRoomStatus>(hasInitialState ? "connected" : "connecting");
  const [message, setMessage] = useState(hasInitialState ? "Connected to RoomKit backend" : "Connecting to RoomKit backend");
  const [lastOperation, setLastOperation] = useState<string | undefined>();
  const stateVersion = useRef(hasInitialState ? 1 : 0);

  const host = useMemo<RoomKitExampleHostBridge<State, RoomKitExampleOperation> | undefined>(() => {
    return createRoomKitExampleHost<State, RoomKitExampleOperation>({
      bridgeName: options.bridgeName,
      defaultBackendPort: options.defaultBackendPort
    });
  }, [options.bridgeName, options.defaultBackendPort]);

  const applyState = useCallback((next: State) => {
    stateVersion.current += 1;
    setState(clone(next));
    setReady(true);
  }, []);

  const applyConnectedState = useCallback((next: State) => {
    applyState(next);
    setStatus("connected");
    setMessage("Connected to RoomKit backend");
  }, [applyState]);

  const refresh = useCallback(async (isStale?: () => boolean) => {
    if (!host?.getState) {
      if (!isStale?.()) {
        setStatus("offline");
        setMessage(backendOfflineMessage(options.appName));
      }
      return undefined;
    }
    const startedAt = stateVersion.current;
    try {
      setStatus((current) => current === "saving" || stateVersion.current > 0 ? current : "connecting");
      const next = await host.getState(roomId, actor);
      if (isStale?.() || stateVersion.current !== startedAt) return next;
      applyConnectedState(next);
      return next;
    } catch (error) {
      if (isStale?.() || stateVersion.current !== startedAt) return undefined;
      console.error("[roomkit] state refresh failed:", error);
      setStatus("error");
      setMessage(error instanceof Error ? error.message : backendOfflineMessage(options.appName));
      return undefined;
    }
  }, [actor, applyConnectedState, host, options.appName, roomId]);

  useEffect(() => {
    let cancelled = false;
    let subscriptionDelivered = false;
    const unsubscribe = host?.subscribe?.((next) => {
      if (cancelled) return;
      subscriptionDelivered = true;
      applyConnectedState(next);
    });
    refresh(() => cancelled || subscriptionDelivered);
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [applyConnectedState, host, refresh]);

  const dispatch = useCallback(async (schemaAction: string, payload: Record<string, unknown> = {}, draft: Partial<RoomKitDraftOperation> = {}) => {
    const operation: RoomKitExampleOperation = {
      id: draft.id || `ui_${Date.now()}_${++globalSeq}`,
      type: draft.type || schemaAction,
      schemaAction: draft.schemaAction || draft.action || schemaAction,
      pluginId: draft.pluginId,
      payload,
      createdAt: draft.createdAt || Date.now(),
      actor: draft.actor || actor,
      auth: draft.auth || { credentialId: `cred_${actor.memberId}`, signature: "sig" }
    };
    if (!host?.sendOperation) {
      console.warn(`[roomkit] "${schemaAction}" not sent — backend bridge offline:`, backendOfflineMessage(options.appName));
      setStatus("offline");
      setMessage(backendOfflineMessage(options.appName));
      return { ok: false, reason: backendOfflineMessage(options.appName), state } as RoomKitHostResult<State>;
    }
    setStatus("saving");
    setLastOperation(schemaAction);
    try {
      const result = await host.sendOperation(operation) as RoomKitHostResult<State>;
      if (result.ok === false) {
        const reason = result.reason || "Operation rejected";
        console.error(`[roomkit] "${schemaAction}" rejected by host:`, reason, { operation });
        setStatus("error");
        setMessage(reason);
        if (result.state) applyState(result.state);
        return result;
      }
      if (result.state) applyState(result.state);
      else await refresh();
      setStatus("connected");
      setMessage(`${schemaAction} accepted`);
      return result;
    } catch (error) {
      console.error(`[roomkit] "${schemaAction}" failed:`, error, { operation });
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Operation failed");
      return { ok: false, reason: error instanceof Error ? error.message : "Operation failed", state } as RoomKitHostResult<State>;
    }
  }, [actor, applyState, host, options.appName, refresh, state]);

  return {
    actor,
    dispatch,
    envelope,
    host,
    lastOperation,
    message,
    ready,
    refresh,
    state,
    status
  };
}
