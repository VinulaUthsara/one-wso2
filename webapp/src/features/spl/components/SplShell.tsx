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

// Shared page frame for every ported SupportPortalLite screen — the
// Sales/Solutions Architecture counterpart to CsmShell. Plain
// @mui/material throughout (not @wso2/oxygen-ui), matching the visual-
// fidelity decision for this port: these screens should look like the
// source app, not the CSM side.
//
// Gates on useCsmTeamGate resolving to "salesOrSa" — the source app's own
// AuthorizedApp (Authorize.tsx) redirected to /unauthorized on a failed
// allow-list check; this renders SplLocked inline instead, consistent with
// how CsmShell handles the same situation for its side.
//
//   1. team gate still resolving → spinner, never a premature denial
//   2. team gate errored         → an error with a retry, NOT a denial
//   3. team !== salesOrSa        → SplLocked (a locked door, not a fault)
//   4. salesOrSa                 → children, wrapped in SplPermissionProvider
//      so every descendant can read the fine-grained work-note/escalation/
//      attachment/usage-metrics flags via useSplPermissions(), plus a
//      non-blocking "sample data" banner when the real backend isn't
//      configured yet (mirrors CsmShell's own banner for the CSM side).
import type { ReactNode } from "react";
import { Alert, Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { useCsmTeamGate } from "@features/csm/api/useCsmTeamGate";
import { isSplBackendConfigured } from "@config/apiConfig";
import { SplPermissionProvider } from "../api/useSplPermissions";
import { useSplColorScheme } from "../theme/useSplColorScheme";
import { splMuiTheme } from "../theme/splMuiTheme";
import SplLocked from "./SplLocked";

export default function SplShell({ children }: { children: ReactNode }) {
  const gate = useCsmTeamGate();
  const configured = isSplBackendConfigured();
  // See useSplColorScheme's own comment: plain @mui/material components
  // never see OxygenUIThemeProvider's theme (a separate bundled copy), so
  // without this real ThemeProvider every one of them silently renders
  // MUI's stock light theme even when the rest of the app is in dark mode.
  const theme = splMuiTheme(useSplColorScheme());

  const isWrongAudience = !gate.isResolving && !gate.isError && gate.team === "customerSuccess";
  const isLocked = !gate.isResolving && !gate.isError && gate.team !== "salesOrSa";

  let content: ReactNode;

  if (gate.isResolving) {
    content = (
      <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", mt: 2 }}>
        <CircularProgress size={16} />
        <Typography variant="body2" color="text.secondary">
          Checking your access…
        </Typography>
      </Stack>
    );
  } else if (gate.isError) {
    content = (
      <Alert
        severity="error"
        sx={{ mt: 1.5 }}
        action={
          <Button color="inherit" size="small" onClick={gate.retry}>
            Retry
          </Button>
        }
      >
        Couldn't check your access. {gate.errorMessage}
      </Alert>
    );
  } else if (isLocked) {
    content = isWrongAudience ? (
      <SplLocked
        title="This is the Support Portal view"
        message="You're signed in as Customer Success. Head back to the CSM entry point and you'll land on your own screens."
        actionTo="/csm"
        actionLabel="Go to /csm"
      />
    ) : (
      <SplLocked />
    );
  } else {
    content = (
      <SplPermissionProvider>
        <Box>
          {!configured && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Showing sample data — <code>ONE_WSO2_SPL_BACKEND_URL</code> isn't set in{" "}
              <code>public/config.js</code>, so nothing here reaches a real backend yet.
            </Alert>
          )}
          {children}
        </Box>
      </SplPermissionProvider>
    );
  }

  return <ThemeProvider theme={theme}>{content}</ThemeProvider>;
}
