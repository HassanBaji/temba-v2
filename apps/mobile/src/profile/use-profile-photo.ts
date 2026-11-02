import { useUser } from "@clerk/expo";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useState } from "react";

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

const CAMERA_DENIED =
  "Allow camera access in Settings to take a photo, or choose one from your library.";
const UNREADABLE = "That photo could not be read. Try another one.";

/**
 * Picking and saving a profile photo, shared by the Profile tab and the
 * "Add a profile photo" task. `pickPhoto` resolves to `null` when the User
 * cancels; `savePhoto` writes to Clerk and reloads the user.
 */
export function useProfilePhoto() {
  const { user } = useUser();
  const [pending, setPending] = useState(false);

  const pickPhoto = useCallback(
    async (source: PhotoSource): Promise<PhotoResult<PickedPhoto | null>> => {
      setPending(true);
      try {
        if (source === "camera") {
          const permission = await ImagePicker.requestCameraPermissionsAsync();
          if (!permission.granted) {
            return { ok: false, message: CAMERA_DENIED };
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
          return { ok: false, message: UNREADABLE };
        }
        return {
          ok: true,
          value: {
            uri: asset.uri,
            dataUri: imageDataUri(asset.base64, asset.mimeType),
          },
        };
      } catch (error) {
        return { ok: false, message: photoErrorMessage(error) };
      } finally {
        setPending(false);
      }
    },
    [],
  );

  const savePhoto = useCallback(
    async (photo: PickedPhoto): Promise<PhotoResult<null>> => {
      if (!user) {
        return { ok: false, message: photoErrorMessage(null) };
      }
      setPending(true);
      try {
        await user.setProfileImage({ file: photo.dataUri });
        await user.reload();
        return { ok: true, value: null };
      } catch (error) {
        return { ok: false, message: photoErrorMessage(error) };
      } finally {
        setPending(false);
      }
    },
    [user],
  );

  return { pickPhoto, savePhoto, pending };
}
