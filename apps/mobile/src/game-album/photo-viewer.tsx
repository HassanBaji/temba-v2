import { radii, sizes } from "@repo/design-tokens";
import { photoTimeLabel, type GameAlbumPhoto } from "@repo/domain/game-album";
import { File, Paths } from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import { Download, Share, Trash2, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  useWindowDimensions,
  View,
  type ViewToken,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { CachedImage } from "../primitives/cached-image";
import { hairline } from "../primitives/hairline-width";
import { InitialsTile } from "../primitives/initials-tile";
import { Text } from "../primitives/text";
import { useToast } from "../primitives/toast";
import { useColors } from "../theme/theme-provider";

const BAR_BUTTON = 36;
const DOT = 5;
const ACTION_HEIGHT = 48;

async function downloaded(photo: GameAlbumPhoto) {
  const target = new File(Paths.cache, `game-photo-${photo.id}.jpg`);
  if (target.exists) {
    return target;
  }
  return File.downloadFileAsync(photo.url, target, { idempotent: true });
}

function BarButton({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => ({
        width: BAR_BUTTON,
        height: BAR_BUTTON,
        borderRadius: radii.md,
        backgroundColor: colors.controlRaised,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {children}
    </Pressable>
  );
}

function ActionButton({
  label,
  icon,
  filled,
  disabled,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  filled: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        height: ACTION_HEIGHT,
        borderRadius: radii.md,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: filled ? colors.controlRaised : colors.control,
        borderWidth: filled ? 0 : hairline,
        borderColor: colors.controlRule,
        opacity: disabled ? 0.5 : pressed ? 0.75 : 1,
      })}
    >
      {icon}
      <Text weight="semibold" style={{ color: colors.onControl }}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * A photo from the Album on black: counter and share at the top, dots under
 * the photo, who added it and when, Save, and Remove for the uploader and
 * the Organizer. Swipe through the six.
 */
export function PhotoViewer({
  photos,
  initialPhotoId,
  place,
  onClose,
  onRemove,
}: {
  photos: readonly GameAlbumPhoto[];
  initialPhotoId: string | null;
  /** "Tuesday Night Padel, Ace Padel". */
  place: string;
  onClose: () => void;
  onRemove: (photo: GameAlbumPhoto) => Promise<boolean>;
}) {
  const locale = useLocale();
  const colors = useColors();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const messages = useMessages();
  const m = messages.gameAlbum.viewer;
  const visible = initialPhotoId != null;
  const startIndex = Math.max(
    0,
    photos.findIndex((photo) => photo.id === initialPhotoId),
  );
  const [index, setIndex] = useState(startIndex);
  const [busy, setBusy] = useState(false);
  const onViewable = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (first?.index != null) {
        setIndex(first.index);
      }
    },
  ).current;

  useEffect(() => {
    if (visible) {
      setIndex(startIndex);
    }
  }, [visible, startIndex]);

  useEffect(() => {
    if (visible && photos.length === 0) {
      onClose();
    }
  }, [visible, photos.length, onClose]);

  const photo = photos[Math.min(index, photos.length - 1)];

  const run = async (task: () => Promise<void>) => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      await task();
    } catch {
      toast.show(messages.common.somethingWentWrong);
    } finally {
      setBusy(false);
    }
  };

  const save = () =>
    run(async () => {
      if (!photo) {
        return;
      }
      const permission = await MediaLibrary.requestPermissionsAsync(true);
      if (!permission.granted) {
        toast.show(m.saveDenied);
        return;
      }
      await MediaLibrary.Asset.create((await downloaded(photo)).uri);
      toast.show(m.saved);
    });

  const share = () =>
    run(async () => {
      if (!photo || !(await Sharing.isAvailableAsync())) {
        return;
      }
      await Sharing.shareAsync((await downloaded(photo)).uri, {
        mimeType: "image/jpeg",
        UTI: "public.jpeg",
      });
    });

  const remove = () => {
    if (!photo) {
      return;
    }
    Alert.alert(m.removeTitle, m.removeBody, [
      { text: m.cancel, style: "cancel" },
      {
        text: m.removeConfirm,
        style: "destructive",
        onPress: () =>
          void run(async () => {
            if (await onRemove(photo)) {
              toast.show(m.removed);
            }
          }),
      },
    ]);
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      supportedOrientations={["portrait"]}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: colors.control,
          paddingTop: insets.top + 8,
          paddingBottom: Math.max(insets.bottom, 16),
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
          }}
        >
          <BarButton label={m.close} onPress={onClose}>
            <X size={sizes.iconRow} color={colors.onControl} />
          </BarButton>
          <Text
            size="eyebrow"
            accessibilityLiveRegion="polite"
            style={{ color: colors.onControlMuted }}
          >
            {photos.length > 0 ? m.counter(index + 1, photos.length) : ""}
          </Text>
          <BarButton label={m.share} onPress={() => void share()}>
            <Share size={sizes.iconRow} color={colors.onControl} />
          </BarButton>
        </View>

        <FlatList
          data={photos}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={startIndex}
          getItemLayout={(_, itemIndex) => ({
            length: width,
            offset: width * itemIndex,
            index: itemIndex,
          })}
          onViewableItemsChanged={onViewable}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          style={{ flex: 1 }}
          renderItem={({ item, index: itemIndex }) => (
            <View
              accessible
              accessibilityRole="image"
              accessibilityLabel={m.photo(itemIndex + 1, photos.length)}
              style={{ width, flex: 1, justifyContent: "center" }}
            >
              <CachedImage
                uri={item.url}
                contentFit="contain"
                style={{ width, height: "100%" }}
              />
            </View>
          )}
        />

        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            flexDirection: "row",
            justifyContent: "center",
            gap: 5,
            paddingVertical: 14,
          }}
        >
          {photos.map((item, dotIndex) => (
            <View
              key={item.id}
              style={{
                width: dotIndex === index ? DOT * 3 : DOT,
                height: DOT,
                borderRadius: DOT / 2,
                backgroundColor:
                  dotIndex === index ? colors.onControl : colors.controlRule,
              }}
            />
          ))}
        </View>

        {photo ? (
          <View style={{ paddingHorizontal: 16, gap: 14 }}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <InitialsTile
                name={photo.uploader.name}
                uri={photo.uploader.image}
                size="md"
                tone="inverse"
              />
              <View style={{ flex: 1 }}>
                <Text weight="semibold" style={{ color: colors.onControl }}>
                  {photo.isMine ? m.youAdded : m.added(photo.uploader.name)}
                </Text>
                <Text
                  size="eyebrow"
                  numberOfLines={2}
                  style={{ color: colors.onControlMuted }}
                >
                  {m.meta(photoTimeLabel(photo.createdAt, locale), place)}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <ActionButton
                label={m.save}
                filled
                disabled={busy}
                icon={
                  <Download size={sizes.iconRow} color={colors.onControl} />
                }
                onPress={() => void save()}
              />
              {photo.canRemove ? (
                <ActionButton
                  label={m.remove}
                  filled={false}
                  disabled={busy}
                  icon={
                    <Trash2 size={sizes.iconRow} color={colors.onControl} />
                  }
                  onPress={remove}
                />
              ) : null}
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
