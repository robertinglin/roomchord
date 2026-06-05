export type RoomKitActor = {
  memberId: string;
  deviceId: string;
  role: "guest" | "member" | "moderator" | "admin" | "owner" | string;
  displayName?: string;
  avatar?: string;
  avatarUrl?: string;
  profileImageUrl?: string;
};

export type RoomKitLaunchEnvelope = {
  room?: { id?: string; name?: string };
  actor?: RoomKitActor;
  credentialGrant?: { credentialId?: string };
};

export type RoomKitDraftOperation = {
  id?: string;
  type: string;
  schemaAction?: string;
  action?: string;
  pluginId?: string;
  payload: Record<string, unknown>;
  createdAt?: number;
  actor?: RoomKitActor;
  auth?: { credentialId?: string; signature?: string };
};

export type RoomKitHostResult<State> = {
  ok: boolean;
  state?: State;
  reason?: string;
  operation?: unknown;
};

export type LiveRoomStatus = "connecting" | "connected" | "offline" | "error" | "saving";

export type LiveRoomOptions<State> = {
  bridgeName: string;
  appName: string;
  defaultBackendPort: number;
  emptyState: State;
  envelope?: RoomKitLaunchEnvelope;
  initialState?: State;
  actor?: RoomKitActor;
};

export type LiveRoom<State> = {
  actor: RoomKitActor;
  dispatch: (type: string, payload?: Record<string, unknown>, draft?: Partial<RoomKitDraftOperation>) => Promise<RoomKitHostResult<State>>;
  envelope: RoomKitLaunchEnvelope;
  host?: unknown;
  lastOperation?: string;
  message: string;
  ready: boolean;
  refresh: () => Promise<State | undefined>;
  state: State;
  status: LiveRoomStatus;
};
