import { colors, radii } from "@repo/design-tokens";
import { isFootballRosterGame } from "@repo/domain/football-game-details";
import {
  formatResultShareMessage,
  resultShareCard,
} from "@repo/domain/game-result-share";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import type { Href } from "expo-router";
import * as Sharing from "expo-sharing";
import {
  Image as ImageIcon,
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
import { api } from "../trpc/react";
import { ActionTile, ActionTileRow } from "./share-actions";
import { SHARE_MODE_COPY, type ShareMode } from "./share-model";
import { ShareModeSegments } from "./share-mode-segments";
import { PhotoFrame, PreviewMeta, PreviewWell } from "./share-preview";
import { Sticker } from "./stickers";
import {
  STICKER_WIDTH,
  STORY_HEIGHT,
  STORY_WIDTH,
  ScaledCanvas,
} from "./story-canvas";
import { StoryCard } from "./story-cards";

type ShareAction = "save" | "share_image" | "copy_link" | "share_message";

const PERMISSION_REFUSED = "Allow Temba to add to your photos in Settings.";
const SHARING_UNAVAILABLE = "Sharing is not available on this device.";
const SHARE_ICON = 17;

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
  const toast = useToast();
  const [mode, setMode] = useState<ShareMode>("story");
  const [full, setFull] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
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
        ? resultShareCard(game.data, football ? (board.data ?? null) : null)
        : null,
    [game.data, board.data, football],
  );
  const url = link.data?.url ?? null;
  const fallback = `/games/${gameId}` as Href;
  const leave = useLeaveScreen(fallback);
  const header = (
    <ScreenHeader
      nav="back"
      fallback={fallback}
      title="Share result"
      actions={<HeaderTextButton label="Done" onPress={leave} />}
    />
  );

  if (isNotFoundError(game.error)) {
    return (
      <Screen>
        {header}
        <Notice
          title="Game not found"
          description="It may have been removed, or you may not have access."
        />
      </Screen>
    );
  }
  if (game.error || (football && board.error)) {
    return (
      <Screen>
        {header}
        <Notice
          title="Result could not be loaded"
          description={game.error?.message ?? board.error?.message ?? ""}
        />
      </Screen>
    );
  }
  if (!game.data || (football && !board.data)) {
    return (
      <Screen>
        {header}
        <View style={{ gap: 16 }} accessibilityLabel="Loading result">
          <Skeleton height={46} radius={radii.lg} />
          <Skeleton height={464} radius={radii.surface} />
          <Skeleton height={52} radius={radii.lg} />
        </View>
      </Screen>
    );
  }
  if (!card) {
    return (
      <Screen>
        {header}
        <Notice
          title="No result to share yet"
          description="Once the score is confirmed, the result card is ready here."
        />
      </Screen>
    );
  }

  const copy = SHARE_MODE_COPY[mode];

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
        toast.show(error instanceof Error ? error.message : "Could not share");
      })
      .finally(() => setPending(null));
  }

  const saveImage = () =>
    run("save", async () => {
      const permission = await MediaLibrary.requestPermissionsAsync(true);
      if (!permission.granted) {
        toast.show(PERMISSION_REFUSED);
        return;
      }
      await MediaLibrary.Asset.create(await capture());
      toast.show("Saved to Photos");
    });

  const shareImage = () =>
    run("share_image", async () => {
      if (!(await Sharing.isAvailableAsync())) {
        toast.show(SHARING_UNAVAILABLE);
        return;
      }
      await Sharing.shareAsync(await capture(), {
        mimeType: "image/png",
        UTI: "public.png",
        dialogTitle: "Share result",
      });
    });

  const copyLink = () =>
    run("copy_link", async () => {
      if (!url) {
        toast.show("The link is still loading");
        return;
      }
      await Clipboard.setStringAsync(url);
      toast.show("Link copied");
    });

  const shareMessage = () =>
    run("share_message", async () => {
      await Share.share({
        message: formatResultShareMessage(card, url ?? ""),
      });
    });

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    const asset = result.assets?.[0];
    if (!result.canceled && asset) {
      setPhotoUri(asset.uri);
    }
  }

  const sticker = (
    <ScaledCanvas
      canvasRef={stickerRef}
      canvasWidth={STICKER_WIDTH}
      onCanvasHeight={setStickerHeight}
    >
      <Sticker card={card} />
    </ScaledCanvas>
  );

  return (
    <Screen>
      {header}
      <ShareModeSegments value={mode} onSelect={setMode} />
      <View style={{ gap: 10 }}>
        <PreviewWell full={full}>
          {mode === "story" ? (
            <ScaledCanvas
              canvasRef={storyRef}
              canvasWidth={STORY_WIDTH}
              canvasHeight={STORY_HEIGHT}
            >
              <StoryCard card={card} />
            </ScaledCanvas>
          ) : (
            <PhotoFrame photoUri={photoUri}>{sticker}</PhotoFrame>
          )}
        </PreviewWell>
        <PreviewMeta
          format={copy.format}
          action={
            mode === "story"
              ? {
                  label: full ? "Fit to screen" : "Full size",
                  icon: full ? Minimize2 : Maximize2,
                  onPress: () => setFull((current) => !current),
                }
              : {
                  label: photoUri ? "Change photo" : "Try on a photo",
                  icon: ImageIcon,
                  onPress: () => void pickPhoto(),
                }
          }
        />
        {copy.note ? (
          <Text size="meta" tone="muted">
            {copy.note}
          </Text>
        ) : null}
      </View>
      <View style={{ gap: 8 }}>
        <Button
          label={copy.share}
          size="lg"
          icon={<ShareIcon size={SHARE_ICON} color={colors.paper} />}
          pending={pending === "share_image"}
          disabled={pending != null}
          onPress={shareImage}
        />
        <ActionTileRow>
          <ActionTile
            label={copy.save}
            icon={ImageDown}
            pending={pending === "save"}
            disabled={pending != null}
            onPress={saveImage}
          />
          <ActionTile
            label="Copy link"
            icon={Link}
            pending={pending === "copy_link"}
            disabled={pending != null || !url}
            onPress={copyLink}
          />
          <ActionTile
            label="Message"
            icon={MessageCircle}
            pending={pending === "share_message"}
            disabled={pending != null}
            onPress={shareMessage}
          />
        </ActionTileRow>
      </View>
    </Screen>
  );
}
