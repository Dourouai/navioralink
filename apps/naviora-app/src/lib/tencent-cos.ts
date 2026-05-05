import COS from "cos-nodejs-sdk-v5";
import { getCredential, getPolicy } from "qcloud-cos-sts";

import { buildManagedAssetObjectPath, encodeObjectPathForUrl, type AssetUploadTicket, type ManagedAssetScope, type ManagedAssetVisibility } from "./managed-assets";

const secretId = process.env.TENCENT_COS_SECRET_ID?.trim();
const secretKey = process.env.TENCENT_COS_SECRET_KEY?.trim();
const region = process.env.TENCENT_COS_REGION?.trim();
const bucket = process.env.TENCENT_COS_BUCKET?.trim();
const publicBaseUrl = process.env.TENCENT_COS_PUBLIC_BASE_URL?.trim();
const stsDurationSeconds = Number.parseInt(process.env.TENCENT_COS_STS_DURATION_SECONDS?.trim() ?? "900", 10);

function normalizeDurationSeconds() {
  if (!Number.isFinite(stsDurationSeconds) || stsDurationSeconds <= 0) {
    return 900;
  }

  return Math.min(Math.max(stsDurationSeconds, 300), 7200);
}

export function hasTencentCosEnv() {
  return Boolean(secretId && secretKey && region && bucket);
}

export function getTencentCosEnv() {
  if (!secretId || !secretKey || !region || !bucket) {
    throw new Error(
      "Tencent COS environment variables are missing. Add TENCENT_COS_SECRET_ID, TENCENT_COS_SECRET_KEY, TENCENT_COS_REGION, and TENCENT_COS_BUCKET first.",
    );
  }

  return {
    secretId,
    secretKey,
    region,
    bucket,
    publicBaseUrl: publicBaseUrl || null,
    stsDurationSeconds: normalizeDurationSeconds(),
  };
}

export function buildCosPublicUrl(objectPath: string) {
  const env = getTencentCosEnv();
  const encodedPath = encodeObjectPathForUrl(objectPath);
  // Use the official COS origin by default for managed public assets.
  // Our custom domain can be switched back in later once its HTTPS certificate
  // and access policy are fully aligned with browser image loading.
  const base = `https://${env.bucket}.cos.${env.region}.myqcloud.com`;
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;

  return new URL(encodedPath, normalizedBase).toString();
}

export function buildManagedCosObjectPath(scope: ManagedAssetScope, userId: string, assetId: string, fileName: string) {
  return buildManagedAssetObjectPath(scope, userId, assetId, fileName);
}

export async function createCosUploadTicket(params: {
  scope: ManagedAssetScope;
  userId: string;
  assetId: string;
  fileName: string;
  visibility: ManagedAssetVisibility;
}): Promise<AssetUploadTicket> {
  const env = getTencentCosEnv();
  const objectPath = buildManagedCosObjectPath(params.scope, params.userId, params.assetId, params.fileName);
  const policy = getPolicy([
    {
      action: "name/cos:PutObject",
      bucket: env.bucket,
      region: env.region,
      prefix: objectPath,
    },
  ]);
  const credential = await getCredential({
    secretId: env.secretId,
    secretKey: env.secretKey,
    durationSeconds: env.stsDurationSeconds,
    policy,
  });

  return {
    assetId: params.assetId,
    bucket: env.bucket,
    region: env.region,
    objectPath,
    visibility: params.visibility,
    publicUrl: params.visibility === "public" ? buildCosPublicUrl(objectPath) : null,
    credentials: {
      tempSecretId: credential.credentials.tmpSecretId,
      tempSecretKey: credential.credentials.tmpSecretKey,
      sessionToken: credential.credentials.sessionToken,
      startTime: credential.startTime,
      expiredTime: credential.expiredTime,
    },
  };
}

export function createTencentCosNodeClient() {
  const env = getTencentCosEnv();

  return new COS({
    SecretId: env.secretId,
    SecretKey: env.secretKey,
    Protocol: "https",
  });
}
