import React, { useEffect, useRef } from "react";
import { createRoomkitEmojiPicker, type RoomkitEmojiPicker } from "matterhorn-sdk/browser/emojiPicker";
import type { RoomkitEmoji } from "matterhorn-sdk/browser/emojiData";

export function InlineEmojiPicker({ ariaLabel, searchPlaceholder, onSelect }: { ariaLabel: string; searchPlaceholder: string; onSelect: (emoji: string) => void }) {
  const targetRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<RoomkitEmojiPicker>();
  const selectRef = useRef(onSelect);

  useEffect(() => {
    selectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return undefined;
    pickerRef.current = createRoomkitEmojiPicker({
      target,
      ariaLabel,
      searchPlaceholder,
      onSelect(emoji: RoomkitEmoji) {
        selectRef.current(emoji.emoji);
      }
    });
    pickerRef.current.focus();
    return () => {
      pickerRef.current?.destroy();
      pickerRef.current = undefined;
    };
  }, []);

  return <div className="message-reaction-picker" ref={targetRef} />;
}
