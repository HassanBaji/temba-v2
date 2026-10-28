import { colors, radii, sizes } from "@repo/design-tokens";
import {
  Link as LinkIcon,
  MessageCircle,
  MessageSquare,
  Phone,
  Share as ShareIcon,
  Users,
  X,
  type LucideIcon,
} from "lucide-react-native";
import { Pressable, View } from "react-native";

import { PhoneField } from "../auth/phone-field";
import type { Slot } from "../home/home-model";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { hairline } from "../primitives/hairline-width";
import { SearchField } from "../primitives/search-field";
import { Sheet } from "../primitives/sheet";
import { Skeleton } from "../primitives/skeleton";
import { Text } from "../primitives/text";
import {
  copyLinkLabel,
  INVITE_LINK_EMPTY_NOTE,
  INVITE_LINK_TTL_NOTE,
  INVITE_MODE_LABELS,
  inviteButtonLabel,
  inviteLinkNote,
  lookupResultView,
  NO_PENDING_COPY,
  noPlayersMatchCopy,
  PENDING_NOTE,
  pendingHeading,
  phoneInviteLabel,
  phoneInviteNote,
  playersHeading,
  type InviteDoorKind,
  type InviteMode,
  type LookupResultRow,
} from "./invites-model";

const MODE_ICONS: Record<InviteMode, LucideIcon> = {
  players: Users,
  phone: Phone,
  link: LinkIcon,
};
const SEGMENT_HEIGHT = 38;
const SEGMENT_INSET = 4;
const CHIP_HEIGHT = 32;
const CHIP_CLEAR = 22;
const MODE_GAP = 14;

export type PendingLookupRow = {
  id: string;
  user: { id: string; name: string; email: string | null };
};

export type PlayersModeProps = {
  query: string;
  onQueryChange: (query: string) => void;
  results: Slot<LookupResultRow[]>;
  invitedUserIds: ReadonlySet<string>;
  busyUserId: string | null;
  /** A Team has one open seat, so one pending invite closes the others. */
  singlePick: boolean;
  onInvite: (row: LookupResultRow) => void;
  onUninvite: (userId: string) => void;
  refused: { name: string; message: string }[] | null;
  canLink: boolean;
};

export type PhoneModeProps = {
  countryIso: string;
  national: string;
  onCountryIsoChange: (iso: string) => void;
  onNationalChange: (value: string) => void;
  ready: boolean;
  sending: boolean;
  onSend: () => void;
  canLookup: boolean;
};

export type LinkModeProps = {
  kind: InviteDoorKind;
  currentUrl: string | null;
  pending: boolean;
  copied: boolean;
  onShare: () => void;
  onCopy: () => void;
  onWhatsApp: () => void;
  onMessages: () => void;
};

export type PendingProps = {
  rows: Slot<PendingLookupRow[]>;
  revokingId: string | null;
  onRevoke: (inviteId: string) => void;
};

export type InviteSheetViewProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle: string | null;
  modes: InviteMode[];
  mode: InviteMode;
  onModeChange: (mode: InviteMode) => void;
  players: PlayersModeProps | null;
  phone: PhoneModeProps | null;
  link: LinkModeProps | null;
  pending: PendingProps | null;
};

