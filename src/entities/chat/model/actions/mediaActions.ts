import type { CallMediaSettings } from "matterhorn-sdk/browser/types";
import { directCallMatchesThread } from "@entities/chat/model/directCallThreads";
import { mediaWithVoicePreferences } from "@entities/chat/model/localVoicePreferences";
import { canEditRoom } from "@entities/chat/model/roles";
import type { MediaRoom } from "@entities/chat/model/types";
import type { ChatActionHandlersInput } from "@entities/chat/model/actions/types";

export function mediaActions(input: ChatActionHandlersInput) {
  const { directCalls, media, ui, view } = input;

  function startMediaRoom(room: MediaRoom, mediaSettings?: CallMediaSettings) {
    if (!canEditRoom(room, view.actorRoleIds, view.actorCanManageRooms)) return;
    const audioEnabled = mediaSettings?.audio !== false && !input.localVoicePreferences.muted && !input.localVoicePreferences.deafened;
    const nextMedia = mediaWithVoicePreferences({ audio: audioEnabled, video: Boolean(mediaSettings?.video), screen: Boolean(mediaSettings?.screen) }, input.localVoicePreferences);
    ui.setLocalMediaSettings(nextMedia);
    ui.rememberVoiceJoin(room.id, nextMedia);
    if (!media.joinRoom(room, nextMedia)) ui.setJoinedMediaRoomId(room.id);
  }

  function directCallIsActive() {
    const direct = directCalls.state;
    return Boolean(direct.directRoomId && direct.status !== "idle" && direct.status !== "incoming");
  }

  function holdDirectCallIfActive() {
    const direct = directCalls.state;
    if (!direct.directRoomId || !directCallIsActive() || input.heldDirectCallRoomId === direct.directRoomId) return;
    directCalls.updateMedia({ audio: false, video: false, screen: false });
    ui.holdDirectCall(direct.directRoomId);
  }

  function unheldLocalMedia(mediaSettings?: CallMediaSettings) {
    const audioEnabled = mediaSettings?.audio !== false && !input.localVoicePreferences.muted && !input.localVoicePreferences.deafened;
    return mediaWithVoicePreferences(
      { audio: audioEnabled, video: Boolean(mediaSettings?.video), screen: Boolean(mediaSettings?.screen) },
      input.localVoicePreferences
    );
  }

  async function prepareDirectCallSwitch(targetRoom: MediaRoom) {
    const direct = directCalls.state;
    if (!direct.directRoomId || !directCallIsActive() || input.heldDirectCallRoomId === direct.directRoomId) return true;
    const decision = await input.requestCallSwitch?.({
      currentLabel: direct.remoteName || "Direct call",
      targetLabel: targetRoom.name
    });
    if (decision === "cancel") return false;
    if (decision === "hold") {
      directCalls.updateMedia({ audio: false, video: false, screen: false });
      ui.holdDirectCall(direct.directRoomId);
      return true;
    }
    if (decision === "end" || !decision) {
      directCalls.endCall();
      return true;
    }
    return true;
  }

  function holdCurrentMediaRoomIfActive() {
    if (!view.joinedRoomId) return;
    const room = view.visibleRooms.find((item) => item.id === view.joinedRoomId);
    if (!room || input.heldMediaRoomIds[room.id]) return;
    media.updateRoomMedia(room, { audio: false, video: false, screen: false });
    ui.holdMediaRoom(room.id);
  }

  function startDirectCall(memberId: string) {
    holdCurrentMediaRoomIfActive();
    directCalls.callMember(memberId, "voice");
  }

  async function joinMediaRoom(room: MediaRoom, mediaSettings?: CallMediaSettings) {
    if (!canEditRoom(room, view.actorRoleIds, view.actorCanManageRooms)) return;
    if (!await prepareDirectCallSwitch(room)) return;
    ui.selectMediaRoom(room.id);
    startMediaRoom(room, mediaSettings);
  }

  async function selectMediaRoom(room: MediaRoom, mediaSettings?: CallMediaSettings) {
    if (!canEditRoom(room, view.actorRoleIds, view.actorCanManageRooms)) return;
    if (view.joinedRoomId === room.id) {
      holdDirectCallIfActive();
      ui.clearMediaRoomHold(room.id);
      ui.selectMediaRoom(room.id);
      const nextMedia = unheldLocalMedia(mediaSettings || input.localMediaSettings || input.recentVoiceJoin?.media);
      ui.setLocalMediaSettings(nextMedia);
      ui.rememberVoiceJoin(room.id, nextMedia);
      if (!media.updateRoomMedia(room, nextMedia)) ui.setJoinedMediaRoomId(room.id);
      return;
    }
    if (!await prepareDirectCallSwitch(room)) return;
    ui.selectMediaRoom(room.id);
    startMediaRoom(room, mediaSettings);
  }

  async function updateMediaRoom(room: MediaRoom, mediaSettings: CallMediaSettings) {
    if (view.joinedRoomId === room.id) {
      holdDirectCallIfActive();
    } else if (!await prepareDirectCallSwitch(room)) {
      return;
    }
    const baseMedia = { audio: mediaSettings.audio !== false, video: Boolean(mediaSettings.video), screen: Boolean(mediaSettings.screen) };
    const nextMedia = mediaSettings.voice ? { ...baseMedia, voice: mediaSettings.voice } : mediaWithVoicePreferences(baseMedia, input.localVoicePreferences);
    ui.clearMediaRoomHold(room.id);
    ui.setSelectedMediaRoomId(room.id);
    ui.setLocalMediaSettings(nextMedia);
    ui.rememberVoiceJoin(room.id, nextMedia);
    if (!media.updateRoomMedia(room, nextMedia)) ui.setJoinedMediaRoomId(room.id);
  }

  async function leaveMediaRoom(roomId: string) {
    if (input.joinedMediaRoomId === roomId) ui.setJoinedMediaRoomId(undefined);
    ui.clearMediaRoomHold(roomId);
    ui.clearVoiceJoin();
    ui.setActiveView("channel");
    ui.setSidebarOpen(true);
    ui.setSelectedMediaRoomId(undefined);
    media.leaveRoom();
  }

  function reconnectVoiceRoom(room: MediaRoom) {
    const mediaSettings = {
      audio: !input.localVoicePreferences.muted && !input.localVoicePreferences.deafened,
      video: Boolean(input.recentVoiceJoin?.media.video),
      screen: Boolean(input.recentVoiceJoin?.media.screen)
    };
    void joinMediaRoom(room, mediaWithVoicePreferences(mediaSettings, input.localVoicePreferences));
  }

  function resumeDirectCallThread(threadId: string) {
    const direct = directCalls.state;
    if (!direct.directRoomId || !directCallIsActive()) {
      ui.selectDirectThread(threadId);
      return;
    }
    const thread = view.threads.find((item) => item.id === threadId);
    if (!thread || !directCallMatchesThread(thread, input.live.actor.memberId, directCalls.memberIds)) {
      ui.selectDirectThread(threadId);
      return;
    }
    if (view.joinedRoomId) {
      const room = view.visibleRooms.find((item) => item.id === view.joinedRoomId);
      if (room) {
        media.updateRoomMedia(room, { audio: false, video: false, screen: false });
        ui.holdMediaRoom(room.id);
      }
    }
    ui.clearDirectCallHold(direct.directRoomId);
    ui.selectDirectThread(threadId);
    directCalls.updateMedia({
      audio: !input.localVoicePreferences.muted && !input.localVoicePreferences.deafened,
      video: Boolean(direct.media?.video),
      screen: Boolean(direct.media?.screen)
    });
  }

  return {
    joinMediaRoom,
    leaveMediaRoom,
    reconnectVoiceRoom,
    resumeDirectCallThread,
    selectMediaRoom,
    startDirectCall,
    updateMediaRoom
  };
}
