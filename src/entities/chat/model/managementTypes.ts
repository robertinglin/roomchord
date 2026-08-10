import type { RoomRoleAccess } from "@entities/chat/model/types";
import type { MatterhornRoleRule } from "matterhorn-sdk/browser";

export type ManagementTab = "overview" | "channels" | "voice" | "roles" | "members" | "bots" | "admin" | "community" | "integrations" | "audio";
export type RoleInput = { roleId: string; name: string; description?: string; color?: string; rules?: MatterhornRoleRule[] };
export type RoleUpdateInput = { name?: string; description?: string; color?: string; rules?: MatterhornRoleRule[] };
export type InviteInput = { name?: string; roleId: string; maxUses?: number | null; expiresAt?: number | null };
export type RoomSettings = { name?: string; group?: string | null; allowsVideo?: boolean; locked?: boolean; roleAccess?: RoomRoleAccess };

export const MANAGEMENT_TABS: Array<{ id: ManagementTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "channels", label: "Channels" },
  { id: "voice", label: "Voice channels" },
  { id: "roles", label: "Roles" },
  { id: "members", label: "Members" },
  { id: "bots", label: "Bots" },
  { id: "admin", label: "Admin" },
  { id: "community", label: "Community" },
  { id: "integrations", label: "Integrations" },
  { id: "audio", label: "Voice & audio" }
];
