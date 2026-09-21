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

// Ported from SupportPortalLite's src/components/NoDataAvailable.tsx, scoped
// locally to the projects domain — see the note in ./DefaultTable.tsx.
import { Box, Paper, Typography, useTheme } from "@mui/material";
import InboxIcon from "@mui/icons-material/Inbox";

export default function NoDataAvailable({
  message = "No data available",
  description = "There are no items to display at the moment.",
}: {
  message?: string;
  description?: string;
}) {
  const theme = useTheme();

  return (
    <Paper
      sx={{
        padding: 4,
        textAlign: "center",
        backgroundColor: theme.palette.mode === "dark" ? theme.palette.grey[900] : "#fafafa",
        border: `1px dashed ${theme.palette.divider}`,
        minHeight: "200px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <InboxIcon sx={{ fontSize: 64, color: "text.secondary", marginBottom: 2 }} />
      <Box>
        <Typography variant="h6" sx={{ color: "text.primary", marginBottom: 1, fontWeight: 500 }}>
          {message}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", maxWidth: "300px" }}>
          {description}
        </Typography>
      </Box>
    </Paper>
  );
}
