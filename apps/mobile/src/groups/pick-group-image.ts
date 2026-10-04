import * as ImagePicker from "expo-image-picker";

import { pickedImage, type PickedImage } from "./group-image";

export type PickedGroupImage = { uri: string; image: PickedImage };

export async function pickGroupImage(): Promise<PickedGroupImage | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.8,
    base64: true,
  });
  const asset = result.canceled ? null : result.assets[0];
  if (!asset) {
    return null;
  }
  return { uri: asset.uri, image: pickedImage(asset) };
}
