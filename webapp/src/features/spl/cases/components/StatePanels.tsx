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

// Consolidates the source app's ErrorPage/ItemNotFound/NoResults/NoDataAvailable
// inline-state components (each an illustration + two lines of text in a
// centered Paper) into one parameterized component. Uses an MUI icon instead
// of the source's own SVG illustrations — those aren't carried into this
// port — everything else about the layout is unchanged.
import { Box, CardMedia, Paper, Stack, Typography } from "@mui/material";
import type { SvgIconComponent } from "@mui/icons-material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import LinearProgress from "@mui/material/LinearProgress";

export function InlineStatePanel({
  icon: Icon,
  title,
  subtitle,
  fullHeight = true,
}: {
  icon: SvgIconComponent;
  title: string;
  subtitle: string;
  fullHeight?: boolean;
}) {
  return (
    <Paper
      elevation={1}
      sx={{ height: fullHeight ? "100%" : undefined, py: 6, display: "flex", justifyContent: "center" }}
    >
      <Stack direction="column" spacing={2} justifyContent="center" alignItems="center">
        <CardMedia sx={{ color: "text.disabled" }}>
          <Icon sx={{ fontSize: 96 }} />
        </CardMedia>
        <Typography align="center" variant="h5">
          {title}
        </Typography>
        <Typography align="center" variant="body1" color="text.secondary">
          {subtitle}
        </Typography>
      </Stack>
    </Paper>
  );
}

export function ErrorPanel() {
  return <InlineStatePanel icon={ErrorOutlineIcon} title="Error!" subtitle="Something went wrong." />;
}

export function NotFoundPanel() {
  return (
    <InlineStatePanel
      icon={SearchOffIcon}
      title="Item Not Found!"
      subtitle="Couldn't find the requested item."
    />
  );
}

export function NoResultsPanel() {
  return (
    <Box sx={{ p: 3, textAlign: "center" }}>
      <Typography variant="body2" color="text.secondary">
        No results found.
      </Typography>
    </Box>
  );
}

export function NoDataPanel({
  message = "No data available",
  description = "There are no items to display. Try adjusting your filters or check back later.",
}: {
  message?: string;
  description?: string;
}) {
  return (
    <Box sx={{ p: 4, textAlign: "center" }}>
      <Typography variant="subtitle1">{message}</Typography>
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
    </Box>
  );
}

export function LinearLoadingPanel() {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <Box sx={{ mt: 2.5, width: "25%" }}>
        <LinearProgress
          sx={{
            width: "100%",
            backgroundColor: "#ffd1bf",
            "& .MuiLinearProgress-barColorPrimary": { backgroundColor: "#ff7300" },
          }}
        />
      </Box>
      <Typography variant="body1" color="text.secondary" sx={{ mt: -1 }}>
        Loading...
      </Typography>
    </Box>
  );
}
