import type { CallMediaSettings } from "matterhorn-sdk/browser/types";
import { mediaWithVoicePreferences } from "@entities/chat/model/localVoicePreferences";
import { canEditRoom } from "@entities/chat/model/roles";
import type { MediaRoom } from "@entities/chat/model/types";
import type { ChatActionHandlersInput } from "@entities/chat/model/actions/types";

export function mediaActions(input: ChatActionHandlersInput) {
  const { media, ui, view } = input;

  function startMediaRoom(room: MediaRoom, mediaSettings?: CallMediaSettings) {
    if (!canEditRoom(room, view.actorRoleIds, view.actorCanManageRooms)) return;
    const audioEnabled = mediaSettings?.audio !== false && !input.localVoicePreferences.muted && !input.localVoicePreferences.deafened;
    const nextMedia = mediaWithVoicePreferences({ audio: audioEnabled, video: Boolean(mediaSettings?.video), screen: Boolean(mediaSettings?.screen) }, input.localVoicePreferences);
    ui.setLocalMediaSettings(nextMedia);
    ui.rememberVoiceJoin(room.id, nextMedia);
    if (!media.joinRoom(room, nextMedia)) ui.setJoinedMediaRoomId(room.id);
  }

  function joinMediaRoom(room: MediaRoom, mediaSettings?: CallMediaSettings) {
    if (!canEditRoom(room, view.actorRoleIds, view.actorCanManageRooms)) return;
    ui.selectMediaRoom(room.id);
    startMediaRoom(room, mediaSettings);
  }

  function selectMediaRoom(room: MediaRoom, mediaSettings?: CallMediaSettings) {
    if (!canEditRoom(room, view.actorRoleIds, view.actorCanManageRooms)) return;
    ui.selectMediaRoom(room.id);
    if (view.joinedRoomId === room.id) return;
    startMediaRoom(room, mediaSettings);
  }

  function updateMediaRoom(room: MediaRoom, mediaSettings: CallMediaSettings) {
    const baseMedia = { audio: mediaSettings.audio !== false, video: Boolean(mediaSettings.video), screen: Boolean(mediaSettings.screen) };
    const nextMedia = mediaSettings.voice ? { ...baseMedia, voice: mediaSettings.voice } : mediaWithVoicePreferences(baseMedia, input.localVoicePreferences);
    ui.setSelectedMediaRoomId(room.id);
    ui.setLocalMediaSettings(nextMedia);
    ui.rememberVoiceJoin(room.id, nextMedia);
    if (!media.updateRoomMedia(room, nextMedia)) ui.setJoinedMediaRoomId(room.id);
  }

  async function leaveMediaRoom(roomId: string) {
    if (input.joinedMediaRoomId === roomId) ui.setJoinedMediaRoomId(undefined);
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
    joinMediaRoom(room, mediaWithVoicePreferences(mediaSettings, input.localVoicePreferences));
  }

  return {
    joinMediaRoom,
    leaveMediaRoom,
    reconnectVoiceRoom,
    selectMediaRoom,
    updateMediaRoom
  };
}
