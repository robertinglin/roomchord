import React, { useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { tokens } from "../theme.stylex";
import * as d from "./index";

/**
 * ChatExample — the chat.html reference demo, rebuilt entirely from the
 * per-file design atoms. Mounted as the "Chat Example" tab in the design
 * review. Owns the demo state switcher (Main / Voice / Empty / Loading /
 * Offline) exactly like chat.html.
 */

type ChatView = "main" | "voice" | "empty" | "loading" | "offline";

const switcher = stylex.create({
  bar: {
    position: "fixed",
    top: "8px",
    right: "8px",
    zIndex: 60,
    display: "flex",
    gap: "5px",
    backgroundColor: tokens.surfaceDeep,
    padding: "5px",
    borderRadius: "999px",
    boxShadow: tokens.elevPanel,
    border: `1px solid ${tokens.border}`,
  },
  btn: {
    fontSize: "11px",
    padding: "5px 10px",
    borderRadius: "999px",
    color: tokens.muted,
    fontWeight: 600,
    border: 0,
    background: "transparent",
    cursor: "pointer",
  },
  btnActive: { backgroundColor: tokens.accentSoft, color: tokens.mentionFg },
});

const VOICE_PEOPLE = [
  { name: "Mira", img: 47, speaking: true, muted: false },
  { name: "Dev", img: 12, speaking: false, muted: true },
  { name: "Priya", img: 33, speaking: false, muted: false },
  { name: "Avery", img: 8, speaking: false, muted: false },
  { name: "Lena", img: 23, speaking: false, muted: false },
];

function ExampleSidebar({ view }: { view: ChatView }) {
  const tone: d.DotTone = view === "offline" ? "off" : view === "loading" ? "warn" : "on";
  const label = view === "offline" ? "Reconnecting…" : view === "loading" ? "Joining…" : "Connected · 4 rooms";
  return (
    <d.Sidebar
      appName="Mosh"
      statusLabel={label}
      tone={tone}
      searchPlaceholder="Find or start a conversation"
      groups={
        <>
          <d.ChannelGroup label="General" onAdd={() => {}}>
            <d.ChannelRow icon={<d.HashGlyph size={18} />} name="announcements" />
            <d.ChannelRow icon={<d.HashGlyph size={18} />} name="design" active badge={<d.Badge count={3} />} />
            <d.ChannelRow icon={<d.HashGlyph size={18} />} name="engineering" />
            <d.ChannelRow icon={<d.HashGlyph size={18} />} name="incidents" badge={<d.Badge count={1} />} />
            <d.ChannelRow icon={<d.HashGlyph size={18} />} name="random" />
          </d.ChannelGroup>

          <d.ChannelGroup label="Voice Rooms">
            <d.ChannelRow voice icon={<d.MicGlyph size={18} />} name="Lounge" />
            <d.VoiceMembers>
              <d.VoiceMember avatar="https://i.pravatar.cc/48?img=47" name="Mira" speaking />
              <d.VoiceMember avatar="https://i.pravatar.cc/48?img=12" name="Dev" muted />
              <d.VoiceMember avatar="https://i.pravatar.cc/48?img=33" name="Priya" />
            </d.VoiceMembers>
            <d.ChannelRow voice icon={<d.MicGlyph size={18} />} name="Focus Room" />
            <d.ChannelRow voice icon={<d.MicGlyph size={18} />} name="Pairing" />
          </d.ChannelGroup>

          <d.ChannelGroup label="Direct Messages">
            <d.DirectMessageRow avatar="https://i.pravatar.cc/64?img=47" name="Mira Okafor" preview="ship the new composer?" status="on" />
            <d.DirectMessageRow avatar="https://i.pravatar.cc/64?img=12" name="Dev Lindqvist" preview="left a voice memo" status="idle" />
            <d.DirectMessageRow avatar="https://i.pravatar.cc/64?img=33" name="Priya Raman" preview="in Focus mode" status="dnd" />
            <d.DirectMessageRow avatar="https://i.pravatar.cc/64?img=15" name="Sam Becker" preview="offline" status="off" />
          </d.ChannelGroup>
        </>
      }
      user={<d.UserFoot avatar="https://i.pravatar.cc/64?img=8" name="Avery Chen" sub="#design · Online" />}
    />
  );
}

function ExampleMessages() {
  return (
    <>
      <d.DaySeparator label="Today — June 21" />

      <d.ChatMessage avatarUrl="https://i.pravatar.cc/80?img=47" name="Mira Okafor" role={<d.RoleTag>Design</d.RoleTag>} time="9:42 AM">
        <d.MessageBody>
          Pushed the v3 onboarding frames. The key change: we dropped the second email-confirm step entirely and
          fold identity into the first room invite — fewer screens, relays still can't read who you are.
        </d.MessageBody>
        <d.MessageBody gap>Link below, would love eyes before the 2pm crit.</d.MessageBody>
        <d.EmbedCard
          site="figma.com · onboarding-v3"
          title="Onboarding v3 — drop confirm, fold identity"
          description="14 frames. Relay-blind identity binding, single invite step, room-first onboarding."
          preview={<d.ExternalLinkGlyph size={30} />}
        />
        <d.Reactions>
          <d.Reaction emoji="👀" count={4} mine />
          <d.Reaction emoji="🔥" count={2} />
        </d.Reactions>
      </d.ChatMessage>

      <d.ChatMessage avatarUrl="https://i.pravatar.cc/80?img=12" name="Dev Lindqvist" role={<d.RoleTag>Eng</d.RoleTag>} time="9:48 AM">
        <d.MessageBody>
          The relay-blind identity bit — is that the <d.InlineCode>roomId-keyed</d.InlineCode> identity we prototyped
          in March? If so I can wire the binding in about a day.
        </d.MessageBody>
      </d.ChatMessage>

      <d.ChatMessage avatarUrl="https://i.pravatar.cc/80?img=47" name="Mira Okafor" role={<d.RoleTag>Design</d.RoleTag>} time="9:50 AM">
        <d.MessageBody>Exactly that. Here's the shape we landed on:</d.MessageBody>
        <d.CodeBlock
          filename="identity.ts"
          code={
            <>
              <span {...stylex.props(d.codeTokens.c)}>{"// relay sees only an opaque routing id, never the member\n"}</span>
              <span {...stylex.props(d.codeTokens.k)}>{"const"}</span>
              {" identity = room.bindMember({\n  key: member.deviceKey,\n  role: "}
              <span {...stylex.props(d.codeTokens.s)}>{"'designer'"}</span>
              {",\n})\n"}
              <span {...stylex.props(d.codeTokens.c)}>{"// → { routeId, canRead, canWrite }"}</span>
            </>
          }
        />
        <d.Reactions>
          <d.Reaction emoji="✅" count={3} mine />
        </d.Reactions>
      </d.ChatMessage>

      <d.ChatMessage continued>
        <d.MessageBody>
          The relay gets a routing id; <d.Mention>@Dev</d.Mention> gets the real member object end-to-end. Zero
          plaintext on the wire that the relay can read.
        </d.MessageBody>
      </d.ChatMessage>

      <d.ChatMessage avatarUrl="https://i.pravatar.cc/80?img=33" name="Priya Raman" role={<d.RoleTag>Eng</d.RoleTag>} time="10:02 AM">
        <d.MessageBody>
          One concern: if the first room is the invite, what happens when someone's device key rotates mid-invite?
          Do we re-issue or do they fall out of the room?
        </d.MessageBody>
      </d.ChatMessage>

      <d.ChatMessage avatarUrl="https://i.pravatar.cc/80?img=47" name="Mira Okafor" role={<d.RoleTag>Design</d.RoleTag>} time="10:05 AM">
        <d.MessageBody>
          Re-issue. Frame 9 shows the "your session was updated" toast — non-blocking, stays in the room. I'll add
          the edge-case to the spec doc today.
        </d.MessageBody>
        <d.Reactions>
          <d.Reaction emoji="🙏" count={2} />
        </d.Reactions>
      </d.ChatMessage>

      <d.NewSeparator />

      <d.ChatMessage
        avatarUrl="https://i.pravatar.cc/80?img=8"
        name="Avery Chen"
        you
        role={<d.RoleTag>You</d.RoleTag>}
        time="10:11 AM"
        actions={
          <>
            <d.Button size="sm" tone="quiet" title="React"><d.SmileGlyph size={16} /></d.Button>
            <d.Button size="sm" tone="quiet" title="Reply"><d.ReplyGlyph size={16} /></d.Button>
            <d.Button size="sm" tone="quiet" title="More"><d.MoreGlyph size={16} /></d.Button>
          </>
        }
      >
        <d.MessageBody>
          This is clean. One nit on the toast copy — "session was updated" reads like a bug. Maybe "We refreshed
          your secure connection" so it feels intentional? Happy to PR the strings.
        </d.MessageBody>
        <d.Reactions>
          <d.Reaction emoji="+1" count={3} mine />
          <d.Reaction emoji="🎯" count={1} />
        </d.Reactions>
      </d.ChatMessage>
    </>
  );
}

function ExampleChatColumn({ view, setView }: { view: ChatView; setView: (v: ChatView) => void }) {
  const [draft, setDraft] = useState("");
  const isEmpty = view === "empty";
  return (
    <d.ChatColumn
      header={
        <d.ChatHeader
          mobileToggle={
            <d.Button tone="muted" title="Open navigation"><d.MenuGlyph size={16} /></d.Button>
          }
          icon={<d.HashGlyph size={22} />}
          title="design"
          topic="Critique, specs, and Figma links for the product surface"
          actions={
            <>
              <d.Button tone="muted" title="Notifications"><d.BellGlyph size={16} /></d.Button>
              <d.Button tone="muted" title="Pinned"><d.PinGlyph size={16} /></d.Button>
            </>
          }
          memberAvatars={[
            "https://i.pravatar.cc/56?img=47",
            "https://i.pravatar.cc/56?img=12",
            "https://i.pravatar.cc/56?img=33",
          ]}
        />
      }
      banner={
        <d.ConnBanner show={view === "offline"}>
          Connection lost — reconnecting to the relay…{" "}
          <a href="#" onClick={(e) => { e.preventDefault(); setView("main"); }}>retry now</a>
        </d.ConnBanner>
      }
      empty={
        isEmpty ? (
          <d.EmptyState
            icon={<d.HashGlyph size={52} />}
            title="Welcome to #new-channel"
            description="This is the start of the channel. Send the first message to break the ice — Mosh rooms stay private to invited members, and the relay never sees your message text."
          />
        ) : undefined
      }
      messages={<ExampleMessages />}
      typing={isEmpty ? null : <d.TypingIndicator who={<><b>Mira</b> is typing…</>} />}
      composer={
        <d.Composer
          value={draft}
          onChange={setDraft}
          onSend={() => setDraft("")}
          placeholder="Message #design"
          attachButton={<d.Button tone="accent" title="Attach"><d.AttachGlyph size={16} /></d.Button>}
          tools={
            <>
              <d.Button tone="quiet" title="GIF"><d.GifGlyph size={16} /></d.Button>
              <d.Button tone="quiet" title="Emoji"><d.SmileGlyph size={16} /></d.Button>
            </>
          }
        />
      }
      voiceOverlay={
        <d.VoiceStage
          show={view === "voice"}
          title="Lounge"
          subtitle="· 5 connected · end-to-end encrypted"
          onLeave={() => setView("main")}
          controls={
            <>
              <d.Button size="lg" shape="round" variant="etched" tone="success" state="on" title="Mute"><d.MicGlyph size={20} /></d.Button>
              <d.Button size="lg" shape="round" variant="etched" tone="success" state="on" title="Deafen"><d.HeadphonesGlyph size={20} /></d.Button>
              <d.Button size="lg" shape="round" variant="etched" tone="success" state="on" title="Video"><d.VideoGlyph size={20} /></d.Button>
              <d.Button size="lg" shape="round" variant="etched" tone="success" state="on" title="Share screen"><d.ScreenGlyph size={20} /></d.Button>
            </>
          }
        >
          {VOICE_PEOPLE.map((p) => (
            <d.VoiceTile
              key={p.img}
              avatar={`https://i.pravatar.cc/120?img=${p.img}`}
              name={p.name}
              speaking={p.speaking}
              muted={p.muted}
              you={p.name === "Avery"}
            />
          ))}
        </d.VoiceStage>
      }
      loadingOverlay={
        <d.LoadingStage show={view === "loading"}>
          <d.StateCard
            spinner
            title="Joining Mosh…"
            description="Verifying your device key with the relay and loading the room roster. This stays private — the relay only sees an opaque routing id."
            action="Cancel"
            ghost
            onAction={() => setView("main")}
          />
        </d.LoadingStage>
      }
    />
  );
}

function ExampleRail() {
  return (
    <d.MemberRail>
      <d.RailGroup label="Core team" count={4}>
        <d.RailMember avatar="https://i.pravatar.cc/64?img=47" name="Mira Okafor" sub="Lead Designer · in #design" status="on" />
        <d.RailMember avatar="https://i.pravatar.cc/64?img=12" name="Dev Lindqvist" sub="Idle · Lounge" status="idle" />
        <d.RailMember avatar="https://i.pravatar.cc/64?img=33" name="Priya Raman" sub="Focus mode" status="dnd" />
        <d.RailMember avatar="https://i.pravatar.cc/64?img=8" name="Avery Chen" sub="That's you" status="on" />
      </d.RailGroup>
      <d.RailGroup label="Contributors" count={2}>
        <d.RailMember avatar="https://i.pravatar.cc/64?img=15" name="Sam Becker" sub="Offline" status="off" />
        <d.RailMember avatar="https://i.pravatar.cc/64?img=23" name="Lena Park" sub="External · design crit" status="on" />
      </d.RailGroup>
      <d.RailGroup label="Bots" count={1}>
        <d.RailMember avatar="https://i.pravatar.cc/64?img=68" name="Mosh Relay" sub="Presence + routing" status="on" />
      </d.RailGroup>
    </d.MemberRail>
  );
}

export function ChatExample() {
  const [view, setView] = useState<ChatView>("main");
  const views: ChatView[] = ["main", "voice", "empty", "loading", "offline"];
  return (
    <>
      <div {...stylex.props(switcher.bar)}>
        {views.map((v) => (
          <button
            key={v}
            type="button"
            {...stylex.props(switcher.btn, view === v && switcher.btnActive)}
            onClick={() => setView(v)}
          >
            {v[0].toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>
      <d.AppShell>
        <ExampleSidebar view={view} />
        <ExampleChatColumn view={view} setView={setView} />
        <ExampleRail />
      </d.AppShell>
    </>
  );
}

export default ChatExample;
