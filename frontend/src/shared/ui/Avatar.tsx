import React from "react";

type Props = {
  avatar?: string;
  className?: string;
  name: string;
  small?: boolean;
};

function initialFor(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "M";
}

function isImageAvatar(value: string) {
  return /^(?:https?:\/\/|data:image\/|blob:|\/)/i.test(value);
}

export function displayAvatarValue(name: string, avatar?: string) {
  return avatar?.trim() || initialFor(name);
}

export function Avatar({ avatar, className, name, small }: Props) {
  const value = displayAvatarValue(name, avatar);
  const classes = ["member-avatar", small ? "small" : "", className || ""].filter(Boolean).join(" ");
  if (isImageAvatar(value)) {
    return (
      <span className={classes} aria-label={`${name} avatar`} role="img">
        <img alt="" src={value} />
      </span>
    );
  }
  return (
    <span className={classes} aria-label={`${name} avatar`} role="img">
      {value}
    </span>
  );
}
