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

// Ported from the source app's components/CaseBox.tsx — the comments/
// worknotes feed shown under a case's work-note composer.
import { useEffect, useState } from "react";
import { Box, Button, Card, CardContent, Stack, Typography } from "@mui/material";
import ErrorIcon from "@mui/icons-material/Error";
import ScheduleIcon from "@mui/icons-material/Schedule";
import NoteIcon from "@mui/icons-material/Note";
import DOMPurify from "dompurify";
import { useGetApi } from "@features/spl/api/useSplApi";
import { splBackendUrl } from "@config/apiConfig";
import { useSplPermissions } from "@features/spl/api/useSplPermissions";
import { useInlineAttachmentImages } from "../utils/useInlineAttachmentImages";
import type { CaseCommentDetails } from "../api/splCaseTypes";
import { LinearLoadingPanel } from "./StatePanels";

function getCommentKey(comment: CaseCommentDetails): string {
  return `${comment.createdOn}_${comment.createdBy}_${comment.type}`;
}

function getTimeDifference(createdOn: string): string {
  const createdDate = new Date(createdOn + "Z");
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - createdDate.getTime()) / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365.25);

  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  if (diffMonths < 12) return `${diffMonths} month${diffMonths === 1 ? "" : "s"} ago`;
  return `${diffYears} year${diffYears === 1 ? "" : "s"} ago`;
}

export function CaseBox({ caseId, worknoteRsp }: { caseId: string | undefined; worknoteRsp: unknown }) {
  const [offset, setOffset] = useState(0);
  const [endOfComments, setEndOfComments] = useState(false);
  const [allComments, setAllComments] = useState<CaseCommentDetails[]>([]);

  const { data, loading, error, getApiData } = useGetApi<{ total: number; comments: CaseCommentDetails[] }>({
    url: "",
    headers: { accept: "application/json" },
  });

  const fetchComments = (currentOffset: number) => {
    getApiData(`${splBackendUrl}/cases/${caseId}/comments-and-worknotes?offset=${currentOffset}&limit=10`);
  };

  useEffect(() => {
    if (caseId) {
      setOffset(0);
      setEndOfComments(false);
      setAllComments([]);
      fetchComments(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, worknoteRsp]);

  useEffect(() => {
    if (!data?.comments) return;
    const { comments, total } = data;
    if (offset === 0) {
      setAllComments(comments);
      setEndOfComments(comments.length >= total);
    } else if (comments.length > 0) {
      setAllComments((prev) => {
        const existingKeys = new Set(prev.map(getCommentKey));
        const newComments = comments.filter((c) => !existingKeys.has(getCommentKey(c)));
        setEndOfComments(prev.length + newComments.length >= total);
        return [...prev, ...newComments];
      });
    } else {
      setEndOfComments(true);
    }
  }, [data, offset]);

  const nextComments = () => {
    const newOffset = offset + 10;
    setOffset(newOffset);
    fetchComments(newOffset);
  };

  if (loading && allComments.length === 0) return <LinearLoadingPanel />;
  if (error) {
    return (
      <Stack direction="row" alignItems="center" spacing={1} sx={{ p: 4 }}>
        <ErrorIcon fontSize="large" color="error" />
        <Typography variant="h6" color="error">
          error while loading comments and worknotes!
        </Typography>
      </Stack>
    );
  }

  return (
    <>
      {allComments.map((item, index) => (
        <CommentEntry key={index} item={item} />
      ))}
      {!endOfComments && allComments.length > 0 && (
        <Box sx={{ display: "flex", justifyContent: "center", pt: 3 }}>
          <Button variant="outlined" onClick={nextComments}>
            Show More
          </Button>
        </Box>
      )}
    </>
  );
}

function CommentEntry({ item }: { item: CaseCommentDetails }) {
  const { isUserAllowedtoDownloadAttachments } = useSplPermissions();
  const sanitizedValue = DOMPurify.sanitize(item.value);
  const { resolvedHtml } = useInlineAttachmentImages(sanitizedValue, isUserAllowedtoDownloadAttachments);

  return (
    <Card
      variant="outlined"
      sx={{ mt: 2, ...(item.type === "work_notes" ? { borderLeft: "4px solid #ff7300" } : {}) }}
    >
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ color: "text.secondary", mb: 1 }}>
          {item.type === "comments" ? <ScheduleIcon fontSize="small" /> : <NoteIcon fontSize="small" />}
          <Typography variant="caption">
            {new Date(item.createdOn + "Z").toLocaleString()} ({getTimeDifference(item.createdOn)})
          </Typography>
          <Typography variant="caption" fontWeight={600}>
            {item.createdBy}
          </Typography>
        </Stack>
        <Box
          sx={{ overflow: "auto" }}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(resolvedHtml) }}
        />
      </CardContent>
    </Card>
  );
}
