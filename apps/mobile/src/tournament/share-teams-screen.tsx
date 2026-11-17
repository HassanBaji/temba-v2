import { radii } from "@repo/design-tokens";
import { aloneTeamsShareText } from "@repo/domain/alone-teams";
import {
  formatGameDay,
  formatGameTimeWindow,
} from "@repo/domain/format-game-start";
import * as Clipboard from "expo-clipboard";
import * as MediaLibrary from "expo-media-library";
import type { Href } from "expo-router";
import * as Sharing from "expo-sharing";
import {
  Copy,
  ImageDown,
  Link,
  Maximize2,
  MessageCircle,
  Minimize2,
  Share as ShareIcon,
} from "lucide-react-native";
import { useMemo, useRef, useState } from "react";
import { Share, View } from "react-native";
import { captureRef } from "react-native-view-shot";

import { gameTitle } from "../game-details/details-model";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { useErrorMessage } from "../lib/use-error-message";
import { Button } from "../primitives/button";
import { Screen } from "../primitives/screen";
import {
  HeaderTextButton,
  ScreenHeader,
  useLeaveScreen,
} from "../primitives/screen-header";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useToast } from "../primitives/toast";
import { SwitchRow } from "../profile-settings/settings-rows";
import { ActionTile, ActionTileRow } from "../share-result/share-actions";
import { ShareModeSegments } from "../share-result/share-mode-segments";
import { PreviewMeta, PreviewWell } from "../share-result/share-preview";
import {
  STORY_HEIGHT,
  STORY_WIDTH,
  ScaledCanvas,
} from "../share-result/story-canvas";
import { useColors } from "../theme/theme-provider";
import { api } from "../trpc/react";
import { postedShareTeams } from "./alone-teams-model";
import {
  SQUARE_SIZE,
  TeamsSquareCard,
  TeamsStoryCard,
  type TeamsCardModel,
} from "./share-teams-cards";

type TeamsShareMode = "story" | "square" | "text";
type ShareAction =
  | "save"
  | "share_image"
  | "copy_link"
  | "message"
  | "copy_text";

const SHARE_ICON = 17;

function Notice({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <Surface accessibilityRole="alert" style={{ gap: 8 }}>
      <Text size="lead" weight="semibold">
        {title}
      </Text>
      {description ? (
        <Text size="meta" tone="muted">
          {description}
        </Text>
      ) : null}
    </Surface>
  );
}

/**
 * Share teams on an Alone-only Social: the posted pairs as a story, a square
 * or a numbered list for the group chat. Organizers only (ADR-0096).
 */
