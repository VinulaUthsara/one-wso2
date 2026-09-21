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

// Ported from the source app's src/components/PathView.tsx, rebuilt on
// plain MUI (Button + sx) instead of the source's own PathView.css classes
// (not carried into this app). Only the Account-only usage Accounts needs
// (projectKey/caseKey props exist in the source for other domains' detail
// pages — not needed here, so not ported).
import { Box, Button, Tooltip } from "@mui/material";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import HomeIcon from "@mui/icons-material/Home";
import { useNavigate } from "react-router";
import { useNotifications } from "@context/notifications/NotificationsContext";

export default function PathView({ accountName, accountNumber }: { accountName?: string; accountNumber?: string }) {
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
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1.5 }}>
      <Tooltip title="Home">
        <Button size="small" onClick={() => navigate("/csm")} startIcon={<HomeIcon fontSize="small" />} />
      </Tooltip>
      <ArrowForwardIosIcon fontSize="small" sx={{ opacity: 0.5 }} />
      <Tooltip title="Account">
        <Button size="small" onClick={handleAccountClick} sx={{ textTransform: "none", fontWeight: 600 }}>
          {accountName}
        </Button>
      </Tooltip>
    </Box>
  );
}
