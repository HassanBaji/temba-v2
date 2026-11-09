import { radii, spacing } from "@repo/design-tokens";
import { type TeamDetailView } from "@repo/domain/team-detail";
import {
  Ellipsis,
  Plus,
  Share as ShareIcon,
  Swords,
  X,
} from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { useLightStatusBar } from "../create-game/step-shell";
import {
  ConfirmSheet,
  type ConfirmRequest,
} from "../game-details/confirm-sheet";
import { useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { NotOnTembaMark } from "../primitives/not-on-temba-mark";
import { ResultMark } from "../primitives/result-mark";
import { HeaderIconButton, ScreenHeader } from "../primitives/screen-header";
import { Sheet } from "../primitives/sheet";
import { SheetMenu, SheetMenuRow } from "../primitives/sheet-menu";
import { Surface } from "../primitives/surface";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import { TeamTile } from "./team-avatars";
import { TEAMS_PATH } from "./teams-model";

type Members = TeamDetailView["members"];
type MemberRemove = NonNullable<Members["rows"][number]["remove"]>;

const FORM_GAP = 6;
const STRIP_GAP = 3;
const STRIP_WIDTH = 120;

function LightStatusBar() {
  useLightStatusBar();
  return null;
}

function RecordSeats({ seats }: { seats: TeamDetailView["hero"]["seats"] }) {
  const palette = useTonePalette();
  if (seats.kind === "roster") {
    const cell = (STRIP_WIDTH - STRIP_GAP * 9) / 10;
    return (
      <View style={{ width: STRIP_WIDTH, gap: 6 }}>
        <Text size="eyebrow" tone="muted" style={{ textAlign: "right" }}>
          {seats.label}
        </Text>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{ flexDirection: "row", flexWrap: "wrap", gap: STRIP_GAP }}
        >
          {Array.from({ length: seats.total }, (_, index) => (
            <View
              key={index}
              style={{
                width: cell,
                height: 7,
                borderRadius: 2,
                backgroundColor:
                  index < seats.filled ? palette.foreground : "transparent",
                borderWidth: index < seats.filled ? 0 : hairline,
                borderColor: palette.rule,
              }}
            />
          ))}
        </View>
      </View>
    );
  }
  return (
    <View
      accessible
      accessibilityLabel={seats.spoken}
      style={{ flexDirection: "row", gap: 4 }}
    >
      {seats.tiles.map((tile) => (
        <TeamTile
          key={tile.key}
          initials={tile.initials}
          tone="solid"
          size="seat"
        />
      ))}
      {Array.from({ length: seats.openSeats }, (_, index) => (
        <TeamTile key={`open-${index}`} tone="hatched" size="seat" />
      ))}
    </View>
  );
}

export type TeamHeroProps = {
  hero: TeamDetailView["hero"];
  onMenu: (() => void) | null;
  onPost: () => void;
  onInvite: () => void;
  onShare: () => void;
};

/** 4a and 4b: the black hero with the crest, the record and its seats. */
export function TeamHero({
  hero,
  onMenu,
  onPost,
  onInvite,
  onShare,
}: TeamHeroProps) {
  const m = useMessages();
  const palette = useTonePalette();
  return (
    <Surface
      tone="ink"
      style={{
        borderRadius: 0,
        borderWidth: 0,
        paddingTop: spacing.compact,
        gap: 20,
      }}
    >
      <LightStatusBar />
      <ScreenHeader
        nav="back"
        fallback={TEAMS_PATH}
        actions={
          onMenu ? (
            <HeaderIconButton
              framed
              icon={Ellipsis}
              accessibilityLabel={m.common.more}
              onPress={onMenu}
            />
          ) : null
        }
      />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        <TeamTile initials={hero.initials} tone="solid" size="crest" />
        <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
          <Text size="h1" weight="bold" accessibilityRole="header">
            {hero.title}
          </Text>
          {hero.subtitle ? (
            <Text size="meta" tone="muted">
              {hero.subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 18,
          padding: spacing.compact,
          borderRadius: radii.surface,
          borderWidth: hairline,
          borderColor: palette.rule,
        }}
      >
        <View
          accessible
          accessibilityLabel={hero.record.spoken}
          style={{ flex: 1, minWidth: 0, gap: 4 }}
        >
          <Text size="eyebrow" tone="muted">
            {hero.record.label}
          </Text>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              alignItems: "baseline",
              columnGap: 10,
            }}
          >
            <Text size="hero" width="expanded" weight="bold" ltr>
              {hero.record.value}
            </Text>
            <Text size="meta" tone="muted">
              {hero.record.caption}
            </Text>
          </View>
        </View>
        <RecordSeats seats={hero.seats} />
      </View>

      {hero.primary || hero.share ? (
        <View style={{ flexDirection: "row", gap: 8, marginTop: -6 }}>
          {hero.primary ? (
            <View style={{ flex: 1 }}>
              <Button
                label={hero.primary.label}
                variant="inverse"
                size="lg"
                onPress={hero.primary.kind === "post" ? onPost : onInvite}
              />
            </View>
          ) : null}
          {hero.share ? (
            <View style={hero.primary ? undefined : { flex: 1 }}>
              <Button
                label={hero.share.label}
                variant="outline-inverse"
                size="lg"
                icon={<ShareIcon size={15} color={palette.foreground} />}
                onPress={onShare}
              />
            </View>
          ) : null}
        </View>
      ) : null}
    </Surface>
  );
}

