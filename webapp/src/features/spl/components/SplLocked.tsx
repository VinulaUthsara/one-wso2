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

// What someone sees when useCsmTeamGate doesn't resolve them to Sales/
// Solutions Architecture — most likely a Customer Success caller who typed
// a SupportPortalLite URL directly, or someone in neither configured group.
// Plain @mui/material, not @wso2/oxygen-ui — every ported SupportPortalLite
// screen keeps that app's own look (per the port's visual-fidelity
// decision), and this state is new surface this port adds, so it stays
// consistent with the screens around it rather than the CSM side's design
// system. Content-scoped (not full-viewport) since it renders inside
// one-wso2's own AppLayout/SideRail chrome, unlike the source app's
// standalone pages/Unauthorized.tsx it's adapted from.
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { Link as RouterLink } from "react-router";

export default function SplLocked({
  title = "Unauthorized",
  message = "You don't have the required permission to view this page.",
  actionTo = "/me",
  actionLabel = "Back to Home",
}: {
  title?: string;
  message?: string;
  actionTo?: string;
  actionLabel?: string;
}) {
  return (
    <Paper elevation={0} variant="outlined" sx={{ mt: 2, py: 6, px: 3, textAlign: "center" }}>
      <Stack spacing={2} alignItems="center">
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            bgcolor: "action.hover",
            color: "text.secondary",
          }}
        >
          <LockOutlinedIcon fontSize="large" />
        </Box>
        <Typography variant="h5">{title}</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 420 }}>
          {message}
        </Typography>
        <Button component={RouterLink} to={actionTo} variant="outlined" sx={{ mt: 1 }}>
          {actionLabel}
        </Button>
      </Stack>
    </Paper>
  );
}
