import { useUser } from "@clerk/expo";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useState } from "react";

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
  quality: 0.7,
  base64: true,
};

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
        if (!asset.base64) {
          return { ok: false, message: m.mobileHome.photo.unreadable };
        }
        return {
          ok: true,
          value: {
            uri: asset.uri,
            dataUri: imageDataUri(asset.base64, asset.mimeType),
          },
        };
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
