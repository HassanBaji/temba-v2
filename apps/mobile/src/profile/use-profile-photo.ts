import { useUser } from "@clerk/expo";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useState } from "react";

import { fitWithin } from "../game-album/photo-size";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { imageDataUri, photoErrorMessage } from "./photo";

export type PhotoSource = "camera" | "library";

export type PickedPhoto = { uri: string; dataUri: string };

export type PhotoResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string };

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 1,
};

/** Matches the web: the largest place a profile photo shows is 160 pt, at 3x. */
const PROFILE_PHOTO_EDGE = 512;
const JPEG_COMPRESS = 0.86;

/** Redraws the square the User framed as a JPEG at most 512 px a side. */
async function shrinkProfilePhoto(asset: {
  uri: string;
  width: number;
  height: number;
}): Promise<PickedPhoto | null> {
  const image = await ImageManipulator.manipulate(asset.uri)
    .resize(fitWithin(asset.width, asset.height, PROFILE_PHOTO_EDGE))
    .renderAsync();
  const saved = await image.saveAsync({
    format: SaveFormat.JPEG,
    compress: JPEG_COMPRESS,
    base64: true,
  });
  return saved.base64
    ? { uri: saved.uri, dataUri: imageDataUri(saved.base64, "image/jpeg") }
    : null;
}

/**
 * Picking and saving a profile photo, shared by the Profile tab and the
 * "Add a profile photo" task. `pickPhoto` resolves to `null` when the User
 * cancels; `savePhoto` writes to Clerk and reloads the user.
 */
export function useProfilePhoto() {
  const m = useMessages();
  const locale = useLocale();
  const { user } = useUser();
  const [pending, setPending] = useState(false);

  const pickPhoto = useCallback(
    async (source: PhotoSource): Promise<PhotoResult<PickedPhoto | null>> => {
      setPending(true);
      try {
        if (source === "camera") {
          const permission = await ImagePicker.requestCameraPermissionsAsync();
          if (!permission.granted) {
            return { ok: false, message: m.mobileHome.photo.cameraDenied };
          }
        }
        const result =
          source === "camera"
            ? await ImagePicker.launchCameraAsync(PICKER_OPTIONS)
            : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
        const asset = result.canceled ? null : result.assets[0];
        if (!asset) {
          return { ok: true, value: null };
        }
        const photo = await shrinkProfilePhoto(asset);
        if (!photo) {
          return { ok: false, message: m.mobileHome.photo.unreadable };
        }
        return { ok: true, value: photo };
      } catch (error) {
        return { ok: false, message: photoErrorMessage(error, locale) };
      } finally {
        setPending(false);
      }
    },
    [locale, m],
  );

  const savePhoto = useCallback(
    async (photo: PickedPhoto): Promise<PhotoResult<null>> => {
      if (!user) {
        return { ok: false, message: photoErrorMessage(null, locale) };
      }
      setPending(true);
      try {
        await user.setProfileImage({ file: photo.dataUri });
        await user.reload();
        return { ok: true, value: null };
      } catch (error) {
        return { ok: false, message: photoErrorMessage(error, locale) };
      } finally {
        setPending(false);
      }
    },
    [locale, user],
  );

  return { pickPhoto, savePhoto, pending };
}
