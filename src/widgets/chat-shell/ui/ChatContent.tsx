import React, { useEffect, useRef, useState } from "react";
import { channelReadTopic, directThreadReadTopic } from "matterhorn-sdk/browser";
import type { DirectCallState } from "matterhorn-sdk/browser/types";
import { avatarForActor, canDeleteMessage, isMessageAuthor } from "@entities/chat/model/chatViewModel";
import { directCallCanRenderRoom, directCallMatchesThread } from "@entities/chat/model/directCallThreads";
import { useChatRuntime } from "@entities/chat/model/chatRuntime";
import { useChatUiActions, useChatUiStore } from "@entities/chat/model/chatUiStore";
import { MessageFeed, type MessageForwardStatus } from "@features/messages/ui/MessageFeed";
import { VoiceRoomView } from "@features/voice-room/ui/VoiceRoomView";
import type { MediaRoom, RoomId, ScreenShare, ThreadId } from "@entities/chat/model/types";
import { useIsMobile } from "@shared/ui/useIsMobile";
import { useAttachments } from "@features/attachments/model/useAttachments";
import { MATTERHORN_DRIVE_READY, MATTERHORN_REFERENCE_VALIDATION_READY } from "@shared/model/matterhornFeatureGates";
import { useRoomHistory } from "@features/messages/model/useRoomHistory";
import { usePersonalUnread } from "@entities/chat/model/usePersonalUnread";
import { CustomMediaManager } from "@features/custom-media/ui/CustomMediaManager";
import { NotificationPreferences } from "@features/notifications/ui/NotificationPreferences";
import { projectCustomMediaRecords } from "@shared/model/customMediaMessage";
import type { CustomMediaMessageItem } from "@shared/model/customMediaMessage";
import type { MatterhornCustomMediaMessageReference } from "matterhorn-sdk/browser";
import { bookmarkInput, reminderInput } from "@features/personal-productivity/model/usePersonalProductivity";
import type { Mosh } from "../../../../types";
import { activeForumTags } from "@entities/community/model/forum";

function activeScreenShareForRoom(screenShares: ScreenShare[], roomId?: string) {
  if (!roomId) return undefined;
  return screenShares.find((share) => !share.stoppedAt && (share.roomId === roomId || share.scopeId === roomId));
}

function directCallRoom(call: DirectCallState, title: string): MediaRoom | undefined {
  if (!call.directRoomId) return undefined;
  return {
    archivedAt: null,
    group: null,
    id: call.directRoomId as RoomId,
    name: title,
    allowsVideo: true,
    locked: false,
    participantCount: call.room?.remoteStreams.length || 0,
    participants: {},
    roleAccess: {},
  };
}

