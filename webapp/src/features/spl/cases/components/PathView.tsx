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

// Ported from the source app's components/PathView.tsx (breadcrumb: Home >
// Account > Project > Case). MUI Stack/Button in place of the source's raw
// `<button className="button">` (styled by a PathView.css not carried into
// this port — see SearchResultBox.tsx's comment on why global Bootstrap-ish
// custom CSS isn't ported); `useNotifications()` in place of
// `Store.addNotification`.
import type { ReactNode } from "react";
import { Stack, Tooltip, Button } from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import { useNavigate } from "react-router";
import { useNotifications } from "@context/notifications/NotificationsContext";

function PathButton({
  text,
  icon,
  onClick,
  tooltip,
  active,
}: {
  text?: string;
  icon?: ReactNode;
  onClick?: () => void;
  tooltip: string;
  active?: boolean;
}) {
  return (
    <Tooltip title={tooltip}>
      <Button
        size="small"
        onClick={onClick}
        startIcon={icon}
        variant={active ? "contained" : "text"}
        sx={{ textTransform: "none" }}
      >
        {text}
      </Button>
    </Tooltip>
  );
}

export default function PathView({
  accountName,
  projectKey,
  accountNumber,
  projectNumber,
  caseKey,
}: {
  accountName?: string;
  projectKey?: string;
  accountNumber?: string;
  projectNumber?: string;
  caseKey?: string;
}) {
  const navigate = useNavigate();
  const { showError } = useNotifications();
  const activeButton = caseKey ? "Case" : projectKey ? "Project" : "Account";

  const handleAccountClick = () => {
    if (accountNumber) navigate(`/csm/accounts/${accountNumber}`);
    else showError("Account not found.");
  };

  const handleProjectClick = () => {
    if (projectNumber) navigate(`/csm/projects/${projectNumber}`);
    else showError("Project not found.");
  };

  return (
    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 2 }}>
      <PathButton icon={<HomeIcon fontSize="small" />} onClick={() => navigate("/csm")} tooltip="Home" />
      <ArrowForwardIosIcon fontSize="small" sx={{ opacity: 0.5, fontSize: 12 }} />
      <PathButton text={accountName} onClick={handleAccountClick} tooltip="Account" active={activeButton === "Account"} />
      {projectKey && (
        <>
          <ArrowForwardIosIcon fontSize="small" sx={{ opacity: 0.5, fontSize: 12 }} />
          <PathButton text={projectKey} onClick={handleProjectClick} tooltip="Project" active={activeButton === "Project"} />
        </>
      )}
      {caseKey && (
        <>
          <ArrowForwardIosIcon fontSize="small" sx={{ opacity: 0.5, fontSize: 12 }} />
          <PathButton text={caseKey} tooltip="Case" active={activeButton === "Case"} />
        </>
      )}
    </Stack>
  );
}
