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

// Ported from the source app's
// src/components/list-views/account/GoogleDrive.tsx. Note this never
// actually talks to the real Google APIs client-side — despite the
// gapi-script/googleapis packages sitting in the source's package.json,
// this component (the only Drive-related UI in the app) fetches folder
// listings from the SupportPortalLite BACKEND's own `/files` proxy
// endpoint, same auth/backend pattern as everything else in this port. That
// endpoint isn't in splMockApi.ts's fixture (the source's own local mock
// server doesn't implement it either), so with no real backend configured
// this naturally lands on the component's own existing error state
// ("An error occurred... Retry") rather than crashing — no special
// "not configured" handling needed beyond what was already here.
//
// `window.config.googleDriveConfig.{fileViewUrl,folderViewUrl}` (source) had
// no equivalent one-wso2 config — replaced with the standard public Google
// Drive URL templates these values conventionally hold, rather than adding
// an unused config surface for a single hardcoded pair of URL prefixes.
import { useEffect, useState } from "react";
import { Box, Button } from "@mui/material";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import FolderIcon from "@mui/icons-material/Folder";
import DescriptionIcon from "@mui/icons-material/Description";
import ImageIcon from "@mui/icons-material/Image";
import MovieIcon from "@mui/icons-material/Movie";
import AudiotrackIcon from "@mui/icons-material/Audiotrack";
import CodeIcon from "@mui/icons-material/Code";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import TableChartIcon from "@mui/icons-material/TableChart";
import ArticleIcon from "@mui/icons-material/Article";
import { useGetApi } from "@features/spl/api/useSplApi";
import { splBackendUrl } from "@config/apiConfig";

const FILE_VIEW_BASE_URL = "https://drive.google.com/file/d/";
const FOLDER_VIEW_BASE_URL = "https://drive.google.com/drive/folders/";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
}

function getFileIcon(mimeType: string, name: string) {
  if (mimeType === "application/vnd.google-apps.folder") {
    return <FolderIcon sx={{ verticalAlign: "middle", mr: 1, color: "#FFA726" }} />;
  }
  if (mimeType === "application/vnd.google-apps.document") {
    return <DescriptionIcon sx={{ verticalAlign: "middle", mr: 1, color: "#4285F4" }} />;
  }
  if (mimeType === "application/vnd.google-apps.spreadsheet") {
    return <TableChartIcon sx={{ verticalAlign: "middle", mr: 1, color: "#0F9D58" }} />;
  }
  const extension = name.toLowerCase().split(".").pop();
  switch (extension) {
    case "pdf":
      return <PictureAsPdfIcon sx={{ verticalAlign: "middle", mr: 1, color: "#FF5252" }} />;
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
    case "bmp":
      return <ImageIcon sx={{ verticalAlign: "middle", mr: 1, color: "#4CAF50" }} />;
    case "mp4":
    case "avi":
    case "mov":
    case "wmv":
      return <MovieIcon sx={{ verticalAlign: "middle", mr: 1, color: "#FF4081" }} />;
    case "mp3":
    case "wav":
    case "ogg":
      return <AudiotrackIcon sx={{ verticalAlign: "middle", mr: 1, color: "#7C4DFF" }} />;
    case "js":
    case "ts":
    case "java":
    case "py":
    case "cpp":
    case "c":
    case "h":
    case "cs":
    case "php":
      return <CodeIcon sx={{ verticalAlign: "middle", mr: 1, color: "#FFC107" }} />;
    default:
      return <ArticleIcon sx={{ verticalAlign: "middle", mr: 1, color: "#757575" }} />;
  }
}

function extractFolderIdFromUrl(url: string): string | null {
  if (!url) return null;
  const match = url.match(/\/folders\/([^/?]+)/);
  return match ? match[1] : null;
}

