import { radii, sizes } from "@repo/design-tokens";
import {
  albumCaption,
  albumCountLabel,
  albumTiles,
  type AlbumTile,
  type GameAlbum,
} from "@repo/domain/game-album";
import { Plus } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { CachedImage } from "../primitives/cached-image";
import { Hatch } from "../primitives/hatch";
import { InitialsTile } from "../primitives/initials-tile";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import { SectionHeading } from "./section-heading";

const GAP = 6;
const COLUMNS = 3;
const BADGE_INSET = 6;

function PhotoTile({
  tile,
  onPress,
}: {
  tile: Extract<AlbumTile, { kind: "photo" }>;
  onPress: () => void;
}) {
  const m = useMessages().gameAlbum;
  const { photo } = tile;
  return (
    <Pressable
      accessibilityRole="imagebutton"
      accessibilityLabel={
        photo.isMine ? m.album.photoByYou : m.album.photoBy(photo.uploader.name)
      }
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        borderRadius: radii.md,
        overflow: "hidden",
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <CachedImage
        uri={photo.url}
        contentFit="cover"
        style={{ width: "100%", height: "100%" }}
      />
      <View
        style={{
          position: "absolute",
          start: BADGE_INSET,
          bottom: BADGE_INSET,
        }}
      >
        <InitialsTile
          name={photo.uploader.name}
          size="2xs"
          tone={photo.isMine ? "control" : "inverse"}
        />
      </View>
    </Pressable>
  );
}

function AddTile({
  primary,
  onPress,
}: {
  primary: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const m = useMessages().gameAlbum;
  if (primary) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={m.album.addPhotos}
        onPress={onPress}
        style={({ pressed }) => ({
          flex: 1,
          borderRadius: radii.md,
          backgroundColor: colors.control,
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Plus size={sizes.iconRow} color={colors.onControl} />
        <Text
          size="eyebrow"
          weight="semibold"
          style={{ color: colors.onControl }}
        >
          {m.album.addPhotos}
        </Text>
      </Pressable>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={m.album.addPhoto}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Hatch radius={radii.md} />
      <Plus size={sizes.iconRow} color={colors.muted} />
    </Pressable>
  );
}

function EmptyTile() {
  const m = useMessages().gameAlbum;
  return (
    <View accessible accessibilityLabel={m.album.emptySlot} style={{ flex: 1 }}>
      <Hatch radius={radii.md} />
    </View>
  );
}

/** Six tiles, three by two: photos from the start, hatched where empty, the plus while you may add. */
export function AlbumSection({
  album,
  onAdd,
  onOpenPhoto,
}: {
  album: GameAlbum;
  onAdd: () => void;
  onOpenPhoto: (photoId: string) => void;
}) {
  const locale = useLocale();
  const m = useMessages().gameAlbum;
  const tiles = albumTiles(album.photos, album.viewer.canAddPhotos);
  const rows = [tiles.slice(0, COLUMNS), tiles.slice(COLUMNS)];

  return (
    <View style={{ gap: 12 }}>
      <SectionHeading
        title={m.album.title}
        count={albumCountLabel(album.photos.length, locale)}
      />
      <View style={{ gap: GAP }}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={{ flexDirection: "row", gap: GAP }}>
            {row.map((tile, index) => (
              <View
                key={
                  tile.kind === "photo"
                    ? tile.photo.id
                    : `slot-${rowIndex}-${index}`
                }
                style={{ flex: 1, aspectRatio: 1 }}
              >
                {tile.kind === "photo" ? (
                  <PhotoTile
                    tile={tile}
                    onPress={() => onOpenPhoto(tile.photo.id)}
                  />
                ) : tile.kind === "add" ? (
                  <AddTile primary={tile.primary} onPress={onAdd} />
                ) : (
                  <EmptyTile />
                )}
              </View>
            ))}
          </View>
        ))}
      </View>
      <Text size="eyebrow" tone="muted">
        {albumCaption(album, locale)}
      </Text>
    </View>
  );
}
