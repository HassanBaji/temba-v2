import { radii } from "@repo/design-tokens";
import { bibNames } from "@repo/domain/football-board";
import {
  draftShareCard,
  draftShareMessage,
  draftShareNote,
  type DraftShareMode,
} from "@repo/domain/football-draft-share";
import { isFootballRosterGame } from "@repo/domain/football-game-details";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import * as Clipboard from "expo-clipboard";
import * as MediaLibrary from "expo-media-library";
import type { Href } from "expo-router";
import * as Sharing from "expo-sharing";
import {
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
import { DraftStoryCard } from "./draft-cards";

type ShareAction = "save" | "share_image" | "copy_link" | "share_message";

const SHARE_ICON = 17;

export function shareDraftPath(gameId: string) {
  return `/games/${gameId}/share-draft` as Href;
}

function Notice({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Surface accessibilityRole="alert" style={{ gap: 8 }}>
      <Text size="lead" weight="semibold">
        {title}
      </Text>
      <Text size="meta" tone="muted">
        {description}
      </Text>
    </Surface>
  );
}

/**
 * Share draft (design 3a): the Draft line-up as a Draft card for both teams
 * or one, with Share image, Save, Copy link and Message. Only an Organizer
 * or a Side captain reads a draft; anyone else gets the empty state.
 */
export function ShareDraftScreen({ gameId }: { gameId: string }) {
  const colors = useColors();
  const locale = useLocale();
  const messages = useMessages();
  const m = messages.football.draftShare;
  const share = messages.mobilePlayer.share;
  const toast = useToast();
  const errorText = useErrorMessage();
  const [mode, setMode] = useState<DraftShareMode>("both");
  const [full, setFull] = useState(false);
  const [pending, setPending] = useState<ShareAction | null>(null);
  const storyRef = useRef<View | null>(null);

  const game = api.games.byId.useQuery({ id: gameId });
  const football = game.data != null && isFootballRosterGame(game.data);
  const board = api.games.footballBoard.useQuery(
    { gameId },
    { enabled: football },
  );
  const link = api.games.resultLink.useQuery({ gameId });

  const card = useMemo(
    () =>
      game.data && football
        ? draftShareCard(game.data, board.data ?? null, mode, locale)
        : null,
    [game.data, board.data, football, mode, locale],
  );
  const url = link.data?.url ?? null;
  const fallback = `/games/${gameId}` as Href;
  const leave = useLeaveScreen(fallback);
  const header = (
    <ScreenHeader
      nav="back"
      fallback={fallback}
      title={m.title}
      actions={
        <HeaderTextButton label={messages.common.done} onPress={leave} />
      }
    />
  );

  if (isNotFoundError(game.error) || isNotFoundError(board.error)) {
    return (
      <Screen>
        {header}
        <Notice
          title={share.gameNotFound}
          description={share.gameNotFoundDescription}
        />
      </Screen>
    );
  }
  if (game.error || (football && board.error)) {
    return (
      <Screen>
        {header}
        <Notice
          title={m.loadError}
          description={game.error?.message ?? board.error?.message ?? ""}
        />
      </Screen>
    );
  }
  if (!game.data || (football && !board.data)) {
    return (
      <Screen>
        {header}
        <View style={{ gap: 16 }} accessibilityLabel={m.loading}>
          <Skeleton height={46} radius={radii.lg} />
          <Skeleton height={464} radius={radii.surface} />
          <Skeleton height={52} radius={radii.lg} />
        </View>
      </Screen>
    );
  }
  const draft = board.data?.draft ?? null;
  if (!card || !draft) {
    return (
      <Screen>
        {header}
        <Notice title={m.empty.title} description={m.empty.body} />
      </Screen>
    );
  }

  const details = game.data;
  const names = bibNames(draft.bibs, locale);

  function capture() {
    return captureRef(storyRef, {
      format: "png",
      quality: 1,
      result: "tmpfile",
      width: STORY_WIDTH,
      height: STORY_HEIGHT,
    });
  }

  function run(action: ShareAction, task: () => Promise<void>) {
    if (pending) {
      return;
    }
    setPending(action);
    void task()
      .catch((error: unknown) => {
        toast.show(
          error instanceof Error ? errorText(error) : share.couldNotShare,
        );
      })
      .finally(() => setPending(null));
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
        dialogTitle: m.title,
      });
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

  const shareMessage = () =>
    run("share_message", async () => {
      if (!url) {
        toast.show(share.linkStillLoading);
        return;
      }
      await Share.share({
        message: draftShareMessage(details, url, locale),
      });
    });

  return (
    <Screen>
      {header}
      <ShareModeSegments<DraftShareMode>
        value={mode}
        onSelect={setMode}
        options={[
          { value: "both", label: m.bothTeams },
          { value: "slot1", label: names.slot1 },
          { value: "slot2", label: names.slot2 },
        ]}
      />
      <View style={{ gap: 10 }}>
        <PreviewWell full={full}>
          <ScaledCanvas
            canvasRef={storyRef}
            canvasWidth={STORY_WIDTH}
            canvasHeight={STORY_HEIGHT}
          >
            <DraftStoryCard card={card} />
          </ScaledCanvas>
        </PreviewWell>
        <PreviewMeta
          format={share.storyFormat}
          action={{
            label: full ? share.fitToScreen : share.fullSize,
            icon: full ? Minimize2 : Maximize2,
            onPress: () => setFull((current) => !current),
          }}
        />
        <Text size="meta" tone="muted" accessibilityLiveRegion="polite">
          {draftShareNote(mode, draft.bibs, details, locale)}
        </Text>
      </View>
      <View style={{ gap: 8 }}>
        <Button
          label={share.shareImage}
          size="lg"
          icon={<ShareIcon size={SHARE_ICON} color={colors.onControl} />}
          pending={pending === "share_image"}
          disabled={pending != null}
          onPress={shareImage}
        />
        <ActionTileRow>
          <ActionTile
            label={messages.common.save}
            icon={ImageDown}
            pending={pending === "save"}
            disabled={pending != null}
            onPress={saveImage}
          />
          <ActionTile
            label={share.copyLink}
            icon={Link}
            pending={pending === "copy_link"}
            disabled={pending != null || !url}
            onPress={copyLink}
          />
          <ActionTile
            label={share.message}
            icon={MessageCircle}
            pending={pending === "share_message"}
            disabled={pending != null || !url}
            onPress={shareMessage}
          />
        </ActionTileRow>
      </View>
    </Screen>
  );
}
