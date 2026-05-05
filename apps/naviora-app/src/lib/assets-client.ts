"use client";

import COS from "cos-js-sdk-v5";

import type { AssetUploadTicket, ManagedAssetRecord, ManagedAssetScope } from "./managed-assets";

type JsonErrorResponse = {
  message?: string;
};

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as JsonErrorResponse & T;

  if (!response.ok) {
    throw new Error(payload.message || "The asset request failed.");
  }

  return payload as T;
}

export async function listManagedAssets() {
  const response = await fetch("/api/assets/list", {
    method: "GET",
    cache: "no-store",
  });

  return parseJsonResponse<{ assets: ManagedAssetRecord[] }>(response);
}

async function requestUploadTicket(file: File, scope: ManagedAssetScope) {
  const response = await fetch("/api/assets/upload-ticket", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
      scope,
    }),
  });

  return parseJsonResponse<{ ticket: AssetUploadTicket }>(response);
}

async function finalizeUpload(params: {
  ticket: AssetUploadTicket;
  file: File;
  scope: ManagedAssetScope;
}) {
  const response = await fetch("/api/assets/complete", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      assetId: params.ticket.assetId,
      objectPath: params.ticket.objectPath,
      fileName: params.file.name,
      mimeType: params.file.type,
      scope: params.scope,
    }),
  });

  return parseJsonResponse<{ asset: ManagedAssetRecord }>(response);
}

export async function uploadManagedAsset(params: {
  file: File;
  scope: ManagedAssetScope;
  onProgress?: (percent: number) => void;
}) {
  const { ticket } = await requestUploadTicket(params.file, params.scope);
  const cos = new COS({
    SecretId: ticket.credentials.tempSecretId,
    SecretKey: ticket.credentials.tempSecretKey,
    SecurityToken: ticket.credentials.sessionToken,
    StartTime: ticket.credentials.startTime,
    ExpiredTime: ticket.credentials.expiredTime,
    Protocol: "https",
  });

  await cos.putObject({
    Bucket: ticket.bucket,
    Region: ticket.region,
    Key: ticket.objectPath,
    Body: params.file,
    ContentType: params.file.type,
    onProgress: (progress) => {
      params.onProgress?.(Math.round(progress.percent * 100));
    },
  });

  const { asset } = await finalizeUpload({
    ticket,
    file: params.file,
    scope: params.scope,
  });

  return asset;
}

export async function deleteManagedAsset(assetId: string) {
  const response = await fetch("/api/assets/delete", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      assetId,
    }),
  });

  await parseJsonResponse<{ success: boolean }>(response);
}

export async function renameManagedAsset(assetId: string, name: string) {
  const response = await fetch("/api/assets/rename", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      assetId,
      name,
    }),
  });

  return parseJsonResponse<{ asset: ManagedAssetRecord }>(response);
}
