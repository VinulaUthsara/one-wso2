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

import { Box, Button, Card, Typography } from "@wso2/oxygen-ui";
import { ArrowLeftIcon, LockIcon } from "@wso2/oxygen-ui-icons-react";
import { Link as RouterLink } from "react-router";

// What someone sees when GET /users/me can't identify them as a CSM Portal
// user, OR when useCsmTeamGate resolved them to a different audience than
// this shell expects (e.g. a Sales/Solutions Architecture caller who typed a
// /csm/cases URL directly rather than landing on their own SupportPortalLite
// screens via /csm). Rendered by CsmShell only for a resolved "not this
// audience" state, never for a failed request (see CsmShell's ladder) — same
// distinction, and same visual treatment (a neutral padlock, not an Alert),
// as MarketingOpsLocked.
//
// Simpler than MarketingOpsLocked: there's no per-operation group list to
// show yet (this app has one domain, Cases, so far), and no role vocabulary
// to name — the Cases API has no roles at all, so there's nothing more
// specific to tell someone than "you're not recognised as CSM Portal staff".
export default function CsmLocked({
  title = "You don't have access yet",
  message = "The CSM Portal couldn't recognise you as CS staff. Ask a CSM Portal admin to add you, then reload this page.",
  actionTo = "/me",
  actionLabel = "Back to Home",
}: {
  title?: string;
  message?: string;
  actionTo?: string;
  actionLabel?: string;
}) {
  return (
    <Card variant="outlined" sx={{ mt: 1.5, p: 3, maxWidth: 560 }}>
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.75 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            flexShrink: 0,
            borderRadius: 1.5,
            display: "grid",
            placeItems: "center",
            bgcolor: "background.default",
            border: 1,
            borderColor: "divider",
            color: "text.secondary",
          }}
          aria-hidden="true"
        >
          <LockIcon size={19} />
        </Box>
        <Box>
          <Typography component="h2" sx={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.02em", mb: 0.6 }}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: "52ch" }}>
            {message}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ height: "1px", bgcolor: "divider", my: 2.25 }} />

      <Button
        component={RouterLink}
        to={actionTo}
        variant="outlined"
        startIcon={<ArrowLeftIcon size={15} />}
        sx={{ textTransform: "none", fontSize: 13, fontWeight: 600 }}
      >
        {actionLabel}
      </Button>
    </Card>
  );
}