export function ChatContent() {
  const { actions, directCalls, live, media, mediaDevices, productivity, roomName, view } = useChatRuntime();
  const ui = useChatUiActions();
  const composerFocusKey = useChatUiStore((value) => value.composerFocusKey);
  const heldDirectCallRoomId = useChatUiStore((value) => value.heldDirectCallRoomId);
  const heldMediaRoomIds = useChatUiStore((value) => value.heldMediaRoomIds);
  const localMediaSettings = useChatUiStore((value) => value.localMediaSettings);
  const mutedVoiceParticipantIds = useChatUiStore((value) => value.mutedVoiceParticipantIds);
  const pendingComposerText = useChatUiStore((value) => value.pendingComposerText);
  const [forwardStatus, setForwardStatus] = useState<MessageForwardStatus>();
  const [pendingCustomMediaRefs, setPendingCustomMediaRefs] = useState<MatterhornCustomMediaMessageReference[]>([]);
  const [customMediaRecords, setCustomMediaRecords] = useState<CustomMediaMessageItem[]>([]);
  const [forumChannel, setForumChannel] = useState<Mosh.ChannelKind | undefined>();
  const isMobile = useIsMobile();
  const history = useRoomHistory(live, view.showingDm ? view.currentThreadId : view.currentChannelId, view.showingDm ? "direct.thread" : "channel");
  const unreadTopic = view.showingDm && view.currentThreadId
    ? directThreadReadTopic(view.currentThreadId)
    : view.currentChannelId
      ? channelReadTopic(view.currentChannelId)
      : undefined;
  const personalUnread = usePersonalUnread(live, unreadTopic);
  useEffect(() => {
    let cancelled = false;
    const channelId = view.currentChannelId;
    if (view.showingDm || !channelId) {
      setForumChannel(undefined);
      return () => { cancelled = true; };
    }
    const queries = live.queries as unknown as {
      channelForId?: (input: { channelId: string }) => Promise<Mosh.ChannelKind | null>;
      channelsForScope?: (input: { scopeType: string; scopeId: string }) => Promise<Mosh.ChannelKind[]>;
    };
    void (async () => {
      try {
        const direct = await queries.channelForId?.({ channelId });
        if (direct) {
          if (!cancelled) setForumChannel(direct);
          return;
        }
        const scoped = await queries.channelsForScope?.({ scopeType: "room", scopeId: roomName });
        const match = scoped?.find((channel) => String(channel.id) === channelId || channel.scopeId === channelId || channel.name === view.activeChannel?.name);
        if (!cancelled) setForumChannel(match);
      } catch {
        if (!cancelled) setForumChannel(undefined);
      }
    })();
    return () => { cancelled = true; };
  }, [live, roomName, view.activeChannel?.name, view.currentChannelId, view.showingDm]);
  const latestVisibleMessageId = view.feedMessages[view.feedMessages.length - 1]?.id;
  const justMarkedUnread = useRef<{ messageId: string; feedMessageId: string; topic?: string } | undefined>(undefined);
  useEffect(() => {
    if (!latestVisibleMessageId || !personalUnread.marker) return;
    if (justMarkedUnread.current?.messageId === personalUnread.marker.messageId
      && justMarkedUnread.current.feedMessageId === latestVisibleMessageId
      && justMarkedUnread.current.topic === unreadTopic) {
      return;
    }
    justMarkedUnread.current = undefined;
    personalUnread.clear();
  }, [latestVisibleMessageId, personalUnread.clear, personalUnread.marker, unreadTopic]);
  const directCall = directCalls.state;
  const attachments = useAttachments(live, {
    channelId: view.currentChannelId,
    committedDm: !view.showingDm || Boolean(view.currentThreadId && (live.state.directThreads?.[view.currentThreadId as ThreadId] || view.activeThread?.id === view.currentThreadId)),
    showingDm: view.showingDm,
    threadId: view.currentThreadId,
    roomName
  });
  const customMediaScope = attachments.scope;
  useEffect(() => {
    setPendingCustomMediaRefs([]);
    let cancelled = false;
    if (!customMediaScope) {
      setCustomMediaRecords([]);
      return () => { cancelled = true; };
    }
    void live.customMedia.forScope(customMediaScope).then((records) => {
      if (!cancelled) setCustomMediaRecords(projectCustomMediaRecords(records, live.customMedia.safeRenderMetadata));
    }).catch(() => {
      if (!cancelled) setCustomMediaRecords([]);
    });
    return () => { cancelled = true; };
  }, [live.customMedia, customMediaScope?.scopeId, customMediaScope?.scopeType]);
  const directRoom = directCallRoom(directCall, view.showingDm ? view.feedTitle : directCall.remoteName || "Direct call");
  const showingActiveDirectCall = Boolean(
    directRoom
    && view.activeThread
    && directCallCanRenderRoom(directCall.status)
    && directCallMatchesThread(view.activeThread, live.actor.memberId, directCalls.memberIds)
  );

  if (showingActiveDirectCall && directRoom) {
    const activeDirectRoom = directRoom;
    const directHeld = heldDirectCallRoomId === activeDirectRoom.id;
    const directVoicePreferences = directHeld
      ? { ...view.effectiveVoicePreferences, muted: true, deafened: true }
      : view.effectiveVoicePreferences;
    const directMedia = directCall.media || localMediaSettings;
    const videoOn = Boolean(directMedia.video);
    const audioOn = !view.effectiveVoicePreferences.muted && !view.effectiveVoicePreferences.deafened;
    const screenOn = Boolean(directMedia.screen);

    function resumeDirectCall() {
      if (view.activeThread) {
        actions.resumeDirectCallThread(view.activeThread.id);
        return;
      }
      ui.clearDirectCallHold(activeDirectRoom.id);
      directCalls.updateMedia({ audio: audioOn, video: videoOn, screen: screenOn });
    }

    function toggleScreenShare() {
      ui.clearDirectCallHold(activeDirectRoom.id);
      directCalls.updateMedia({ audio: audioOn, video: videoOn, screen: !screenOn });
    }

    function toggleVideo() {
      ui.clearDirectCallHold(activeDirectRoom.id);
      directCalls.updateMedia({ audio: audioOn, video: !videoOn, screen: screenOn });
    }

    return (
      <VoiceRoomView
        actorId={directCalls.clientId}
        actorName={view.actorName}
        actorAvatar={avatarForActor(live.actor)}
        joinedRoomId={activeDirectRoom.id}
        localMedia={directMedia}
        mediaDeviceController={mediaDevices}
        room={activeDirectRoom}
        sfu={directCall.room || { status: directCall.status === "idle" ? "idle" : "connecting", mediaRoomId: activeDirectRoom.id, remoteStreams: [] }}
        voicePreferences={directVoicePreferences}
        voiceTokens={[]}
        mutedVoiceParticipantIds={mutedVoiceParticipantIds}
        showSidebarMenu={true}
        onOpenMenu={() => ui.setSidebarOpen(true)}
        onLeaveVoiceRoom={directCalls.endCall}
        onResumeVoiceRoom={directHeld ? resumeDirectCall : undefined}
        onToggleVoiceScreenShare={toggleScreenShare}
        voiceControlShowScreenShare={!isMobile}
        onToggleVoiceVideo={toggleVideo}
        voiceControlCanUseVideo={true}
        voiceControlCanSwapCamera={false}
        voiceControlHoldActive={directHeld}
        voiceControlSfuActive={directCall.status === "connecting" || directCall.status === "connected"}
        voiceControlSfuStatus={directCall.status}
        voiceControlShareActive={screenOn}
        voiceControlVideoOn={videoOn}
        voiceControlError={directCalls.error}
        onDirectMessage={view.actorCanDirectMessage ? actions.openDirectThreadForMember : undefined}
        onStopWatchingScreenShare={directCalls.stopWatchingScreenShare}
        onToggleVoiceParticipantMute={ui.toggleVoiceParticipantMute}
        onWatchScreenShare={directCalls.watchScreenShare}
      />
    );
  }

  if (view.showingMediaRoom && view.selectedMediaRoom) {
    const room = view.selectedMediaRoom;
    const voiceTextChannel = view.channels.find((channel) => channel.kind === "voice-text" && channel.mediaRoomId === room.id);
    const roomHeld = Boolean(heldMediaRoomIds[room.id]);
    const roomVoicePreferences = roomHeld
      ? { ...view.effectiveVoicePreferences, muted: true, deafened: true }
      : view.effectiveVoicePreferences;
    const joined = view.joinedRoomId === room.id;
    const roomSfuActive = media.sfu.mediaRoomId === room.id;
    const sfuActive = roomSfuActive && (media.sfu.status === "connected" || media.sfu.status === "connecting");
    const activeMedia = sfuActive ? media.sfu.media : localMediaSettings;
    const videoOn = Boolean(activeMedia?.video);
    const audioOn = !view.effectiveVoicePreferences.muted && !view.effectiveVoicePreferences.deafened;
    const screenOn = Boolean(activeMedia?.screen);
    const share = activeScreenShareForRoom(view.activeScreenShares, room.id);
    const shareActive = screenOn || Boolean(share);

    function toggleScreenShare() {
      if (!joined) return;
      ui.clearMediaRoomHold(room.id);
      if (!screenOn && share) {
        void actions.stopScreenShare(share.id);
        return;
      }
      void media.updateRoomMedia(room, { audio: audioOn, video: videoOn, screen: !screenOn });
    }

    function toggleVideo() {
      if (!joined) return;
      ui.clearMediaRoomHold(room.id);
      void media.updateRoomMedia(room, { audio: audioOn, video: !videoOn, screen: screenOn });
    }

    function resumeMediaRoom() {
      void actions.updateMediaRoom(room, { audio: audioOn, video: videoOn, screen: screenOn });
    }

    return (
      <VoiceRoomView
        actorId={live.actor.memberId}
        actorName={view.actorName}
        actorAvatar={avatarForActor(live.actor)}
        joinedRoomId={view.joinedRoomId}
        localMedia={localMediaSettings}
        mediaDeviceController={mediaDevices}
        room={view.selectedMediaRoom}
        sfu={media.sfu}
        voicePreferences={roomVoicePreferences}
        voiceTokens={media.voiceTokens}
        mutedVoiceParticipantIds={mutedVoiceParticipantIds}
        showSidebarMenu={true}
        onOpenMenu={() => ui.setSidebarOpen(true)}
        onLeaveVoiceRoom={() => actions.leaveMediaRoom(room.id)}
        onResumeVoiceRoom={roomHeld ? resumeMediaRoom : undefined}
        onToggleVoiceCameraSwap={media.canSwapCamera ? () => media.toggleCameraFacing() : undefined}
        onToggleVoiceScreenShare={toggleScreenShare}
        voiceControlShowScreenShare={!isMobile}
        onToggleVoiceVideo={toggleVideo}
        voiceControlCanUseVideo={joined && room.allowsVideo !== false}
        voiceControlCanSwapCamera={media.canSwapCamera}
        voiceControlHoldActive={roomHeld}
        voiceControlSfuActive={sfuActive}
        voiceControlSfuStatus={media.sfu.status}
        voiceControlShareActive={shareActive}
        voiceControlVideoOn={videoOn}
        voiceControlError={media.error}
        onDirectMessage={view.actorCanDirectMessage ? actions.openDirectThreadForMember : undefined}
        voiceTextChannel={voiceTextChannel ? { id: voiceTextChannel.id, name: voiceTextChannel.name } : null}
        onOpenVoiceText={(channelId) => ui.selectChannel(channelId)}
        voiceModeration={actions.voiceModeration}
        onStopWatchingScreenShare={media.stopWatchingScreenShare}
        onWatchScreenShare={media.watchScreenShare}
      />
    );
  }

  const customMediaControl = !MATTERHORN_REFERENCE_VALIDATION_READY ? (
    <span role="status">Custom media message insertion is waiting for Matterhorn&apos;s accepted-operation reference validator.</span>
  ) : customMediaScope ? (
    <CustomMediaManager
      client={live.customMedia}
      scopeType={customMediaScope.scopeType}
      scopeId={customMediaScope.scopeId}
      drivePickerAdapter={MATTERHORN_DRIVE_READY ? attachments.drivePickerAdapter : undefined}
      onSelectReference={MATTERHORN_REFERENCE_VALIDATION_READY ? (reference) => {
        setPendingCustomMediaRefs((current) => current.some((item) => item.mediaId === reference.mediaId) ? current : [...current, reference]);
      } : undefined}
      onRecordsChanged={(records) => setCustomMediaRecords(projectCustomMediaRecords(records, live.customMedia.safeRenderMetadata))}
    />
  ) : null;

  async function attachmentIdsForSend() {
    if (attachments.pendingAttachmentCount === 0) return [];
    const published = await attachments.publishPendingAttachments();
    if (published.length === 0) return undefined;
    return attachments.consumePendingAttachmentIds();
  }

  return (
    <div style={{ position: "relative", display: "grid", minWidth: 0, minHeight: 0, overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 12, right: 24, zIndex: 4, display: "flex", gap: 8, alignItems: "flex-start" }}>
        <NotificationPreferences
          scope={{
            roomId: live.envelope?.room?.id || roomName,
            scopeType: view.showingDm ? "direct.thread" : "channel",
            scopeId: view.showingDm ? (view.currentThreadId || "") : (view.currentChannelId || "")
          }}
        />
      </div>
      <MessageFeed
      title={view.feedTitle}
      subtitle={view.feedSubtitle}
      messages={view.feedMessages}
      commentThreads={view.showingDm ? [] : view.threadsForChannel}
      comments={view.showingDm ? [] : Object.values(live.state.comments || {}).filter((comment) => comment.scopeType === "channel" && comment.scopeId === view.currentChannelId)}
      attachmentRecords={attachments.attachments}
      attachmentTransfer={attachments.transfer}
      fileRecords={attachments.files}
      memberNamesById={view.memberNamesById}
      memberKindsById={Object.fromEntries(Object.entries(live.state.members || {}).map(([memberId, member]) => [memberId, member.kind]))}
      memberAvatarsById={view.memberAvatarsById}
      forwardTargets={view.forwardTargets}
      focusKey={composerFocusKey > 0 ? composerFocusKey : undefined}
      pendingComposerText={pendingComposerText}
      currentUserId={live.actor.memberId}
      mode={view.showingDm ? "dm" : "channel"}
      channelKind={view.showingDm ? undefined : forumChannel?.kind || view.activeChannel?.kind}
      forumLayout={forumChannel?.forumLayout}
      forumTags={forumChannel?.forumTags ? activeForumTags(forumChannel.forumTags) : []}
      onForumLayoutChange={forumChannel && live.can("channelForumLayout") ? (layout) => { void actions.setForumLayout(String(forumChannel.id), layout as "list" | "gallery"); } : undefined}
      onCreateForumTag={forumChannel && live.can("channelForumTagCreate") ? (name, color) => { void actions.createForumTag(String(forumChannel.id), name, color); } : undefined}
      onUpdateForumTag={forumChannel && live.can("channelForumTagUpdate") ? (tagId, name, color) => { void actions.updateForumTag(String(forumChannel.id), tagId, name, color); } : undefined}
      onArchiveForumTag={forumChannel && live.can("channelForumTagArchive") ? (tagId) => { void actions.archiveForumTag(String(forumChannel.id), tagId); } : undefined}
      feedKey={view.showingDm ? `direct.thread:${view.currentThreadId || ""}` : `channel:${view.currentChannelId || ""}`}
      disabled={view.actorChatDisabled || (view.showingDm
        ? !view.actorCanDirectMessage || !view.currentThreadId
        : !view.actorCanSendMessages || !view.currentChannelId)}
      onSend={async (body, customMediaRefs, tagIds) => {
        const attachmentIds = await attachmentIdsForSend();
        if (!attachmentIds) return;
        setPendingCustomMediaRefs([]);
        if (view.showingDm) await actions.sendDirectMessage(body, attachmentIds, customMediaRefs);
        else if (tagIds?.length) await actions.sendChannelMessage(body, attachmentIds, customMediaRefs, tagIds);
        else await actions.sendChannelMessage(body, attachmentIds, customMediaRefs);
        attachments.clearPendingAttachments();
      }}
      onDownloadFile={attachments.downloadFile}
      onPreviewFile={attachments.previewFile}
      onOpenAttachment={attachments.openAttachment}
      onShareDrive={MATTERHORN_DRIVE_READY && live.driveManagement && attachments.scope ? attachments.shareToGoogleDrive : undefined}
      onUploadFile={attachments.scope ? attachments.uploadFile : undefined}
      advancedPicker={MATTERHORN_DRIVE_READY && !view.showingDm && attachments.scope ? attachments.advancedPicker : undefined}
      attachmentUnavailableReason={view.showingDm && !attachments.scope
        ? "DM attachments require an authorized Matterhorn thread scope."
        : undefined}
      canSendWithoutText={attachments.pendingAttachmentCount > 0 && attachments.transfer.phase === "idle"}
      pendingAttachments={attachments.pendingAttachments}
      onRemovePendingAttachment={attachments.removePendingAttachment}
      customMediaRecords={customMediaRecords}
      customMediaRefs={MATTERHORN_REFERENCE_VALIDATION_READY ? pendingCustomMediaRefs : []}
      customMedia={customMediaControl}
      history={history}
      bookmarks={productivity.bookmarks}
      reminders={productivity.reminders}
      onAddBookmark={(message) => {
        const scopeId = view.showingDm ? view.currentThreadId : ("channelId" in message ? message.channelId : undefined) || view.currentChannelId;
        if (!scopeId) return;
        void productivity.addBookmark(bookmarkInput({
          roomName,
          scopeType: view.showingDm ? "direct.thread" : "channel",
          scopeId,
          messageId: String(message.id)
        }));
      }}
      onRemoveBookmark={(bookmarkId) => { void productivity.removeBookmark(bookmarkId); }}
      onAddReminder={(message) => {
        const scopeId = view.showingDm ? view.currentThreadId : ("channelId" in message ? message.channelId : undefined) || view.currentChannelId;
        if (!scopeId) return;
        void productivity.scheduleReminder(reminderInput({
          roomName,
          scopeType: view.showingDm ? "direct.thread" : "channel",
          scopeId,
          messageId: String(message.id)
        }));
      }}
      onRemoveReminder={(reminderId) => { void productivity.removeReminder(reminderId); }}
      personalUnreadMarker={personalUnread.marker}
      onMarkUnread={(message) => {
        justMarkedUnread.current = { messageId: String(message.id), feedMessageId: String(latestVisibleMessageId || ""), topic: unreadTopic };
        personalUnread.mark(String(message.id), Number(message.createdAt || Date.now()), view.feedTitle);
      }}
      onClearUnread={personalUnread.clear}
      onReply={!view.showingDm || live.can("directMessageReply") ? async (messageId, body, customMediaRefs, tagIds) => {
        const attachmentIds = await attachmentIdsForSend();
        if (!attachmentIds) return;
        if (tagIds?.length) await actions.replyToMessage(messageId, body, attachmentIds, customMediaRefs, tagIds);
        else await actions.replyToMessage(messageId, body, attachmentIds, customMediaRefs);
        attachments.clearPendingAttachments();
      } : undefined}
      onReact={!view.showingDm || live.can("directMessageReact") ? actions.reactToMessage : undefined}
      onForward={(message, target) => {
        if (target.type === "dm" && !live.can("directMessageForward")) return;
        setForwardStatus(undefined);
        void actions.forwardMessage(message, target).then((result) => {
          const nestedForward = result && typeof result === "object" && "forward" in result
            ? result.forward
            : undefined;
          const nestedRejected = nestedForward && typeof nestedForward === "object" && "ok" in nestedForward && nestedForward.ok !== true;
          if (result === true || (result !== false && typeof result === "object" && !nestedRejected)) {
            setForwardStatus({ kind: "success", message: "Message forwarded with encrypted file provenance." });
            return;
          }
          setForwardStatus({
            kind: "error",
            message: typeof result === "string" && result.length > 0
              ? result
              : "Message forwarding was rejected by the authorized host. No copy was sent."
          });
        });
      }}
      forwardStatus={forwardStatus}
      onPin={view.showingDm ? (live.can("directMessagePin") ? actions.pinMessage : undefined) : (live.actor.role === "member" || !live.can("messagePin") ? undefined : actions.pinMessage)}
      onUnpin={view.showingDm ? (live.can("directMessageUnpin") ? actions.unpinMessage : undefined) : (live.actor.role === "member" || !live.can("messagePin") ? undefined : actions.unpinMessage)}
      onDelete={view.showingDm ? (live.can("directMessageDelete") ? actions.deleteMessage : undefined) : actions.deleteMessage}
      onEdit={view.showingDm ? (live.can("directMessageEdit") ? actions.editMessage : undefined) : actions.editMessage}
      onDirectMessage={view.actorCanDirectMessage ? actions.openDirectThreadForMember : undefined}
      onCreateThread={view.showingDm || !view.currentChannelId || !live.can("commentsThreadCreate") ? undefined : async (message) => {
        const title = message.body.trim().slice(0, 72) || "Message thread";
        return actions.createCommentThread("channel", view.currentChannelId!, title, {
          source: { kind: "channel", scopeId: view.currentChannelId!, messageId: message.id }
        });
      }}
      onAddThreadComment={live.can("commentsAdd") ? (threadId, body) => { void actions.addThreadComment(threadId, body); } : undefined}
      onResolveThread={live.can("commentsResolve") ? (threadId, resolved) => { void actions.resolveCommentThread(threadId, resolved); } : undefined}
      onArchiveThread={live.can("commentsThreadArchive") ? (threadId) => { void actions.archiveCommentThread(threadId); } : undefined}
      onReopenThread={live.can("commentsThreadReopen") ? (threadId) => { void actions.reopenCommentThread(threadId); } : undefined}
      onLockThread={live.can("commentsThreadLock") ? (threadId) => { void actions.lockCommentThread(threadId); } : undefined}
      onUnlockThread={live.can("commentsThreadUnlock") ? (threadId) => { void actions.unlockCommentThread(threadId); } : undefined}
      onFollowThread={live.can("commentsThreadFollow") ? (threadId) => { void actions.followCommentThread(threadId); } : undefined}
      onUnfollowThread={live.can("commentsThreadUnfollow") ? (threadId) => { void actions.unfollowCommentThread(threadId); } : undefined}
      onSetThreadNotifications={live.can("commentsThreadNotifications") ? (threadId, enabled) => { void actions.setCommentThreadNotifications(threadId, enabled); } : undefined}
      onAddThreadMember={live.can("commentsThreadMemberAdd") ? (threadId, memberId) => { void actions.addCommentThreadMember(threadId, memberId); } : undefined}
      onRemoveThreadMember={live.can("commentsThreadMemberRemove") ? (threadId, memberId) => { void actions.removeCommentThreadMember(threadId, memberId); } : undefined}
      canDeleteMessage={(message) => view.showingDm
        ? Boolean(message.userIds?.includes(live.actor.memberId))
        : canDeleteMessage(live.actor, message, live.can("messagePin"))}
      canEditMessage={(message) => isMessageAuthor(live.actor, message)}
      />
    </div>
  );
}
