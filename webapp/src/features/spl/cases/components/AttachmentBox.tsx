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

// Ported from the source app's components/AttachmentBox.tsx.
import { useEffect } from "react";
import { Box, Stack, Tooltip, Typography } from "@mui/material";
import ErrorIcon from "@mui/icons-material/Error";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import { useGetApi } from "@features/spl/api/useSplApi";
import { splBackendUrl } from "@config/apiConfig";
import { useSplPermissions } from "@features/spl/api/useSplPermissions";
import { useAttachmentDownload } from "../api/useAttachmentDownload";
import type { AttachmentDetails } from "../api/splCaseTypes";
import { LinearLoadingPanel } from "./StatePanels";

export function AttachmentBox({ caseId }: { caseId: string | undefined }) {
  const apiUrl = `${splBackendUrl}/cases/${caseId}/attachments-info?offset=0&limit=10`;
  const { data, loading, error, getApiData } = useGetApi<AttachmentDetails[]>({
    url: apiUrl,
    headers: { accept: "application/json" },
  });
  const { isUserAllowedtoDownloadAttachments } = useSplPermissions();
  const { downloadAttachment } = useAttachmentDownload();

  useEffect(() => {
    getApiData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  if (loading) return <LinearLoadingPanel />;
  if (error) {
    return (
      <Stack direction="row" alignItems="center" spacing={1} sx={{ color: "error.main" }}>
        <ErrorIcon color="error" />
        <Typography color="error" variant="body1">
          error while loading attachments!
        </Typography>
      </Stack>
    );
  }
  if (!data) return null;
  if (data.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No attachments
      </Typography>
    );
  }

  return (
    <Stack spacing={1}>
      {data.map((item, index) =>
        isUserAllowedtoDownloadAttachments ? (
          <Box
            key={index}
            sx={{ cursor: "pointer", p: 1, borderRadius: 1, "&:hover": { backgroundColor: "action.hover" } }}
            onClick={() => downloadAttachment(item.sysId, item.fileName)}
          >
            <Typography variant="body2" fontWeight={600}>
              {item.fileName}
            </Typography>
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: "text.secondary" }}>
              <AccessTimeIcon fontSize="small" />
              <Typography variant="caption">{new Date(item.createdOn + "Z").toLocaleString()}</Typography>
            </Stack>
          </Box>
        ) : (
          <Tooltip key={index} title="You don't have permission to download this file">
            <Box sx={{ p: 1, opacity: 0.6 }}>
              <Typography variant="body2">{item.fileName}</Typography>
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: "text.secondary" }}>
                <AccessTimeIcon fontSize="small" />
                <Typography variant="caption">{new Date(item.createdOn + "Z").toLocaleString()}</Typography>
              </Stack>
            </Box>
          </Tooltip>
        ),
      )}
    </Stack>
  );
}
