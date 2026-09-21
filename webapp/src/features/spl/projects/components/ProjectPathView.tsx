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

// Adapted from SupportPortalLite's src/components/PathView.tsx for this
// domain's own need (Home > Account > Project) — scoped locally, see the
// note in ./DefaultTable.tsx. Rebuilt on MUI's own Breadcrumbs rather than
// the source's custom button/CSS markup (which depended on bootstrap-style
// classes not present in one-wso2); same navigation behavior.
import { Breadcrumbs, Link, Typography } from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import { useNavigate } from "react-router";
import { useNotifications } from "@context/notifications/NotificationsContext";

export default function ProjectPathView({
  accountName,
  accountNumber,
  projectKey,
}: {
  accountName?: string;
  accountNumber?: string;
  projectKey?: string;
}) {
  const navigate = useNavigate();
  const { showError } = useNotifications();

  const handleAccountClick = () => {
    if (accountNumber) {
      navigate(`/csm/accounts/${accountNumber}`);
    } else {
      showError("Account not found.");
    }
  };

  return (
    <Breadcrumbs sx={{ mb: 1.5 }}>
      <Link
        component="button"
        underline="hover"
        color="inherit"
        onClick={() => navigate("/csm")}
        sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
      >
        <HomeIcon fontSize="small" /> Home
      </Link>
      <Link component="button" underline="hover" color="inherit" onClick={handleAccountClick}>
        {accountName || "Account"}
      </Link>
      {projectKey && <Typography color="text.primary">{projectKey}</Typography>}
    </Breadcrumbs>
  );
}