export function ShareTeamsScreen({ gameId }: { gameId: string }) {
  const colors = useColors();
  const locale = useLocale();
  const messages = useMessages();
  const m = messages.aloneTeams.share;
  const share = messages.mobilePlayer.share;
  const toast = useToast();
  const errorText = useErrorMessage();
  const [mode, setMode] = useState<TeamsShareMode>("story");
  const [full, setFull] = useState(false);
  const [showLevels, setShowLevels] = useState(false);
  const [pending, setPending] = useState<ShareAction | null>(null);
  const storyRef = useRef<View | null>(null);
  const squareRef = useRef<View | null>(null);

  const game = api.games.byId.useQuery({ id: gameId });
  const sheet = api.games.teamsSheet.useQuery({ gameId });
  const link = api.games.resultLink.useQuery({ gameId });

  const teams = useMemo(
    () => (sheet.data ? postedShareTeams(sheet.data) : []),
    [sheet.data],
  );
  const fallback = `/games/${gameId}` as Href;
  const leave = useLeaveScreen(fallback);
  const header = (
    <ScreenHeader
      nav="back"
      fallback={fallback}
      title={m.title}
      actions={<HeaderTextButton label={m.done} onPress={leave} />}
    />
  );

  if (game.error || sheet.error) {
    return (
      <Screen>
        {header}
        <Notice
          title={messages.mobileTournament.aloneTeams.loadFailed}
          description={game.error?.message ?? sheet.error?.message}
        />
      </Screen>
    );
  }
  if (!game.data || !sheet.data) {
    return (
      <Screen>
        {header}
        <View
          style={{ gap: 16 }}
          accessibilityLabel={messages.mobileTournament.aloneTeams.loading}
        >
          <Skeleton height={46} radius={radii.lg} />
          <Skeleton height={464} radius={radii.surface} />
          <Skeleton height={52} radius={radii.lg} />
        </View>
      </Screen>
    );
  }
  if (sheet.data.teamsPostedAt == null || teams.length === 0) {
    return (
      <Screen>
        {header}
        <Notice title={messages.mobileTournament.aloneTeams.nothingToShare} />
      </Screen>
    );
  }

  const details = game.data;
  const gameName = gameTitle(details, locale);
  const day = details.windowStart
    ? formatGameDay(details.windowStart, locale, { weekday: "short" })
    : null;
  const time = details.windowStart
    ? formatGameTimeWindow(
        details.windowStart,
        details.windowEnd,
        details.windowStart,
        locale,
      )
    : null;
  const venue = details.venue?.name ?? null;
  const model: TeamsCardModel = {
    gameName,
    meta: m.meta(
      details.groupName ?? null,
      teams.length,
      details.roundCount ?? null,
    ),
    teams,
    showLevels,
    venue,
    day,
    time,
  };
  const shareText = aloneTeamsShareText(
    {
      gameName,
      detailLines: [
        [day, time].filter(Boolean).join(" · "),
        venue ?? "",
      ].filter((line) => line.length > 0),
      teams: teams.map((team) => ({
        leftName: team.left.name,
        rightName: team.right.name,
        average: team.average,
      })),
      showLevels,
    },
    locale,
  );
  const url = link.data?.url ?? null;

  function run(action: ShareAction, task: () => Promise<void>) {
    if (pending) {
      return;
    }
    setPending(action);
    void task()
      .catch((error: unknown) => {
        toast.show(error instanceof Error ? errorText(error) : m.shareFailed);
      })
      .finally(() => setPending(null));
  }

  async function capture() {
    const story = mode === "story";
    return captureRef(story ? storyRef : squareRef, {
      format: "png",
      quality: 1,
      result: "tmpfile",
      width: STORY_WIDTH,
      height: story ? STORY_HEIGHT : SQUARE_SIZE,
    });
  }

  const saveImage = () =>
    run("save", async () => {
      const permission = await MediaLibrary.requestPermissionsAsync(true);
      if (!permission.granted) {
        toast.show(share.permissionRefused);
        return;
      }
      await MediaLibrary.Asset.create(await capture());
      toast.show(share.savedToPhotos);
    });

  const shareImage = () =>
    run("share_image", async () => {
      if (!(await Sharing.isAvailableAsync())) {
        toast.show(share.sharingUnavailable);
        return;
      }
      await Sharing.shareAsync(await capture(), {
        mimeType: "image/png",
        UTI: "public.png",
        dialogTitle: m.imageAlt(gameName),
      });
    });

  const copyText = () =>
    run("copy_text", async () => {
      await Clipboard.setStringAsync(shareText);
      toast.show(m.copied);
    });

  const copyLink = () =>
    run("copy_link", async () => {
      if (!url) {
        toast.show(share.linkStillLoading);
        return;
      }
      await Clipboard.setStringAsync(url);
      toast.show(share.linkCopied);
    });

  const sendMessage = () =>
    run("message", async () => {
      await Share.share({
        message: url ? `${shareText}\n\n${url}` : shareText,
      });
    });

  const note =
    mode === "story"
      ? m.storyNote(teams.length)
      : mode === "square"
        ? m.squareNote
        : m.textNote;

  return (
    <Screen>
      {header}
      <ShareModeSegments<TeamsShareMode>
        value={mode}
        onSelect={setMode}
        options={[
          { value: "story", label: m.story },
          { value: "square", label: m.square },
          { value: "text", label: m.text },
        ]}
      />
      <View style={{ gap: 10 }}>
        {mode === "text" ? (
          <Surface>
            <Text size="meta" selectable>
              {shareText}
            </Text>
          </Surface>
        ) : (
          <>
            <PreviewWell full={full}>
              {mode === "story" ? (
                <ScaledCanvas
                  canvasRef={storyRef}
                  canvasWidth={STORY_WIDTH}
                  canvasHeight={STORY_HEIGHT}
                >
                  <TeamsStoryCard model={model} />
                </ScaledCanvas>
              ) : (
                <ScaledCanvas
                  canvasRef={squareRef}
                  canvasWidth={SQUARE_SIZE}
                  canvasHeight={SQUARE_SIZE}
                >
                  <TeamsSquareCard model={model} />
                </ScaledCanvas>
              )}
            </PreviewWell>
            <PreviewMeta
              format={mode === "story" ? m.storySize : m.squareSize}
              action={{
                label: full ? share.fitToScreen : share.fullSize,
                icon: full ? Minimize2 : Maximize2,
                onPress: () => setFull((current) => !current),
              }}
            />
          </>
        )}
        <Surface padded={false}>
          <SwitchRow
            title={m.showLevels}
            sub={m.showLevelsHint}
            value={showLevels}
            onChange={setShowLevels}
          />
        </Surface>
        <Text size="meta" tone="muted">
          {note}
        </Text>
      </View>
      <View style={{ gap: 8 }}>
        {mode === "text" ? (
          <Button
            label={m.copyText}
            size="lg"
            icon={<Copy size={SHARE_ICON} color={colors.onControl} />}
            pending={pending === "copy_text"}
            disabled={pending != null}
            onPress={copyText}
          />
        ) : (
          <Button
            label={m.shareImage}
            size="lg"
            icon={<ShareIcon size={SHARE_ICON} color={colors.onControl} />}
            pending={pending === "share_image"}
            disabled={pending != null}
            onPress={shareImage}
          />
        )}
        <ActionTileRow>
          {mode === "text" ? null : (
            <ActionTile
              label={m.save}
              icon={ImageDown}
              pending={pending === "save"}
              disabled={pending != null}
              onPress={saveImage}
            />
          )}
          <ActionTile
            label={m.copyLink}
            icon={Link}
            pending={pending === "copy_link"}
            disabled={pending != null || !url}
            onPress={copyLink}
          />
          <ActionTile
            label={m.message}
            icon={MessageCircle}
            pending={pending === "message"}
            disabled={pending != null}
            onPress={sendMessage}
          />
        </ActionTileRow>
      </View>
    </Screen>
  );
}