function DetailSection({
  title,
  meta,
  note,
  trailing,
  children,
}: {
  title: string;
  meta?: string | null;
  note?: string | null;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 12 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Text
          size="title"
          width="expanded"
          weight="bold"
          accessibilityRole="header"
        >
          {title}
        </Text>
        {trailing ??
          (meta ? (
            <Text size="meta" tone="muted" style={{ flexShrink: 1 }}>
              {meta}
            </Text>
          ) : null)}
      </View>
      {children}
      {note ? (
        <Text size="eyebrow" tone="muted">
          {note}
        </Text>
      ) : null}
    </View>
  );
}

function Rows({ children }: { children: React.ReactNode[] }) {
  return (
    <Surface padded={false} radius="card" style={{ overflow: "hidden" }}>
      {children.filter(Boolean).map((child, index) => (
        <View key={index}>
          {index > 0 ? <Hairline /> : null}
          {child}
        </View>
      ))}
    </Surface>
  );
}

function FormMarks({ form }: { form: TeamDetailView["form"] }) {
  const [width, setWidth] = useState(0);
  const size =
    width > 0
      ? (width - FORM_GAP * (form.slots.length - 1)) / form.slots.length
      : 0;
  return (
    <View style={{ gap: 6 }}>
      <View
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        style={{ flexDirection: "row", gap: FORM_GAP, minHeight: size }}
      >
        {size > 0
          ? form.slots.map((slot) => (
              <ResultMark key={slot.key} variant={slot.variant} size={size} />
            ))
          : null}
      </View>
      {form.ends ? (
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text size="eyebrow" tone="muted">
            {form.ends.oldest}
          </Text>
          <Text size="eyebrow" tone="muted">
            {form.ends.newest}
          </Text>
        </View>
      ) : null}
      {form.emptyCopy ? (
        <Text size="meta" tone="muted">
          {form.emptyCopy}
        </Text>
      ) : null}
    </View>
  );
}

function NoRivals({
  empty,
}: {
  empty: NonNullable<TeamDetailView["rivals"]["empty"]>;
}) {
  const colors = useColors();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingVertical: 16,
        paddingHorizontal: spacing.compact,
        borderRadius: radii.card,
        overflow: "hidden",
      }}
    >
      <Hatch radius={radii.card} />
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 4,
          borderRadius: radii.md,
          backgroundColor: colors.paper,
        }}
      >
        <TeamTile initials={empty.initials} tone="solid" size="mini" />
        <Text size="eyebrow" tone="muted" style={{ marginHorizontal: 6 }}>
          {empty.versus}
        </Text>
        <TeamTile tone="empty" size="mini" />
      </View>
      <View
        accessible
        style={{
          flex: 1,
          minWidth: 0,
          gap: 2,
          paddingVertical: 6,
          paddingHorizontal: 8,
          borderRadius: radii.sm,
          backgroundColor: colors.paper,
        }}
      >
        <Text weight="semibold">{empty.title}</Text>
        <Text size="eyebrow" tone="muted">
          {empty.body}
        </Text>
      </View>
    </View>
  );
}

