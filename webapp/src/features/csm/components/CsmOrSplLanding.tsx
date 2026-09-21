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

// The one truly shared route: /csm's bare index. Every other CSM/SPL path is
// single-purpose (CsmShell/SplShell each lock out the wrong audience on
// their own), but the index has to hand a caller somewhere before any
// path-specific page exists to gate — so it resolves the team itself and
// either renders the CSM overview or sends a Sales/Solutions Architecture
// caller on to their own landing (SupportPortalLite's own AppRoutes
// redirects its index to "cases" the same way).
import { Navigate } from "react-router";
import { Box, CircularProgress, Stack, Typography } from "@wso2/oxygen-ui";
import ErrorNotice from "@components/error-notice/ErrorNotice";
import { useCsmTeamGate } from "@features/csm/api/useCsmTeamGate";
import CsmLocked from "./CsmLocked";
import CsmOverviewPage from "../cases/pages/CsmOverviewPage";

export default function CsmOrSplLanding() {
  const gate = useCsmTeamGate();

  if (gate.isResolving) {
    return (
      <Box>
        <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", mt: 2 }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">
            Checking your access…
          </Typography>
        </Stack>
      </Box>
    );
  }

  if (gate.isError) {
    return (
      <ErrorNotice onRetry={gate.retry} sx={{ mt: 1.5 }}>
        Couldn't check your access. {gate.errorMessage}
      </ErrorNotice>
    );
  }

  if (gate.team === "salesOrSa") {
    return <Navigate to="/csm/support-cases" replace />;
  }

  if (gate.team === "none") {
    return (
      <Box>
        <Typography component="h1" variant="h5" sx={{ mb: 1.5, mt: 0 }}>
          CSM
        </Typography>
        <CsmLocked
          title="You don't have access yet"
          message="You're not recognised as Customer Success, Sales, or Solutions Architecture staff. Ask an admin to add you to the right group, then reload this page."
        />
      </Box>
    );
  }

  return <CsmOverviewPage />;
}
