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

import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from "@wso2/oxygen-ui";
import { useLocation, useNavigate } from "react-router";
import CsmShell from "@features/csm/components/CsmShell";
import { humanizeHttpError } from "@api/http";
import { useCreateCsmCase } from "../api/useCreateCsmCase";

const SEVERITY_OPTIONS = ["critical", "high", "medium", "low"];
// Deployment/deployed-product pickers aren't ported yet (that's its own
// domain) — a small static list stands in for v1, same spirit as the mock
// data layer. Revisit once Deployments exists as a real lookup.
const PRODUCT_OPTIONS = [
  "WSO2 API Manager",
  "WSO2 Identity Server",
  "WSO2 Micro Integrator",
  "Choreo",
  "Other",
];

interface CreateCaseLocationState {
  relatedCaseId?: string;
  relatedCaseNumber?: string;
}

export default function CsmCaseCreatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { relatedCaseId, relatedCaseNumber } = (location.state as CreateCaseLocationState | null) ?? {};

  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [issueType, setIssueType] = useState("");
  const [product, setProduct] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const createCase = useCreateCsmCase();

  const canSubmit = subject.trim().length > 0 && !createCase.isPending;

  const onSubmit = async () => {
    setFormError(null);
    try {
      const created = await createCase.mutateAsync({
        subject: subject.trim(),
        description: description.trim() || undefined,
        severity,
        issueType: issueType || undefined,
        product: product || undefined,
        relatedCaseId,
      });
      navigate(`/csm/cases/${created.id}`);
    } catch (err) {
      setFormError(humanizeHttpError(err));
    }
  };

  return (
    <CsmShell title="New case" subtitle="Log a new customer support case.">
      {relatedCaseId && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Creating a case related to <strong>{relatedCaseNumber ?? relatedCaseId}</strong>.
        </Alert>
      )}
      <Card variant="outlined" sx={{ p: 3, maxWidth: 640 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label="Subject"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            fullWidth
            size="small"
          />
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            minRows={4}
            size="small"
          />
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel id="csm-case-severity">Severity</InputLabel>
              <Select
                labelId="csm-case-severity"
                label="Severity"
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
              >
                {SEVERITY_OPTIONS.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s[0].toUpperCase() + s.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel id="csm-case-issue-type">Issue type</InputLabel>
              <Select
                labelId="csm-case-issue-type"
                label="Issue type"
                value={issueType}
                onChange={(e) => setIssueType(e.target.value)}
              >
                {["Defect", "Performance", "Configuration", "How-to", "Billing"].map((t) => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel id="csm-case-product">Product</InputLabel>
              <Select
                labelId="csm-case-product"
                label="Product"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
              >
                {PRODUCT_OPTIONS.map((p) => (
                  <MenuItem key={p} value={p}>
                    {p}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {formError && <Alert severity="error">{formError}</Alert>}

          <Box sx={{ display: "flex", gap: 1.25, mt: 1 }}>
            <Button
              variant="contained"
              onClick={() => void onSubmit()}
              disabled={!canSubmit}
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              {createCase.isPending ? "Creating…" : "Create case"}
            </Button>
            <Button variant="text" onClick={() => navigate(-1)} sx={{ textTransform: "none" }}>
              Cancel
            </Button>
          </Box>
        </Box>
      </Card>
    </CsmShell>
  );
}
