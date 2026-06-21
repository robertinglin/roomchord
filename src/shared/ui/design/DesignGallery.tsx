import React, { useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { tokens } from "../theme.stylex";
import * as d from "./index";

/**
 * DesignGallery — renders EVERY component in the kit across all its variants.
 * Pure layout to tile the atoms; no atom restyling. Used as the "Gallery" tab
 * in the design review mount.
 */

const page = stylex.create({
  scroll: {
    height: ["100vh", "100svh"],
    overflowY: "auto",
    padding: "32px 40px 80px",
    backgroundColor: tokens.bg,
    color: tokens.fg,
  },
  h1: {
    margin: "0 0 4px",
    fontFamily: tokens.fontDisplay,
    fontSize: "28px",
    fontWeight: 700,
  },
  lead: { margin: "0 0 32px", color: tokens.muted, fontSize: "15px" },
  section: { marginBottom: "40px" },
  sectionTitle: {
    margin: "0 0 4px",
    fontFamily: tokens.fontDisplay,
    fontSize: "13px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: tokens.quiet,
  },
  sectionDesc: { margin: "0 0 16px", fontSize: "13px", color: tokens.muted },
  // demo surface that mimics the sidebar so sidebar atoms read correctly
  sidebarSurface: {
    backgroundColor: tokens.surface,
    borderRadius: tokens.radiusPanel,
    padding: "12px 10px",
    maxWidth: "320px",
  },
  // demo surface that mimics the chat column bg
  chatSurface: {
    backgroundColor: tokens.bg,
    borderRadius: tokens.radiusPanel,
    padding: "8px 0",
    border: `1px solid ${tokens.borderSoft}`,
  },
  railSurface: {
    backgroundColor: tokens.surface,
    borderRadius: tokens.radiusPanel,
    padding: "16px 8px",
    maxWidth: "320px",
  },
  row: { display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" },
  col: { display: "flex", flexDirection: "column", gap: "8px" },
  stack: { display: "flex", flexDirection: "column", gap: "4px" },
  label: { fontSize: "11px", color: tokens.quiet, marginTop: "4px" },
  cell: { display: "flex", flexDirection: "column", alignItems: "flex-start" },
  // icon swatch — fixed-size box so every glyph centers identically
  iconSwatch: {
    width: "32px",
    height: "32px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: tokens.fg,
  },
  // larger swatch for the brand wordmark (auto-sized tile)
  brandSwatch: {
    width: "auto",
    height: "auto",
    padding: "6px",
  },
});

function Section({
  title,
  desc,
  children,
}: React.PropsWithChildren<{ title: string; desc?: string }>) {
  return (
    <section {...stylex.props(page.section)}>
      <h2 {...stylex.props(page.sectionTitle)}>{title}</h2>
      {desc && <p {...stylex.props(page.sectionDesc)}>{desc}</p>}
      {children}
    </section>
  );
}

const AV = "https://i.pravatar.cc/64?img=47";

export function DesignGallery() {
  const [draft, setDraft] = useState("");
  const [voiceState, setVoiceState] = useState<d.VoiceState>("on");

  return (
    <div {...stylex.props(page.scroll)}>
      <h1 {...stylex.props(page.h1)}>Mosh Design System</h1>
      <p {...stylex.props(page.lead)}>
        Every atomic component and its variants. Each lives in its own file under
        <code> src/shared/ui/design/</code>.
      </p>

      {/* ── Brand ── */}
      <Section title="Brand" desc="Wordmark (the Mosh squiggle) used in the sidebar head.">
        <div {...stylex.props(page.row)}>
          <div {...stylex.props(page.cell)}>
            <span {...stylex.props(page.iconSwatch, page.brandSwatch)}>
              <d.Wordmark />
            </span>
            <span {...stylex.props(page.label)}>Wordmark</span>
          </div>
        </div>
      </Section>

      {/* ── Icons ── */}
      <Section title="Icons" desc="Glyph primitive + named glyphs. All inherit currentColor; size via prop.">
        <div {...stylex.props(page.row)}>
          {([
            ["Hash", <d.HashGlyph size={20} />],
            ["Speaker", <d.SpeakerGlyph size={20} />],
            ["Mic", <d.MicGlyph size={20} />],
            ["MicOff", <d.MicOffGlyph size={20} />],
            ["Bell", <d.BellGlyph size={20} />],
            ["Pin", <d.PinGlyph size={20} />],
            ["Attach", <d.AttachGlyph size={20} />],
            ["Gif", <d.GifGlyph size={20} />],
            ["Smile", <d.SmileGlyph size={20} />],
            ["Reply", <d.ReplyGlyph size={20} />],
            ["More", <d.MoreGlyph size={20} />],
            ["Menu", <d.MenuGlyph size={20} />],
            ["Leave", <d.LeaveGlyph size={20} />],
            ["Search", <d.SearchGlyph size={20} />],
            ["Send", <d.SendGlyph size={20} />],
            ["Plus", <d.PlusGlyph size={20} />],
            ["Chevron", <d.ChevronGlyph size={20} />],
            ["Gear", <d.GearGlyph size={20} />],
            ["ExternalLink", <d.ExternalLinkGlyph size={20} />],
            ["Headphones", <d.HeadphonesGlyph size={20} />],
            ["Video", <d.VideoGlyph size={20} />],
            ["Screen", <d.ScreenGlyph size={20} />],
          ] as const).map(([name, node]) => (
            <div key={name} {...stylex.props(page.cell)}>
              <span {...stylex.props(page.iconSwatch)}>{node}</span>
              <span {...stylex.props(page.label)}>{name}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Status & pills ── */}
      <Section title="Status dots & connection pills" desc="Tones: on / warn / off.">
        <div {...stylex.props(page.row)}>
          {(["on", "warn", "off"] as const).map((t) => (
            <div key={t} {...stylex.props(page.cell)}>
              <d.StatusDot tone={t} />
              <span {...stylex.props(page.label)}>{t}</span>
            </div>
          ))}
          {(["on", "warn", "off"] as const).map((t) => (
            <div key={t} {...stylex.props(page.cell)}>
              <d.ConnPill tone={t} label="Live" />
              <span {...stylex.props(page.label)}>ConnPill · {t}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Avatars ── */}
      <Section title="Avatars" desc="Sizes xs–xl, optional presence pip, ring (voice), desaturate (offline).">
        <div {...stylex.props(page.row)}>
          {(["xs", "sm", "md", "lg", "xl"] as const).map((s) => (
            <div key={s} {...stylex.props(page.cell)}>
              <d.Avatar src={AV} size={s} />
              <span {...stylex.props(page.label)}>{s}</span>
            </div>
          ))}
        </div>
        <div {...stylex.props(page.row)} style={{ marginTop: 16 }}>
          {(["on", "idle", "dnd", "off"] as const).map((s) => (
            <div key={s} {...stylex.props(page.cell)}>
              <d.Avatar src={AV} size="md" status={s} desaturate={s === "off"} />
              <span {...stylex.props(page.label)}>{s}</span>
            </div>
          ))}
          <div {...stylex.props(page.cell)}>
            <d.Avatar src={AV} size="sm" ring />
            <span {...stylex.props(page.label)}>sm + ring</span>
          </div>
        </div>
      </Section>

      {/* ── Badges ── */}
      <Section title="Badges">
        <div {...stylex.props(page.row)}>
          <d.Badge count={1} />
          <d.Badge count={3} />
          <d.Badge count={99} />
          <d.Badge count="!" />
        </div>
      </Section>

      {/* ── Buttons ── */}
      <Section title="Buttons" desc="Parametric: size × tone × variant × shape. Plus text-bearing (Send/Leave) and voice-control state.">
        <div {...stylex.props(page.col)}>
          <div {...stylex.props(page.row)}>
            <d.Button size="sm" tone="quiet"><d.PlusGlyph size={14} /></d.Button>
            <d.Button size="md" tone="quiet"><d.BellGlyph size={16} /></d.Button>
            <d.Button size="md" tone="muted"><d.PinGlyph size={16} /></d.Button>
            <d.Button size="md" tone="accent"><d.AttachGlyph size={16} /></d.Button>
            <d.Button size="md" variant="etched" tone="quiet"><d.MicGlyph size={16} /></d.Button>
            <d.Button size="sm" variant="solid" tone="accent"><d.SendGlyph size={15} />Send</d.Button>
            <d.Button size="sm" variant="solid" tone="danger"><d.LeaveGlyph size={15} />Leave</d.Button>
          </div>

          <div {...stylex.props(page.row)}>
            <span {...stylex.props(page.label)}>Voice controls (round, etched):</span>
            <d.Button size="lg" shape="round" variant="etched" tone="success" state={voiceState} onClick={() => setVoiceState(voiceState === "on" ? "off" : "on")} title="Mute">
              <d.MicGlyph size={20} />
            </d.Button>
            <d.Button size="lg" shape="round" variant="etched" tone="success" state="on" title="Deafen"><d.HeadphonesGlyph size={20} /></d.Button>
            <d.Button size="lg" shape="round" variant="etched" tone="success" state="off" title="Video"><d.VideoGlyph size={20} /></d.Button>
            <d.Button size="lg" shape="round" variant="etched" tone="success" state="on" title="Share"><d.ScreenGlyph size={20} /></d.Button>
          </div>

          <div {...stylex.props(page.row)}>
            <d.Button size="md" tone="quiet" disabled><d.BellGlyph size={16} /></d.Button>
            <span {...stylex.props(page.label)}>disabled</span>
          </div>
        </div>
      </Section>

      {/* ── Search input ── */}
      <Section title="Search input">
        <div {...stylex.props(page.sidebarSurface)}>
          <d.SearchInput placeholder="Find or start a conversation" />
        </div>
      </Section>

      {/* ── Sidebar rows ── */}
      <Section title="Sidebar rows" desc="Group heading, channel rows (text/voice, active, badge), voice members, DM rows.">
        <div {...stylex.props(page.sidebarSurface)}>
          <d.ChannelGroup label="General" onAdd={() => {}}>
            <d.ChannelRow icon={<d.HashGlyph size={18} />} name="announcements" />
            <d.ChannelRow icon={<d.HashGlyph size={18} />} name="design" active badge={<d.Badge count={3} />} />
            <d.ChannelRow icon={<d.HashGlyph size={18} />} name="random" />
          </d.ChannelGroup>
          <d.ChannelGroup label="Voice Rooms">
            <d.ChannelRow voice icon={<d.MicGlyph size={18} />} name="Lounge" />
            <d.VoiceMembers>
              <d.VoiceMember avatar={AV} name="Mira" speaking />
              <d.VoiceMember avatar="https://i.pravatar.cc/48?img=12" name="Dev" muted />
            </d.VoiceMembers>
          </d.ChannelGroup>
          <d.ChannelGroup label="Direct Messages">
            <d.DirectMessageRow avatar={AV} name="Mira Okafor" preview="ship the new composer?" status="on" />
            <d.DirectMessageRow avatar="https://i.pravatar.cc/64?img=12" name="Dev Lindqvist" preview="left a voice memo" status="idle" />
            <d.DirectMessageRow avatar="https://i.pravatar.cc/64?img=33" name="Priya Raman" preview="in Focus mode" status="dnd" />
            <d.DirectMessageRow avatar="https://i.pravatar.cc/64?img=15" name="Sam Becker" preview="offline" status="off" />
          </d.ChannelGroup>
        </div>
      </Section>

      {/* ── User foot ── */}
      <Section title="User footer">
        <div style={{ maxWidth: 320 }}>
          <d.UserFoot avatar="https://i.pravatar.cc/64?img=8" name="Avery Chen" sub="#design · Online" />
        </div>
      </Section>

      {/* ── Message anatomy ── */}
      <Section title="Message anatomy" desc="Default / continued / role / mention / inline code / embed / code block / reactions / actions.">
        <div {...stylex.props(page.chatSurface)}>
          <d.DaySeparator label="Today — June 21" />
          <d.ChatMessage avatarUrl={AV} name="Mira Okafor" role={<d.RoleTag>Design</d.RoleTag>} time="9:42 AM">
            <d.MessageBody>
              Pushed the v3 onboarding frames — relays still can't read who you are.
            </d.MessageBody>
            <d.EmbedCard
              site="figma.com · onboarding-v3"
              title="Onboarding v3 — drop confirm, fold identity"
              description="14 frames. Relay-blind identity binding."
              preview={<d.ExternalLinkGlyph size={30} />}
            />
            <d.Reactions>
              <d.Reaction emoji="👀" count={4} mine />
              <d.Reaction emoji="🔥" count={2} />
            </d.Reactions>
          </d.ChatMessage>

          <d.ChatMessage avatarUrl="https://i.pravatar.cc/80?img=12" name="Dev Lindqvist" role={<d.RoleTag>Eng</d.RoleTag>} time="9:48 AM">
            <d.MessageBody>
              Is that the <d.InlineCode>roomId-keyed</d.InlineCode> identity? And <d.Mention>@Mira</d.Mention> can confirm.
            </d.MessageBody>
          </d.ChatMessage>

          <d.ChatMessage avatarUrl={AV} name="Mira Okafor" role={<d.RoleTag>Design</d.RoleTag>} time="9:50 AM">
            <d.MessageBody>Here's the shape:</d.MessageBody>
            <d.CodeBlock
              filename="identity.ts"
              code={
                <>
                  <span {...stylex.props(d.codeTokens.c)}>{"// opaque routing id\n"}</span>
                  <span {...stylex.props(d.codeTokens.k)}>{"const"}</span>
                  {" identity = bind({ key, role: "}
                  <span {...stylex.props(d.codeTokens.s)}>{"'designer'"}</span>
                  {" })\n"}
                  <span {...stylex.props(d.codeTokens.c)}>{"// → { routeId }"}</span>
                </>
              }
            />
          </d.ChatMessage>

          <d.ChatMessage continued>
            <d.MessageBody>
              The relay gets a routing id; <d.Mention>@Dev</d.Mention> gets the real member object.
            </d.MessageBody>
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
            <d.MessageBody>One nit on the toast copy — reads like a bug.</d.MessageBody>
          </d.ChatMessage>
        </div>
      </Section>

      {/* ── Reactions ── */}
      <Section title="Reactions">
        <d.Reactions>
          <d.Reaction emoji="👀" count={4} mine />
          <d.Reaction emoji="🔥" count={2} />
          <d.Reaction emoji="✅" count={3} />
          <d.Reaction emoji="🎯" count={1} />
        </d.Reactions>
      </Section>

      {/* ── Separators ── */}
      <Section title="Separators">
        <div {...stylex.props(page.chatSurface)}>
          <d.DaySeparator label="Today — June 21" />
          <div style={{ padding: "0 16px", color: tokens.muted, fontSize: 14 }}>…messages…</div>
          <d.NewSeparator />
        </div>
      </Section>

      {/* ── Typing ── */}
      <Section title="Typing indicator">
        <div {...stylex.props(page.chatSurface)}>
          <d.TypingIndicator who={<><b>Mira</b> is typing…</>} />
        </div>
      </Section>

      {/* ── Composer ── */}
      <Section title="Composer">
        <div>
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
        </div>
      </Section>

      {/* ── Chat header ── */}
      <Section title="Chat header">
        <div style={{ border: `1px solid ${tokens.borderSoft}`, borderRadius: tokens.radiusPanel, overflow: "hidden" }}>
          <d.ChatHeader
            icon={<d.HashGlyph size={22} />}
            title="design"
            topic="Critique, specs, and Figma links"
            actions={
              <>
                <d.Button tone="muted" title="Notifications"><d.BellGlyph size={16} /></d.Button>
                <d.Button tone="muted" title="Pinned"><d.PinGlyph size={16} /></d.Button>
              </>
            }
            memberAvatars={[AV, "https://i.pravatar.cc/56?img=12", "https://i.pravatar.cc/56?img=33"]}
          />
        </div>
      </Section>

      {/* ── Connection banner ── */}
      <Section title="Connection banner">
        <d.ConnBanner show>
          Connection lost — reconnecting to the relay…{" "}
          <a href="#" onClick={(e) => e.preventDefault()}>retry now</a>
        </d.ConnBanner>
      </Section>

      {/* ── Voice tile ── */}
      <Section title="Voice tiles" desc="Speaking (green ring), muted badge, you.">
        <div {...stylex.props(page.row)}>
          <div style={{ width: 220 }}>
            <d.VoiceTile avatar={AV} name="Mira" speaking />
          </div>
          <div style={{ width: 220 }}>
            <d.VoiceTile avatar="https://i.pravatar.cc/120?img=12" name="Dev" muted />
          </div>
          <div style={{ width: 220 }}>
            <d.VoiceTile avatar="https://i.pravatar.cc/120?img=8" name="Avery" you />
          </div>
        </div>
      </Section>

      {/* ── Member rail ── */}
      <Section title="Member rail">
        <div {...stylex.props(page.railSurface)}>
          <d.RailGroup label="Core team" count={4}>
            <d.RailMember avatar={AV} name="Mira Okafor" sub="Lead Designer · in #design" status="on" />
            <d.RailMember avatar="https://i.pravatar.cc/64?img=12" name="Dev Lindqvist" sub="Idle · Lounge" status="idle" />
            <d.RailMember avatar="https://i.pravatar.cc/64?img=15" name="Sam Becker" sub="Offline" status="off" />
          </d.RailGroup>
        </div>
      </Section>

      {/* ── Empty state ── */}
      <Section title="Empty state">
        <div style={{ border: `1px solid ${tokens.borderSoft}`, borderRadius: tokens.radiusPanel, height: 240, display: "flex" }}>
          <d.EmptyState
            icon={<d.HashGlyph size={52} />}
            title="Welcome to #new-channel"
            description="This is the start of the channel. Send the first message to break the ice."
          />
        </div>
      </Section>

      {/* ── State cards ── */}
      <Section title="State cards" desc="Loading (spinner) and action card (solid + ghost).">
        <div {...stylex.props(page.row)}>
          <div style={{ width: 320 }}>
            <d.StateCard
              spinner
              title="Joining Mosh…"
              description="Verifying your device key with the relay."
              action="Cancel"
              ghost
            />
          </div>
          <div style={{ width: 320 }}>
            <d.StateCard
              icon={<d.SpeakerGlyph size={28} />}
              title="Voice connected"
              description="End-to-end encrypted room."
              action="Leave"
            />
          </div>
        </div>
      </Section>
    </div>
  );
}

export default DesignGallery;

