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

// Ported from the source app's src/components/Escalate.tsx. `httpRequest`
// (Asgardeo SDK, source) -> useSplHttpRequest() (one-wso2's own equivalent,
// same {url, method, headers, data} shape, routes through the mock backend
// when unconfigured — see useSplApi.ts). `Store.addNotification` ->
// useNotifications().
import { useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import DOMPurify from "dompurify";
import { splBackendUrl } from "@config/apiConfig";
import { useSplHttpRequest } from "@features/spl/api/useSplApi";
import { useNotifications } from "@context/notifications/NotificationsContext";
import type { AccountDetails } from "../api/splAccountTypes";

type EscalateDialogProps = {
  isEscalateDialogOpen: boolean;
  data: AccountDetails;
  setIsEscalateDialogOpen: (isDialogOpen: boolean) => void;
};

export default function EscalateDialog(props: EscalateDialogProps) {
  const [caseId, setCaseId] = useState("");
  const [reason, setReason] = useState("");
  const [severity, setSeverity] = useState("");
  const [source, setSource] = useState("");
  const [justification, setJustification] = useState("");
  const [loading, setLoading] = useState(false);
  const httpRequest = useSplHttpRequest();
  const { showSuccess, showWarning, showError } = useNotifications();

  const handleClose = () => props.setIsEscalateDialogOpen(false);

  const addEscalation = async () => {
    if (caseId === "" || reason === "" || severity === "" || source === "" || justification === "") {
      showWarning("Please fill all the required fields.");
      return;
    }
    const escalateURL = `${splBackendUrl}/accounts/${props.data.number}/cases/${caseId}/escalate`;
    const sanitizedJustification = DOMPurify.sanitize(justification);
    setLoading(true);
    try {
      await httpRequest({
        url: escalateURL,
        method: "POST",
        headers: { accept: "application/json" },
        data: { justification: sanitizedJustification, requestSource: source, reason, severity },
      });
      showSuccess("Escalation added successfully.");
      setLoading(false);
      handleClose();
    } catch {
      showError("Escalation submission unsuccessful.");
      setLoading(false);
      handleClose();
    }
  };

  return (
    <Dialog open={props.isEscalateDialogOpen} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Escalation Submission</DialogTitle>
      <DialogContent>
        <DialogContentText component="div">
          <Stack spacing={2}>
            <Typography variant="h6">Account: {props.data.name}</Typography>
            <Box>
              <FormControl required sx={{ minWidth: 120 }}>
                <InputLabel id="source-select-label">Source</InputLabel>
                <Select
                  labelId="source-select-label"
                  value={source}
                  label="Source"
                  onChange={(e: SelectChangeEvent) => setSource(e.target.value)}
                >
                  <MenuItem value="Customer">Customer</MenuItem>
                  <MenuItem value="Internal">Internal</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box>
              <FormControl required sx={{ minWidth: 120 }}>
                <InputLabel id="severity-select-label">Severity</InputLabel>
                <Select
                  labelId="severity-select-label"
                  value={severity}
                  label="Severity"
                  onChange={(e: SelectChangeEvent) => setSeverity(e.target.value)}
                >
                  <MenuItem value="High Severity">High Severity</MenuItem>
                  <MenuItem value="Medium Severity">Medium Severity</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box>
              <FormControl required sx={{ minWidth: 120 }}>
                <InputLabel id="reason-select-label">Reason</InputLabel>
                <Select
                  labelId="reason-select-label"
                  value={reason}
                  label="Reason"
                  onChange={(e: SelectChangeEvent) => setReason(e.target.value)}
                >
                  <MenuItem value="Inactivity">Inactivity</MenuItem>
                  <MenuItem value="Lack Of Progress">Lack Of Progress</MenuItem>
                  <MenuItem value="Customer Imposed Deadline">Customer Imposed Deadline</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <TextField required label="Case Id" value={caseId} onChange={(e) => setCaseId(e.target.value)} />
            <TextField
              fullWidth
              required
              label="Justification"
              multiline
              rows={6}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
            />
          </Stack>
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={addEscalation} disabled={loading} startIcon={loading ? <CircularProgress size={14} /> : undefined}>
          Escalate
        </Button>
      </DialogActions>
    </Dialog>
  );
}
