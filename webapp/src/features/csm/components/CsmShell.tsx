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

import type { ReactNode } from "react";
import { Alert, Box, CircularProgress, Stack, Typography } from "@wso2/oxygen-ui";
import { isCsmBackendConfigured } from "@config/apiConfig";
import { useCsmGate } from "../cases/api/useCsmGate";
import { useCsmTeamGate } from "../api/useCsmTeamGate";
import CsmLocked from "./CsmLocked";
import ErrorNotice from "@components/error-notice/ErrorNotice";

// Shared page frame for every CSM screen — the state ladder every ported
// perspective's shell repeats (compare MarketingOpsShell/DueDiligenceShell),
// with one deliberate difference: it does NOT block on "backend not
// configured". This is v1, built UI-first against a known API contract with
// no backend stood up yet — every data hook in this feature falls back to an
// in-memory mock fixture when unconfigured (see csmCasesMockData.ts), so the
// perspective is fully usable today. Blocking here the way the other shells
// block on their first rung would defeat that point. Instead, an unconfigured
// backend gets a small non-blocking banner naming it as sample data, and the
// screen underneath renders normally.
//
// Since the CSM entry point is now shared with SupportPortalLite (see
// useCsmTeamGate), this also locks out a caller who isn't Customer Success —
// most likely a Sales/Solutions Architecture user who typed a /csm/cases URL
// directly instead of landing on their own screens via /csm.
//
//   1. either gate still resolving → spinner, never a premature denial
//   2. /users/me failed            → an error with a retry, NOT a denial
//   3. isAuthorized: false         → CsmLocked (a locked door, not a fault)
//   4. team !== customerSuccess    → CsmLocked, pointed back at /csm
//   5. authorized + right audience → children, with the sample-data banner
//      above them when the real backend isn't configured yet
export default function CsmShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const gate = useCsmGate();
  const teamGate = useCsmTeamGate();
  const configured = isCsmBackendConfigured();

  const isResolving = gate.isResolving || teamGate.isResolving;
  const isError = gate.isError || teamGate.isError;
  const isWrongAudience = !gate.isResolving && !gate.isError && teamGate.team === "salesOrSa";
  const isLocked =
    !isResolving && !isError && (!gate.isAuthorized || teamGate.team !== "customerSuccess");

  return (
    <Box>
      <Typography component="h1" variant="h5" sx={{ mb: 0.5, mt: 0 }}>
        {title}
      </Typography>
      {subtitle && !isLocked && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.25, maxWidth: "70ch" }}>
          {subtitle}
        </Typography>
      )}

      {isResolving ? (
        <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", mt: 2 }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">
            Checking your CSM Portal access…
          </Typography>
        </Stack>
      ) : isError ? (
        <ErrorNotice onRetry={gate.isError ? gate.retry : teamGate.retry} sx={{ mt: 1.5 }}>
          Couldn't check your CSM Portal access. {gate.errorMessage ?? teamGate.errorMessage}
        </ErrorNotice>
      ) : isLocked ? (
        isWrongAudience ? (
          <CsmLocked
            title="This is the Customer Success view"
            message="You're signed in as Sales / Solutions Architecture. Head back to the CSM entry point and you'll land on your own screens."
            actionTo="/csm"
            actionLabel="Go to /csm"
          />
        ) : (
          <CsmLocked />
        )
      ) : (
        <>
          {!configured && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Showing sample data — <code>ONE_WSO2_CSM_BACKEND_URL</code> isn't set in{" "}
              <code>public/config.js</code>, so nothing here reaches a real backend yet.
            </Alert>
          )}
          {children}
        </>
      )}
    </Box>
  );
}
