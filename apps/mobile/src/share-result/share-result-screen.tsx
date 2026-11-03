import { colors, radii } from "@repo/design-tokens";
import { isFootballRosterGame } from "@repo/domain/football-game-details";
import {
  formatResultShareMessage,
  resultShareCard,
} from "@repo/domain/game-result-share";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import type { Href } from "expo-router";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import {
  ImageDown,
  Link,
  MessageSquare,
  Share as ShareIcon,
} from "lucide-react-native";
import { useMemo, useRef, useState } from "react";
import { Platform, Share, View } from "react-native";
import { captureRef } from "react-native-view-shot";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { SheetMenu, SheetMenuRow } from "../primitives/sheet-menu";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";
import { shareModeHint, type ShareMode } from "./share-model";
import { ShareModeSegments } from "./share-mode-segments";
import { Sticker } from "./stickers";
import {
  STICKER_WIDTH,
  STORY_HEIGHT,
  STORY_WIDTH,
  ScaledCanvas,
} from "./story-canvas";
import { StoryCard } from "./story-cards";

type ShareAction = "save" | "share_image" | "share_link" | "share_message";

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

export function ShareResultScreen({ gameId }: { gameId: string }) {
  const locale = useLocale();
  const m = useMessages();
  const share = m.mobilePlayer.share;
  const toast = useToast();
  const [mode, setMode] = useState<ShareMode>("story");
  const [stickerHeight, setStickerHeight] = useState(0);
  const [pending, setPending] = useState<ShareAction | null>(null);
  const storyRef = useRef<View | null>(null);
  const stickerRef = useRef<View | null>(null);

  const game = api.games.byId.useQuery({ id: gameId });
  const football = game.data != null && isFootballRosterGame(game.data);
  const board = api.games.footballBoard.useQuery(
    { gameId },
    { enabled: football },
  );
  const link = api.games.resultLink.useQuery({ gameId });

  const card = useMemo(
    () =>
      game.data
        ? resultShareCard(
            game.data,
            football ? (board.data ?? null) : null,
            locale,
          )
        : null,
    [game.data, board.data, football, locale],
  );
  const url = link.data?.url ?? null;
  const fallback = `/games/${gameId}` as Href;
  const header = (
    <ScreenHeader
      nav="back"
      fallback={fallback}
      title={m.game.cta.shareResult}
    />
  );

  if (isNotFoundError(game.error)) {
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
          title={share.loadError}
          description={game.error?.message ?? board.error?.message ?? ""}
        />
      </Screen>
    );
  }
  if (!game.data || (football && !board.data)) {
    return (
      <Screen>
        {header}
        <View style={{ gap: 16 }} accessibilityLabel={share.loading}>
          <Skeleton height={44} radius={radii.lg} />
          <Skeleton height={420} radius={radii.surface} />
        </View>
      </Screen>
    );
  }
  if (!card) {
    return (
      <Screen>
        {header}
        <Notice
          title={share.noResultYet}
          description={share.noResultYetDescription}
        />
      </Screen>
    );
  }

  async function capture() {
    if (mode === "story") {
      return captureRef(storyRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
        width: STORY_WIDTH,
        height: STORY_HEIGHT,
      });
    }
    return captureRef(stickerRef, {
      format: "png",
      quality: 1,
      result: "tmpfile",
      width: STICKER_WIDTH,
      height: Math.round(stickerHeight),
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
          error instanceof Error ? error.message : share.couldNotShare,
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
        dialogTitle: m.game.cta.shareResult,
      });
    });

  const shareLink = () =>
    run("share_link", async () => {
      if (!url) {
        toast.show(share.linkStillLoading);
        return;
      }
      await Share.share(Platform.OS === "ios" ? { url } : { message: url });
    });

  const shareMessage = () =>
    run("share_message", async () => {
      await Share.share({
        message: formatResultShareMessage(card, url ?? "", locale),
      });
    });

  return (
    <Screen>
      {header}
      <ShareModeSegments value={mode} onSelect={setMode} />
      <View style={{ gap: 10 }}>
        <View
          style={{
            borderRadius: radii.surface,
            overflow: "hidden",
            backgroundColor: mode === "sticker" ? colors.wash : colors.ink,
            padding: mode === "sticker" ? 16 : 0,
          }}
        >
          {mode === "story" ? (
            <ScaledCanvas
              canvasRef={storyRef}
              canvasWidth={STORY_WIDTH}
              canvasHeight={STORY_HEIGHT}
            >
              <StoryCard card={card} />
            </ScaledCanvas>
          ) : (
            <ScaledCanvas
              canvasRef={stickerRef}
              canvasWidth={STICKER_WIDTH}
              onCanvasHeight={setStickerHeight}
            >
              <Sticker card={card} />
            </ScaledCanvas>
          )}
        </View>
        <Text size="meta" tone="muted">
          {shareModeHint(mode, locale)}
        </Text>
      </View>
      <SheetMenu>
        <SheetMenuRow
          label={
            mode === "story" ? share.saveToPhotos : share.saveStickerToPhotos
          }
          hint={share.saveHint}
          icon={ImageDown}
          pending={pending === "save"}
          disabled={pending != null}
          onPress={saveImage}
        />
        <SheetMenuRow
          label={share.shareImage}
          hint={share.shareImageHint}
          icon={ShareIcon}
          pending={pending === "share_image"}
          disabled={pending != null}
          onPress={shareImage}
        />
        <SheetMenuRow
          label={share.shareLink}
          hint={share.shareLinkHint}
          icon={Link}
          pending={pending === "share_link"}
          disabled={pending != null || !url}
          onPress={shareLink}
        />
        <SheetMenuRow
          label={share.shareAsMessage}
          hint={share.shareAsMessageHint}
          icon={MessageSquare}
          pending={pending === "share_message"}
          disabled={pending != null}
          onPress={shareMessage}
        />
      </SheetMenu>
    </Screen>
  );
}
