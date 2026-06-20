import React, { useEffect, useRef } from "react";
import { createMatterhornEmojiPicker, type MatterhornEmojiPicker } from "matterhorn-sdk/browser/emojiPicker";
import type { MatterhornEmoji } from "matterhorn-sdk/browser/emojiData";

export function InlineEmojiPicker({ ariaLabel, searchPlaceholder, onSelect }: { ariaLabel: string; searchPlaceholder: string; onSelect: (emoji: string) => void }) {
  const targetRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<MatterhornEmojiPicker>();
  const selectRef = useRef(onSelect);

  useEffect(() => {
    selectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return undefined;
    pickerRef.current = createMatterhornEmojiPicker({
      target,
      ariaLabel,
      searchPlaceholder,
      onSelect(emoji: MatterhornEmoji) {
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
