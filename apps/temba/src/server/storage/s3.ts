import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import { env } from "~/env";

export function createS3Client(): S3Client {
  return new S3Client({
    endpoint: env.AWS_ENDPOINT_URL,
    region: env.AWS_DEFAULT_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
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
  return env.AWS_S3_BUCKET_NAME;
}

export function isS3NotFoundError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const named = error as {
    name?: string;
    $metadata?: { httpStatusCode?: number };
  };
  if (named.name === "NoSuchKey" || named.name === "NotFound") {
    return true;
  }
  return named.$metadata?.httpStatusCode === 404;
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
    }),
  );
}

export async function getS3Object(
  key: string,
): Promise<{ body: Uint8Array; contentType: string | undefined } | null> {
  try {
    const output = await getS3Client().send(
      new GetObjectCommand({
        Bucket: getS3BucketName(),
        Key: key,
      }),
    );
    if (!output.Body) {
      return null;
    }
    return {
      body: await output.Body.transformToByteArray(),
      contentType: output.ContentType,
    };
  } catch (error) {
    if (isS3NotFoundError(error)) {
      return null;
    }
    throw error;
  }
}

export async function deleteS3Object(key: string): Promise<void> {
  await getS3Client().send(
    new DeleteObjectCommand({
      Bucket: getS3BucketName(),
      Key: key,
    }),
  );
}
