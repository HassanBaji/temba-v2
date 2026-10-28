import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import { storageEnv } from "#src/storage/env";

export const MEDIA_CACHE_CONTROL = "public, max-age=31536000, immutable";

export function createS3Client(): S3Client {
  return new S3Client({
    endpoint: storageEnv.AWS_ENDPOINT_URL,
    region: storageEnv.AWS_DEFAULT_REGION,
    credentials: {
      accessKeyId: storageEnv.AWS_ACCESS_KEY_ID,
      secretAccessKey: storageEnv.AWS_SECRET_ACCESS_KEY,
    },
    forcePathStyle: false,
  });
}

let client: S3Client | undefined;

export function getS3Client(): S3Client {
  client ??= createS3Client();
  return client;
}

export function getS3BucketName(): string {
  return storageEnv.AWS_S3_BUCKET_NAME;
}

export async function putS3Object(input: {
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<void> {
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: getS3BucketName(),
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
      CacheControl: MEDIA_CACHE_CONTROL,
    }),
  );
}

export async function deleteS3Object(key: string): Promise<void> {
  await getS3Client().send(
    new DeleteObjectCommand({
      Bucket: getS3BucketName(),
      Key: key,
    }),
  );
}
