import { ENTITY_IMAGE_MAX_BYTES } from "@repo/domain/entity-image-file";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

import { base64ByteLength } from "../groups/group-image";
import { fitWithin, PHOTO_MAX_EDGE } from "./photo-size";

export type UploadPhoto = { contentType: "image/jpeg"; dataBase64: string };

const JPEG_QUALITIES = [0.82, 0.7, 0.58, 0.46];

/** Redraws a picked photo as a JPEG no longer than 2048 px on its long edge and under the 2 MB cap. */
export async function shrinkForUpload(photo: {
  uri: string;
  width: number;
  height: number;
}): Promise<UploadPhoto> {
  const size = fitWithin(photo.width, photo.height, PHOTO_MAX_EDGE);
  const image = await ImageManipulator.manipulate(photo.uri)
    .resize(size)
    .renderAsync();
  for (const compress of JPEG_QUALITIES) {
    const saved = await image.saveAsync({
      format: SaveFormat.JPEG,
      compress,
      base64: true,
    });
    if (
      saved.base64 &&
      base64ByteLength(saved.base64) <= ENTITY_IMAGE_MAX_BYTES
    ) {
      return { contentType: "image/jpeg", dataBase64: saved.base64 };
    }
  }
  throw new Error("Photo is too detailed to fit under the upload cap");
}