function Rivals({
  rivals,
  onOpenTeam,
  onRematch,
}: {
  rivals: TeamDetailView["rivals"];
  onOpenTeam: (teamId: string) => void;
  onRematch: (opponentTeamId: string) => void;
}) {
  const colors = useColors();
  if (rivals.empty) {
    return <NoRivals empty={rivals.empty} />;
  }
  return (
    <Rows>
      {rivals.rows.map((rival) => (
        <View
          key={rival.teamId}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingVertical: 12,
            paddingHorizontal: 16,
          }}
        >
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={rival.accessibilityLabel}
            onPress={() => onOpenTeam(rival.teamId)}
            style={{
              flex: 1,
              minWidth: 0,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <TeamTile initials={rival.initials} tone="solid" size="rival" />
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <View
                style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}
              >
                <Text
                  weight="semibold"
                  numberOfLines={1}
                  style={{ flexShrink: 1 }}
                >
                  {rival.name}
                </Text>
                <Text width="expanded" weight="bold" ltr>
                  {rival.headToHead}
                </Text>
              </View>
              <Text size="eyebrow" tone="muted">
                {rival.line}
              </Text>
            </View>
          </Pressable>
          {rival.rematch ? (
            <Button
              label={rival.rematch.label}
              accessibilityLabel={rival.rematch.accessibilityLabel}
              size="sm"
              icon={<Swords size={13} color={colors.onControl} />}
              onPress={() => onRematch(rival.teamId)}
            />
          ) : null}
        </View>
      ))}
    </Rows>
  );
}

function MemberRow({
  row,
  onOpen,
  onRemove,
}: {
  row: Members["rows"][number];
  onOpen: ((userId: string) => void) | null;
  onRemove: (remove: MemberRemove) => void;
}) {
  const colors = useColors();
  const body = (
    <>
      <TeamTile
        initials={row.initials}
        tone={row.isViewer ? "solid" : "outline"}
        size="member"
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text weight="semibold" numberOfLines={1}>
          {row.name}
        </Text>
        {row.line ? (
          <Text size="eyebrow" tone="muted" numberOfLines={1}>
            {row.line}
          </Text>
        ) : null}
        {row.note ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            {row.unclaimed ? <NotOnTembaMark /> : null}
            <Text size="eyebrow" tone="muted" numberOfLines={1}>
              {row.note}
            </Text>
          </View>
        ) : null}
      </View>
      {row.level ? (
        <Text size="meta" tone="muted" ltr>
          {row.level}
        </Text>
      ) : null}
    </>
  );
  const rowStyle = {
    flex: 1,
    minWidth: 0,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  };
  const userId = row.profileUserId;
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      {userId && onOpen ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={row.accessibilityLabel}
          onPress={() => onOpen(userId)}
          style={({ pressed }) => [
            rowStyle,
            { backgroundColor: pressed ? colors.wash : "transparent" },
          ]}
        >
          {body}
        </Pressable>
      ) : (
        <View
          accessible
          accessibilityLabel={row.accessibilityLabel}
          style={rowStyle}
        >
          {body}
        </View>
      )}
      {row.remove ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={row.remove.label}
          onPress={() => {
            if (row.remove) {
              onRemove(row.remove);
            }
          }}
          hitSlop={12}
          style={{ paddingEnd: 16 }}
        >
          <X size={20} color={colors.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

function Roster({
  members,
  onOpenPlayer,
  onOpenSeat,
  onRemove,
}: {
  members: Members;
  onOpenPlayer: (userId: string) => void;
  onOpenSeat: () => void;
  onRemove: (remove: MemberRemove) => void;
}) {
  const m = useMessages();
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);
  if (members.emptyCopy) {
    return (
      <Text size="meta" tone="muted">
        {members.emptyCopy}
      </Text>
    );
  }
  const shown = expanded
    ? members.rows
    : members.rows.slice(0, members.preview);
  const more = expanded ? null : members.more;
  const seat = members.openSeat;
  return (
    <Rows>
      {[
        ...shown.map((row) => (
          <MemberRow
            key={row.id}
            row={row}
            onOpen={onOpenPlayer}
            onRemove={onRemove}
          />
        )),
        more ? (
          <Pressable
            key="more"
            accessibilityRole="button"
            accessibilityLabel={more}
            onPress={() => setExpanded(true)}
            style={{ paddingVertical: 12, paddingHorizontal: 16 }}
          >
            <Text size="eyebrow" tone="muted">
              {more}
            </Text>
          </Pressable>
        ) : null,
        seat ? (
          <View
            key="seat"
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              paddingVertical: 12,
              paddingHorizontal: 16,
            }}
          >
            <TeamTile tone="hatched" size="member">
              <Plus size={16} color={colors.muted} />
            </TeamTile>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text tone="muted">{seat.title}</Text>
              <Text size="eyebrow" tone="muted">
                {seat.detail}
              </Text>
            </View>
            <Button
              label={seat.cta}
              accessibilityLabel={[seat.title, seat.detail, seat.cta].join(
                m.group.metaSeparator,
              )}
              variant="outline"
              size="sm"
              onPress={onOpenSeat}
            />
          </View>
        ) : null,
      ]}
    </Rows>
  );
}

