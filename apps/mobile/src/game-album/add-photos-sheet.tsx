import { radii } from "@repo/design-tokens";
import { GAME_ALBUM_SLOTS } from "@repo/domain/game-album";
import { Camera, Images } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Image, Pressable, View } from "react-native";

import { useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { Sheet } from "../primitives/sheet";
import { Text } from "../primitives/text";
import { useToast } from "../primitives/toast";
import { useColors } from "../theme/theme-provider";
import type { GameAlbumController, PickedPhoto } from "./use-game-album";

const ICON = 16;
const GAP = 6;
const COLUMNS = 3;
const BADGE = 20;

/**
 * Take a photo or pick from the library, up to the slots left. Picks show
 * numbered in the order they will land; tap one to drop it.
 */
export function AddPhotosSheet({
  visible,
  album,
  onClose,
}: {
  visible: boolean;
  album: GameAlbumController;
  onClose: () => void;
}) {
  const colors = useColors();
  const toast = useToast();
  const m = useMessages().gameAlbum.add;
  const room = album.data?.viewer.room ?? 0;
  const [picks, setPicks] = useState<PickedPhoto[]>([]);

  useEffect(() => {
    if (!visible) {
      setPicks([]);
    }
  }, [visible]);

  const left = room - picks.length;

  const pick = async (source: "camera" | "library") => {
    const found = await album.pick(source, Math.max(left, 1));
    if (found.length === 0) {
      return;
    }
    if (found.length > left) {
      toast.show(m.tooMany(left));
    }
    setPicks((current) => [...current, ...found].slice(0, room));
  };

  const submit = async () => {
    if (await album.addPhotos(picks)) {
      onClose();
    }
  };

  const rows: PickedPhoto[][] = [];
  for (let index = 0; index < picks.length; index += COLUMNS) {
    rows.push(picks.slice(index, index + COLUMNS));
  }
  const uploading = album.progress;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={m.title}
      subtitle={m.subtitle(room, GAME_ALBUM_SLOTS)}
      closeButton
      footer={
        <Button
          label={
            uploading
              ? m.uploading(uploading.done + 1, uploading.total)
              : picks.length > 0
                ? m.submit(picks.length)
                : m.pickFirst
          }
          size="lg"
          pending={uploading != null}
          disabled={picks.length === 0}
          onPress={() => void submit()}
        />
      }
    >
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button
            label={m.takePhoto}
            variant="outline"
            disabled={left <= 0 || uploading != null}
            icon={<Camera size={ICON} color={colors.ink} />}
            onPress={() => void pick("camera")}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label={m.library}
            variant="outline"
            disabled={left <= 0 || uploading != null}
            icon={<Images size={ICON} color={colors.ink} />}
            onPress={() => void pick("library")}
          />
        </View>
      </View>
      {rows.length > 0 ? (
        <View style={{ gap: GAP }}>
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={{ flexDirection: "row", gap: GAP }}>
              {Array.from({ length: COLUMNS }, (_, column) => {
                const photo = row[column];
                const order = rowIndex * COLUMNS + column + 1;
                return (
                  <View key={column} style={{ flex: 1, aspectRatio: 1 }}>
                    {photo ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${order}. ${m.remove}`}
                        disabled={uploading != null}
                        onPress={() =>
                          setPicks((current) =>
                            current.filter((item) => item !== photo),
                          )
                        }
                        style={{
                          flex: 1,
                          borderRadius: radii.md,
                          borderWidth: 2,
                          borderColor: colors.ink,
                          overflow: "hidden",
                        }}
                      >
                        <Image
                          source={{ uri: photo.uri }}
                          resizeMode="cover"
                          style={{ width: "100%", height: "100%" }}
                        />
                        <View
                          style={{
                            position: "absolute",
                            top: 6,
                            end: 6,
                            width: BADGE,
                            height: BADGE,
                            borderRadius: BADGE / 2,
                            backgroundColor: colors.control,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text
                            size="eyebrow"
                            weight="semibold"
                            style={{ color: colors.onControl }}
                          >
                            {String(order)}
                          </Text>
                        </View>
                      </Pressable>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      ) : null}
      <Text size="eyebrow" tone="muted">
        {m.footnote}
      </Text>
    </Sheet>
  );
}
