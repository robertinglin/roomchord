import { hashPath, hashSearchParams } from "roomkit-sdk/browser/hashRoute";

export type RoomKitExampleActor = { memberId: string; deviceId: string; role: string; displayName?: string; avatar?: string; avatarUrl?: string; profileImageUrl?: string };
export type RoomKitExampleOperation = { id?: string; type: string; schemaAction?: string; action?: string; payload: Record<string, unknown>; createdAt?: number; actor?: RoomKitExampleActor; pluginId?: string; auth?: { credentialId?: string; signature?: string } };
export type RoomKitDirectMessageDraft = { userIds: string[]; body: string; topicKey?: string; schemaAction?: string; createdAt?: number };
export type RoomKitEphemeralToken = { id: string; kind: string; scope: string; ownerId: string; ownerName: string; clientId: string; payload?: Record<string, unknown>; updatedAt: number; expiresAt: number };
export type RoomKitEphemeralTokenHandle = { id: string; update: (payload?: Record<string, unknown>) => void; release: () => void; token: () => RoomKitEphemeralToken | undefined };
export type RoomKitExampleHostBridge<State, Operation extends RoomKitExampleOperation = RoomKitExampleOperation> = {
  getState?: (roomId?: string, actor?: RoomKitExampleActor) => Promise<State> | State;
  sendOperation?: (operation: Operation) => Promise<{ ok: boolean; state?: State; reason?: string }> | { ok: boolean; state?: State; reason?: string };
  sendAction?: (schemaAction: string, payload?: Record<string, unknown>, draft?: Omit<Operation, "schemaAction" | "action" | "payload">) => Promise<{ ok: boolean; state?: State; reason?: string }> | { ok: boolean; state?: State; reason?: string };
  sendDirectMessage?: (message: RoomKitDirectMessageDraft) => Promise<{ ok: boolean; state?: State; reason?: string }> | { ok: boolean; state?: State; reason?: string };
  sendPresence?: (presence?: { status?: string; activity?: string; at?: number }) => boolean | Promise<boolean>;
  claimEphemeralToken?: (claim: { id?: string; kind: string; scope: string; payload?: Record<string, unknown>; ttlMs?: number }) => RoomKitEphemeralTokenHandle;
  getEphemeralTokens?: () => RoomKitEphemeralToken[];
  subscribeEphemeralTokens?: (listener: (tokens: RoomKitEphemeralToken[]) => void) => () => void;
  subscribe?: (listener: (state: State) => void) => () => void;
  mode?: "injected" | "http";
  url?: string;
};

declare global {
  interface Window {
    ROOMKIT_EXAMPLE_BACKEND_URL?: string;
    ROOMKIT_CHORD_HOST?: RoomKitExampleHostBridge<any, any>;
    ROOMKIT_HOST?: RoomKitExampleHostBridge<any, any>;
    ROOMKIT_EXAMPLE_HOST?: RoomKitExampleHostBridge<any, any>;
    ROOMKIT_CHAT_HOST?: RoomKitExampleHostBridge<any, any>;
  }
}

const INJECTED_BRIDGE_FALLBACKS = ["ROOMKIT_HOST", "ROOMKIT_EXAMPLE_HOST", "ROOMKIT_CHAT_HOST"];

function envBackendUrl(): string | undefined {
  const meta = (import.meta as unknown as { env?: Record<string, string | undefined> }).env || {};
  return window.ROOMKIT_EXAMPLE_BACKEND_URL || meta.VITE_ROOMKIT_EXAMPLE_BACKEND_URL;
}

function backendUrl(defaultBackendPort?: number): string | undefined {
  const fromEnv = envBackendUrl();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const query = new URLSearchParams(window.location.search).get("backend");
  if (query) return query.replace(/\/$/, "");
  if (defaultBackendPort && !isRoomKitLaunchUrl()) return `http://127.0.0.1:${defaultBackendPort}`;
  return undefined;
}

function isRoomKitLaunchUrl(): boolean {
  if (hashPath().startsWith("/room/")) return true;
  const params = hashSearchParams();
  return params.has("roomPeerId") || params.has("relayAddress") || params.has("secret");
}

async function readJsonResponse<State>(response: Response): Promise<State> {
  const parsed = await response.json();
  if (!response.ok || parsed?.ok === false) throw new Error(parsed?.reason || `RoomKit backend returned ${response.status}`);
  return parsed;
}

export function createHttpExampleHost<State, Operation extends RoomKitExampleOperation = RoomKitExampleOperation>(url: string): RoomKitExampleHostBridge<State, Operation> {
  const base = url.replace(/\/$/, "");
  return {
    mode: "http",
    url: base,
    async getState() {
      const parsed = await readJsonResponse<{ ok: true; state: State }>(await fetch(`${base}/roomkit/state`, { cache: "no-store" }));
      return parsed.state;
    },
    async sendOperation(operation: Operation) {
      return readJsonResponse(await fetch(`${base}/roomkit/operation`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(operation)
      }));
    },
    async sendAction(schemaAction, payload = {}, draft = {} as Omit<Operation, "schemaAction" | "action" | "payload">) {
      return readJsonResponse(await fetch(`${base}/roomkit/operation`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...draft, schemaAction, payload })
      }));
    }
  };
}

export function createRoomKitExampleHost<State, Operation extends RoomKitExampleOperation = RoomKitExampleOperation>({
  bridgeName,
  defaultBackendPort
}: {
  bridgeName: string;
  defaultBackendPort?: number;
}): RoomKitExampleHostBridge<State, Operation> | undefined {
  const win = window as unknown as Record<string, RoomKitExampleHostBridge<State, Operation> | undefined>;
  for (const name of [bridgeName, ...INJECTED_BRIDGE_FALLBACKS]) {
    const bridge = win[name];
    if (!bridge) continue;
    if (name !== bridgeName) win[bridgeName] = bridge;
    return { ...bridge, mode: "injected" };
  }
  const url = backendUrl(defaultBackendPort);
  if (!url) return undefined;
  const host = createHttpExampleHost<State, Operation>(url);
  win[bridgeName] = host;
  return host;
}

export function backendOfflineMessage(appName: string) {
  return `${appName} backend offline — run pnpm run dev from this example package.`;
}