function Games({
  games,
  onOpenGame,
}: {
  games: TeamDetailView["games"];
  onOpenGame: (gameId: string) => void;
}) {
  if (games.emptyCopy) {
    return (
      <Text size="meta" tone="muted">
        {games.emptyCopy}
      </Text>
    );
  }
  return (
    <Rows>
      {games.rows.map((game) => (
        <Pressable
          key={game.key}
          accessibilityRole="link"
          accessibilityLabel={game.accessibilityLabel}
          onPress={() => onOpenGame(game.gameId)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingVertical: 13,
            paddingHorizontal: 16,
          }}
        >
          <ResultMark variant={game.result} size={18} decorative />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1}>{game.title}</Text>
            <Text size="eyebrow" tone="muted" numberOfLines={1}>
              {game.meta}
            </Text>
          </View>
          <Text weight="semibold" ltr>
            {game.score}
          </Text>
        </Pressable>
      ))}
    </Rows>
  );
}

export type TeamMenuItem = {
  key: string;
  label: string;
  tone?: "default" | "danger";
  disabled?: boolean;
  onPress: () => void;
};

export type TeamDetailBodyProps = {
  detail: TeamDetailView;
  formTitle: string;
  rivalsTitle: string;
  gamesTitle: string;
  actionError: string | null;
  confirm: ConfirmRequest | null;
  confirmPending: boolean;
  menu: { visible: boolean; items: TeamMenuItem[]; onClose: () => void };
  onOpenTeam: (teamId: string) => void;
  onRematch: (opponentTeamId: string) => void;
  onOpenPlayer: (userId: string) => void;
  onOpenGame: (gameId: string) => void;
  onOpenSeat: () => void;
  onRemoveMember: (remove: MemberRemove) => void;
  onCloseConfirm: () => void;
};

/** Form, Rivals, the Members or Roster, and Games, on paper under the hero. */
export function TeamDetailBody(props: TeamDetailBodyProps) {
  const { detail } = props;
  return (
    <>
      {props.actionError ? (
        <Text size="meta" weight="medium" accessibilityRole="alert">
          {props.actionError}
        </Text>
      ) : null}
      {detail.home.waitingNote ? (
        <Text size="meta" tone="muted">
          {detail.home.waitingCopy}
        </Text>
      ) : null}

      <DetailSection title={props.formTitle} meta={detail.form.scope}>
        <FormMarks form={detail.form} />
      </DetailSection>

      <DetailSection
        title={props.rivalsTitle}
        meta={detail.rivals.subtitle}
        note={detail.rivals.footnote ?? detail.rivals.empty?.closest}
      >
        <Rivals
          rivals={detail.rivals}
          onOpenTeam={props.onOpenTeam}
          onRematch={props.onRematch}
        />
      </DetailSection>

      <DetailSection
        title={detail.members.title}
        meta={detail.members.count}
        note={detail.members.footnote}
      >
        <Roster
          members={detail.members}
          onOpenPlayer={props.onOpenPlayer}
          onOpenSeat={props.onOpenSeat}
          onRemove={props.onRemoveMember}
        />
      </DetailSection>

      <DetailSection title={props.gamesTitle} meta={detail.games.subtitle}>
        <Games games={detail.games} onOpenGame={props.onOpenGame} />
      </DetailSection>

      <Sheet
        visible={props.menu.visible}
        onClose={props.menu.onClose}
        title={detail.hero.title}
        titleSize="lead"
        closeButton
      >
        <SheetMenu>
          {props.menu.items.map((item) => (
            <SheetMenuRow
              key={item.key}
              label={item.label}
              tone={item.tone}
              disabled={item.disabled}
              onPress={() => {
                props.menu.onClose();
                item.onPress();
              }}
            />
          ))}
        </SheetMenu>
      </Sheet>

      <ConfirmSheet
        request={props.confirm}
        pending={props.confirmPending}
        onClose={props.onCloseConfirm}
      />
    </>
  );
}