export function GoogleDrive({ driveLocation }: { driveLocation: string }) {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [path, setPath] = useState<{ id: string; name: string }[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState("");
  const [folderNotFound, setFolderNotFound] = useState(false);
  const [isError, setIsError] = useState(false);

  const { data: filesData, loading: filesLoading, error: filesError, getApiData: fetchFilesApi } = useGetApi<DriveFile[]>({
    url: `${splBackendUrl}/files`,
    headers: { accept: "application/json" },
  });

  const fetchFolder = async (folderId: string) => {
    const url = new URL(`${splBackendUrl}/files`, window.location.origin);
    url.searchParams.append("folderId", folderId);
    await fetchFilesApi(url.toString());
    setCurrentFolderId(folderId);
    setFolderNotFound(false);
  };

  useEffect(() => {
    if (filesData) {
      setFiles(filesData);
      setIsError(false);
    }
    if (filesError) setIsError(true);
  }, [filesData, filesError]);

  const handleClick = (file: DriveFile) => {
    if (file.mimeType === "application/vnd.google-apps.folder") {
      if (!path.some((p) => p.id === file.id)) setPath([...path, { id: file.id, name: file.name }]);
      void fetchFolder(file.id);
      setCurrentFolderId(file.id);
    } else {
      window.open(`${FILE_VIEW_BASE_URL}${file.id}/view`, "_blank");
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    const newPath = path.slice(0, index + 1);
    setPath(newPath);
    void fetchFolder(newPath[index].id);
    setCurrentFolderId(newPath[index].id);
  };

  const goToCurrentFolder = () => {
    if (currentFolderId) window.open(`${FOLDER_VIEW_BASE_URL}${currentFolderId}`, "_blank");
  };

  useEffect(() => {
    const folderId = extractFolderIdFromUrl(driveLocation);
    if (folderId) {
      void fetchFolder(folderId);
    } else {
      setFolderNotFound(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch once when driveLocation changes, same as the source
  }, [driveLocation]);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Button
            onClick={() => {
              setPath([]);
              const folderId = extractFolderIdFromUrl(driveLocation);
              if (folderId) void fetchFolder(folderId);
            }}
            title="Back to root"
          >
            {folderNotFound ? "No Folder Found" : filesLoading ? "Loading…" : "Root"}
          </Button>
          {path.map((p, index) => (
            <Box key={index} sx={{ display: "flex", alignItems: "center" }}>
              <ArrowForwardIosIcon fontSize="small" sx={{ mx: 1, opacity: 0.5 }} />
              <Button onClick={() => handleBreadcrumbClick(index)} title={p.name}>
                {p.name}
              </Button>
            </Box>
          ))}
        </Box>
        {!folderNotFound && path.length > 0 && (
          <Button variant="contained" onClick={goToCurrentFolder} sx={{ minWidth: 0, p: 0.5 }}>
            <OpenInNewIcon sx={{ fontSize: 20 }} />
          </Button>
        )}
      </Box>

      {filesLoading ? (
        <Box sx={{ py: 3, textAlign: "center", color: "text.secondary" }}>Loading folder contents…</Box>
      ) : isError ? (
        <Box sx={{ py: 3, textAlign: "center" }}>
          <Box sx={{ color: "text.secondary", mb: 1 }}>An error occurred while fetching data. Please try again.</Box>
          <Button
            variant="contained"
            onClick={() => {
              const folderId = extractFolderIdFromUrl(driveLocation);
              if (folderId) void fetchFolder(folderId);
            }}
          >
            Retry
          </Button>
        </Box>
      ) : folderNotFound ? (
        <Box sx={{ py: 3, textAlign: "center" }}>
          <Box sx={{ color: "text.secondary", mb: 1 }}>No folder found at the specified drive location.</Box>
          <Button
            variant="contained"
            onClick={() => {
              const folderId = extractFolderIdFromUrl(driveLocation);
              if (folderId) void fetchFolder(folderId);
            }}
          >
            Refresh
          </Button>
        </Box>
      ) : files.length === 0 ? (
        <Box sx={{ py: 3, textAlign: "center", color: "text.secondary" }}>This folder is currently empty.</Box>
      ) : (
        <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
          <Box component="thead">
            <Box component="tr">
              <Box
                component="th"
                sx={{ textAlign: "left", py: 1, borderBottomWidth: 1, borderBottomStyle: "solid", borderColor: "divider" }}
              >
                Name
              </Box>
            </Box>
          </Box>
          <Box component="tbody">
            {files
              .slice()
              .sort((a, b) => {
                const aIsFolder = a.mimeType === "application/vnd.google-apps.folder";
                const bIsFolder = b.mimeType === "application/vnd.google-apps.folder";
                if (aIsFolder && !bIsFolder) return -1;
                if (!aIsFolder && bIsFolder) return 1;
                return a.name.localeCompare(b.name, undefined, { numeric: true });
              })
              .map((file) => (
                <Box
                  component="tr"
                  key={file.id}
                  onClick={() => handleClick(file)}
                  sx={{ cursor: "pointer", "&:hover": { backgroundColor: "action.hover" } }}
                >
                  <Box component="td" sx={{ py: 1 }}>
                    {getFileIcon(file.mimeType, file.name)}
                    <Box component="span" sx={{ verticalAlign: "middle" }}>
                      {file.name}
                    </Box>
                  </Box>
                </Box>
              ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}
