import type { RoomRoleAccess } from "@entities/chat/model/types";

export type ManagementTab = "overview" | "channels" | "voice" | "roles" | "members" | "admin" | "audio";
export type RoleInput = { roleId: string; name: string; description?: string; color?: string };
export type RoleUpdateInput = { name?: string; description?: string; color?: string };
export type RoomSettings = { name?: string; group?: string | null; allowsVideo?: boolean; locked?: boolean; roleAccess?: RoomRoleAccess };

export const MANAGEMENT_TABS: Array<{ id: ManagementTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "channels", label: "Channels" },
  { id: "voice", label: "Voice channels" },
  { id: "roles", label: "Roles" },
  { id: "members", label: "Members" },
  { id: "admin", label: "Admin" },
  { id: "audio", label: "Voice & audio" }
];
