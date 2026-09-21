// Copyright (c) 2026 WSO2 LLC. (https://www.wso2.com).
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

// The source app fetches attachment bytes via the Asgardeo SDK's httpRequest
// with `responseType: 'arraybuffer'` — a shape useSplApi.ts's JSON-oriented
// performRequest doesn't cover. Small, self-contained fetch helper instead of
// widening that shared hook for one binary case used only here (the download
// button in AttachmentBox) and in useInlineAttachmentImages (inline comment
// images, resolved the same way).
import { useCallback } from "react";
import { useAccessToken } from "@hooks/useAccessToken";
import { isSplBackendConfigured, splBackendUrl } from "@config/apiConfig";
import { mockSplRequest } from "@features/spl/api/splMockApi";

async function fetchAttachmentBuffer(
  attachmentId: string,
  getAccessToken: () => Promise<string>,
): Promise<{ buffer: ArrayBuffer; contentType: string }> {
  const url = `${splBackendUrl}/attachments/${encodeURIComponent(attachmentId)}/download`;

  if (!isSplBackendConfigured()) {
    const text = mockSplRequest("GET", url) as string;
    const buffer = new TextEncoder().encode(text).buffer;
    return { buffer, contentType: "text/plain" };
  }

  const token = await getAccessToken();
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Failed to download attachment (HTTP ${response.status})`);
  return {
    buffer: await response.arrayBuffer(),
    contentType: response.headers.get("content-type") ?? "application/octet-stream",
  };
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export function useAttachmentDownload() {
  const getAccessToken = useAccessToken();

  const downloadAttachment = useCallback(
    async (attachmentId: string, fileName: string) => {
      const { buffer, contentType } = await fetchAttachmentBuffer(attachmentId, getAccessToken);
      const blob = new Blob([buffer], { type: contentType });
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(href);
    },
    [getAccessToken],
  );

  const fetchAttachmentDataUrl = useCallback(
    async (attachmentId: string): Promise<string> => {
      const { buffer, contentType } = await fetchAttachmentBuffer(attachmentId, getAccessToken);
      return `data:${contentType};base64,${arrayBufferToBase64(buffer)}`;
    },
    [getAccessToken],
  );

  return { downloadAttachment, fetchAttachmentDataUrl };
}
