/**
 * Barrel for the Mosh design system — one component per file under this
 * folder. Import atoms/sections from here:
 *   import { Button, ChatMessage, AppShell } from "@shared/ui/design";
 *
 * Primitives
 */
export { Glyph } from "./Glyph";
export * from "./icons";

// Status & identity
export { StatusDot } from "./StatusDot";
export type { DotTone } from "./StatusDot";
export { ConnPill } from "./ConnPill";
export { Wordmark } from "./Wordmark";
export { Avatar } from "./Avatar";
export type { PresenceStatus, AvatarSize } from "./Avatar";
export { Badge } from "./Badge";

// Sidebar atoms
export { SidebarHead } from "./SidebarHead";
export { SearchInput } from "./SearchInput";
export { GroupHeading } from "./GroupHeading";
export { ChannelRow } from "./ChannelRow";
export { VoiceMember } from "./VoiceMember";
export { VoiceMembers } from "./VoiceMembers";
export { DirectMessageRow } from "./DirectMessageRow";
export { UserFoot } from "./UserFoot";

// Generic controls
export { Button } from "./Button";
export type {
  ButtonSize,
  ButtonTone,
  ButtonVariant,
  ButtonShape,
  VoiceState,
} from "./Button";

// Message atoms
export { Mention } from "./Mention";
export { RoleTag } from "./RoleTag";
export { Reaction } from "./Reaction";
export { Reactions } from "./Reactions";
export { DaySeparator } from "./DaySeparator";
export { NewSeparator } from "./NewSeparator";
export { EmbedCard } from "./EmbedCard";
export { CodeBlock, codeTokens } from "./CodeBlock";
export { ChatMessage, MessageBody, InlineCode } from "./ChatMessage";
export { TypingIndicator } from "./TypingIndicator";

// Chat column atoms
export { Composer } from "./Composer";
export { ConnBanner } from "./ConnBanner";
export { ChatHeader } from "./ChatHeader";
export { EmptyState } from "./EmptyState";
export { VoiceTile } from "./VoiceTile";
export { VoiceStage } from "./VoiceStage";
export { StateCard } from "./StateCard";
export { LoadingStage } from "./LoadingStage";

// Member rail atoms
export { RailMember } from "./RailMember";
export { RailGroup } from "./RailGroup";

// Composed sections
export { Sidebar } from "./Sidebar";
export { ChannelGroup } from "./ChannelGroup";
export { ChatColumn } from "./ChatColumn";
export { MemberRail } from "./MemberRail";
export { AppShell } from "./AppShell";