function CloseAction({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Close"
      onPress={onPress}
      style={{
        width: sizes.touchTarget,
        height: sizes.touchTarget,
        marginTop: -10,
        marginRight: -12,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <X size={sizes.iconAction} color={colors.ink} />
    </Pressable>
  );
}

function ModeSwitch({
  modes,
  mode,
  onChange,
}: {
  modes: InviteMode[];
  mode: InviteMode;
  onChange: (mode: InviteMode) => void;
}) {
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: "row",
        gap: SEGMENT_INSET,
        padding: SEGMENT_INSET,
        borderRadius: radii.lg,
        backgroundColor: colors.wash,
      }}
    >
      {modes.map((entry) => {
        const selected = entry === mode;
        const Icon = MODE_ICONS[entry];
        const foreground = selected ? colors.paper : colors.muted;
        return (
          <Pressable
            key={entry}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(entry)}
            hitSlop={(sizes.touchTarget - SEGMENT_HEIGHT) / 2}
            style={{
              flex: 1,
              height: SEGMENT_HEIGHT,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              borderRadius: radii.md,
              backgroundColor: selected ? colors.ink : "transparent",
            }}
          >
            <Icon size={14} color={foreground} />
            <Text size="meta" weight="semibold" style={{ color: foreground }}>
              {INVITE_MODE_LABELS[entry]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function PlayerRow({
  row,
  invited,
  busy,
  blocked,
  onInvite,
  onUninvite,
}: {
  row: LookupResultRow;
  invited: boolean;
  busy: boolean;
  blocked: boolean;
  onInvite: () => void;
  onUninvite: () => void;
}) {
  const view = lookupResultView(row, invited);
  return (
    <View
      style={{
        minHeight: 60,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 10,
        borderBottomWidth: hairline,
        borderBottomColor: colors.rule,
      }}
    >
      <Avatar name={view.name} size="lg" />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text weight="semibold" numberOfLines={1}>
          {view.name}
        </Text>
        {view.meta ? (
          <Text size="eyebrow" tone="muted" numberOfLines={1}>
            {view.meta}
          </Text>
        ) : null}
      </View>
      <Button
        label={inviteButtonLabel(invited)}
        accessibilityLabel={
          invited ? `Cancel invite for ${view.name}` : `Invite ${view.name}`
        }
        size="sm"
        variant={invited ? "outline" : "default"}
        selected={invited}
        pending={busy}
        disabled={!invited && blocked}
        onPress={invited ? onUninvite : onInvite}
      />
    </View>
  );
}

function PlayersMode({ players }: { players: PlayersModeProps }) {
  const { results } = players;
  const hasPick = players.singlePick && players.invitedUserIds.size > 0;
  return (
    <View style={{ gap: MODE_GAP }}>
      <SearchField
        value={players.query}
        onChangeText={players.onQueryChange}
        placeholder="Name or username"
        accessibilityLabel="Search players"
      />
      {players.refused && players.refused.length > 0 ? (
        <View style={{ gap: 4 }} accessibilityRole="alert">
          {players.refused.map((item) => (
            <Text
              key={`${item.name}-${item.message}`}
              size="meta"
              weight="medium"
            >
              {item.name}: {item.message}
            </Text>
          ))}
        </View>
      ) : null}
      <Text size="eyebrow" tone="muted">
        {playersHeading(players.query)}
      </Text>
      {results.status === "loading" ? (
        <View style={{ gap: 8 }}>
          <Skeleton height={48} radius={radii.lg} />
          <Skeleton height={48} radius={radii.lg} />
        </View>
      ) : results.status === "error" ? (
        <Text size="meta" weight="medium" accessibilityRole="alert">
          {results.message}
        </Text>
      ) : results.value.length === 0 ? (
        <Text
          size="meta"
          tone="muted"
          style={{ textAlign: "center", paddingVertical: 22 }}
        >
          {noPlayersMatchCopy(players.query, players.canLink)}
        </Text>
      ) : (
        <View style={{ marginTop: -10 }}>
          {results.value.map((row) => (
            <PlayerRow
              key={row.id}
              row={row}
              invited={players.invitedUserIds.has(row.id)}
              busy={players.busyUserId === row.id}
              blocked={hasPick || players.busyUserId != null}
              onInvite={() => players.onInvite(row)}
              onUninvite={() => players.onUninvite(row.id)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function PhoneMode({ phone }: { phone: PhoneModeProps }) {
  return (
    <View style={{ gap: MODE_GAP }}>
      <PhoneField
        label="Phone number"
        countryIso={phone.countryIso}
        national={phone.national}
        onCountryIsoChange={phone.onCountryIsoChange}
        onNationalChange={phone.onNationalChange}
        disabled={phone.sending}
      />
      <Text size="meta" tone="muted">
        {phoneInviteNote(phone.canLookup)}
      </Text>
      <Button
        label={phoneInviteLabel(phone.ready, phone.sending)}
        size="lg"
        pending={phone.sending}
        disabled={!phone.ready}
        onPress={phone.onSend}
      />
    </View>
  );
}

function ChannelButton({
  label,
  Icon,
  disabled,
  onPress,
}: {
  label: string;
  Icon: LucideIcon;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Button
        label={label}
        variant="outline"
        disabled={disabled}
        icon={<Icon size={14} color={colors.ink} />}
        onPress={onPress}
      />
    </View>
  );
}

function LinkMode({ link }: { link: LinkModeProps }) {
  return (
    <View style={{ gap: MODE_GAP }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingVertical: 14,
          paddingHorizontal: 16,
          borderRadius: radii.lg,
          borderWidth: hairline,
          borderColor: colors.rule,
        }}
      >
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          {link.currentUrl ? (
            <Text mono selectable numberOfLines={1}>
              {link.currentUrl}
            </Text>
          ) : null}
          <Text size="eyebrow" tone="muted">
            {link.currentUrl ? INVITE_LINK_TTL_NOTE : INVITE_LINK_EMPTY_NOTE}
          </Text>
        </View>
        <Button
          label={copyLinkLabel(link.copied)}
          accessibilityLabel="Copy link"
          size="sm"
          variant={link.copied ? "outline" : "default"}
          disabled={link.pending}
          onPress={link.onCopy}
        />
      </View>
      <Text size="meta" tone="muted">
        {inviteLinkNote(link.kind)}
      </Text>
      <Button
        label="Share link"
        size="lg"
        pending={link.pending}
        icon={<ShareIcon size={sizes.iconRow} color={colors.paper} />}
        onPress={link.onShare}
      />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <ChannelButton
          label="WhatsApp"
          Icon={MessageCircle}
          disabled={link.pending}
          onPress={link.onWhatsApp}
        />
        <ChannelButton
          label="Messages"
          Icon={MessageSquare}
          disabled={link.pending}
          onPress={link.onMessages}
        />
      </View>
    </View>
  );
}

function PendingChip({
  row,
  revoking,
  onRevoke,
}: {
  row: PendingLookupRow;
  revoking: boolean;
  onRevoke: () => void;
}) {
  return (
    <View
      style={{
        height: CHIP_HEIGHT,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingLeft: 12,
        paddingRight: 5,
        borderRadius: CHIP_HEIGHT / 2,
        borderWidth: hairline,
        borderColor: colors.rule,
        opacity: revoking ? 0.5 : 1,
      }}
    >
      <Text size="meta" numberOfLines={1}>
        {row.user.name}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Cancel invite for ${row.user.name}`}
        disabled={revoking}
        onPress={onRevoke}
        hitSlop={(sizes.touchTarget - CHIP_CLEAR) / 2}
        style={{
          width: CHIP_CLEAR,
          height: CHIP_CLEAR,
          borderRadius: CHIP_CLEAR / 2,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.wash,
        }}
      >
        <X size={12} color={colors.muted} />
      </Pressable>
    </View>
  );
}

function PendingFooter({ pending }: { pending: PendingProps }) {
  const rows = pending.rows.status === "ready" ? pending.rows.value : [];
  return (
    <View style={{ gap: 10 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Text size="meta" weight="semibold" accessibilityRole="header">
          {pendingHeading(rows.length)}
        </Text>
        {rows.length > 0 ? (
          <Text size="eyebrow" tone="muted">
            {PENDING_NOTE}
          </Text>
        ) : null}
      </View>
      {pending.rows.status === "loading" ? (
        <Skeleton height={CHIP_HEIGHT} radius={CHIP_HEIGHT / 2} />
      ) : pending.rows.status === "error" ? (
        <Text size="meta" weight="medium" accessibilityRole="alert">
          {pending.rows.message}
        </Text>
      ) : rows.length === 0 ? (
        <Text size="meta" tone="muted">
          {NO_PENDING_COPY}
        </Text>
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {rows.map((row) => (
            <PendingChip
              key={row.id}
              row={row}
              revoking={pending.revokingId === row.id}
              onRevoke={() => pending.onRevoke(row.id)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

export function InviteSheetView({
  visible,
  onClose,
  title,
  subtitle,
  modes,
  mode,
  onModeChange,
  players,
  phone,
  link,
  pending,
}: InviteSheetViewProps) {
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      action={<CloseAction onPress={onClose} />}
      tall
      keyboardShouldPersistTaps="handled"
      footer={pending ? <PendingFooter pending={pending} /> : null}
    >
      {modes.length > 1 ? (
        <ModeSwitch modes={modes} mode={mode} onChange={onModeChange} />
      ) : null}
      <View style={{ paddingTop: 4 }}>
        {mode === "players" && players ? (
          <PlayersMode players={players} />
        ) : null}
        {mode === "phone" && phone ? <PhoneMode phone={phone} /> : null}
        {mode === "link" && link ? <LinkMode link={link} /> : null}
      </View>
    </Sheet>
  );
}
