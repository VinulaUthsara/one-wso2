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

import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Divider,
  Menu,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@wso2/oxygen-ui";
import {
  ArrowRightIcon,
  Building2Icon,
  ChevronDownIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  TriangleAlertIcon,
  XIcon,
} from "@wso2/oxygen-ui-icons-react";
import { useNavigate, useParams } from "react-router";
import CsmShell from "@features/csm/components/CsmShell";
import ErrorNotice from "@components/error-notice/ErrorNotice";
import { humanizeHttpError } from "@api/http";
import {
  CASE_STATE_LABEL,
  commentGateReason,
  isSameCsmUser,
  type CaseState,
} from "../api/csmCaseTypes";
import { useCsmCase } from "../api/useCsmCase";
import { usePatchCsmCase } from "../api/usePatchCsmCase";
import { useCsmCaseComments, usePostCsmCaseComment } from "../api/useCsmCaseComments";
import { useCsmCaseActivities } from "../api/useCsmCaseActivities";
import { useAddCsmCaseTag, useRemoveCsmCaseTag } from "../api/useCsmCaseTags";
import { useCsmCaseEscalations, useEscalateCsmCase } from "../api/useCsmCaseEscalations";
import { useCsmMe } from "../api/useCsmMe";

function severityColor(severity: string): "error" | "warning" | "info" | "default" {
  switch (severity) {
    case "critical":
      return "error";
    case "high":
      return "warning";
    case "medium":
      return "info";
    default:
      return "default";
  }
}

function formatDateTime(iso: string | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type TabName = "activities" | "details";

export default function CsmCaseDetailPage() {
  const { caseId = "" } = useParams<{ caseId: string }>();
  const [tab, setTab] = useState<TabName>("activities");

  const caseQuery = useCsmCase(caseId);
  const c = caseQuery.data;

  return (
    <CsmShell title={c ? `${c.caseNumber ?? c.id} — ${c.subject}` : "Case"}>
      {caseQuery.isPending ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress size={22} />
        </Box>
      ) : caseQuery.isError ? (
        <ErrorNotice onRetry={() => void caseQuery.refetch()} error={caseQuery.error}>
          Couldn't load this case.
        </ErrorNotice>
      ) : !c ? (
        <Alert severity="warning">This case couldn't be found.</Alert>
      ) : (
        <>
          <CaseHeader caseId={caseId} />

          <Tabs value={tab} onChange={(_e, v: TabName) => setTab(v)} sx={{ mb: 2, minHeight: 36 }}>
            <Tab label="Activities" value="activities" sx={{ minHeight: 36, textTransform: "none" }} />
            <Tab label="Details" value="details" sx={{ minHeight: 36, textTransform: "none" }} />
          </Tabs>

          {tab === "activities" && <ActivitiesTab caseId={caseId} />}
          {tab === "details" && <DetailsTab caseId={caseId} />}
        </>
      )}
    </CsmShell>
  );
}

// ---- header: identity + status-change menu + status band + tags + escalation ----
//
// Four visually distinct zones, each with its own shape/colour language so a
// glance tells you which is which:
//   1. Identity (customer/account/assignee) — plain text, no chip or border,
//      large and left-aligned: the one thing on this card that's prose, not
//      a control or a label.
//   2. The status-change control — a single neutral, bordered, rectangular
//      button on the right showing the CURRENT state, opening a menu of
//      every valid next state (plus pause/resume). One control instead of a
//      row of same-shaped buttons that read as more status chips.
//   3. The status band — severity/work-state/escalation as filled, coloured,
//      pill-shaped chips, grouped on a faintly tinted strip so the whole
//      band reads as one zone, distinct from both the identity block above
//      it and the tags below.
//   4. Tags/escalation — outlined, deletable pills the user edits directly,
//      a third distinct shape from both the status pills and the action
//      button.
const ACTION_BUTTON_SX = {
  textTransform: "none",
  fontWeight: 600,
  fontSize: 12.5,
  borderRadius: 1.5,
  lineHeight: 1.4,
} as const;

function CaseHeader({ caseId }: { caseId: string }) {
  const navigate = useNavigate();
  const caseQuery = useCsmCase(caseId);
  const c = caseQuery.data;
  const patchCase = usePatchCsmCase();
  const [actionError, setActionError] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  if (!c) return null;

  const onTransition = async (nextState: CaseState) => {
    setMenuAnchor(null);
    setActionError(null);
    if (nextState === "reopened") {
      navigate("/csm/cases/new", { state: { relatedCaseId: c.id, relatedCaseNumber: c.caseNumber } });
      return;
    }
    try {
      await patchCase.mutateAsync({ caseId, state: nextState });
    } catch (err) {
      setActionError(humanizeHttpError(err));
    }
  };

  const onToggleWorkState = async () => {
    setMenuAnchor(null);
    setActionError(null);
    try {
      await patchCase.mutateAsync({ caseId, workState: c.workState === "ongoing" ? "paused" : "ongoing" });
    } catch (err) {
      setActionError(humanizeHttpError(err));
    }
  };

  const nextStates = c.nextStates ?? [];
  const canToggleWorkState = c.state === "work_in_progress";
  const hasActions = nextStates.length > 0 || canToggleWorkState;

  return (
    <Card variant="outlined" sx={{ p: 2, mb: 2.5 }}>
      {/* Zone 1 (left) + zone 2 (right): identity vs. the one action control. */}
      <Stack direction="row" spacing={2} alignItems="flex-start" justifyContent="space-between">
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              flexShrink: 0,
              borderRadius: 1.5,
              display: "grid",
              placeItems: "center",
              bgcolor: "action.hover",
              color: "text.secondary",
            }}
            aria-hidden="true"
          >
            <Building2Icon size={17} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700, fontSize: 17, letterSpacing: "-0.01em", lineHeight: 1.25 }} noWrap>
              {c.customer}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {c.assignee ? `Assigned to ${c.assignee}` : "Unassigned"}
              {c.accountId ? ` · Account ${c.accountId}` : ""}
            </Typography>
          </Box>
        </Stack>

        {!hasActions && (
          <Chip
            label={CASE_STATE_LABEL[c.state]}
            size="small"
            color={c.state === "closed" ? "default" : "primary"}
            sx={{ flexShrink: 0 }}
          />
        )}
        {hasActions && (
          <Box sx={{ flexShrink: 0 }}>
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              disabled={patchCase.isPending}
              onClick={(e) => setMenuAnchor(e.currentTarget)}
              endIcon={<ChevronDownIcon size={14} />}
              sx={{ ...ACTION_BUTTON_SX, borderColor: "divider" }}
            >
              {CASE_STATE_LABEL[c.state]}
            </Button>
            <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
              {nextStates.map((s) => (
                <MenuItem key={s} onClick={() => void onTransition(s)}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {s === "reopened" ? <PlusIcon size={14} /> : <ArrowRightIcon size={14} />}
                    <span>{s === "reopened" ? "Create related case" : `Move to ${CASE_STATE_LABEL[s]}`}</span>
                  </Stack>
                </MenuItem>
              ))}
              {canToggleWorkState && (
                <MenuItem onClick={() => void onToggleWorkState()}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {c.workState === "ongoing" ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
                    <span>{c.workState === "ongoing" ? "Pause" : "Resume"}</span>
                  </Stack>
                </MenuItem>
              )}
            </Menu>
          </Box>
        )}
      </Stack>

      {/* Zone 3: the status band — its own tinted strip, one level of visual
          separation below identity, distinguishing "state of the case" from
          "who it's for". */}
      <Box
        sx={{
          mt: 1.5,
          p: 1,
          borderRadius: 1.5,
          bgcolor: "action.hover",
          display: "flex",
          flexWrap: "wrap",
          gap: 0.75,
          alignItems: "center",
        }}
      >
        {c.severity && c.severity !== "unset" && (
          <Chip label={c.severity} size="small" color={severityColor(c.severity)} />
        )}
        {c.workState && <Chip label={c.workState === "ongoing" ? "Ongoing" : "Paused"} size="small" variant="outlined" />}
        {c.escalationLevel && (
          <Chip
            icon={<TriangleAlertIcon size={12} />}
            label={`Escalation L${c.escalationLevel}`}
            size="small"
            color="warning"
          />
        )}
        {!c.severity && !c.workState && !c.escalationLevel && (
          <Typography variant="caption" color="text.secondary">
            No severity, work state or escalation set.
          </Typography>
        )}
      </Box>

      {actionError && (
        <Alert severity="error" sx={{ mt: 1.5 }} onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}

      <Divider sx={{ my: 1.5 }} />
      <TagsRow caseId={caseId} />
      <EscalationPanel caseId={caseId} />
    </Card>
  );
}

function TagsRow({ caseId }: { caseId: string }) {
  const caseQuery = useCsmCase(caseId);
  const c = caseQuery.data;
  const addTag = useAddCsmCaseTag();
  const removeTag = useRemoveCsmCaseTag();
  const [draft, setDraft] = useState("");

  if (!c) return null;

  const onAdd = () => {
    const label = draft.trim();
    if (!label) return;
    addTag.mutate({ caseId, label }, { onSuccess: () => setDraft("") });
  };

  return (
    <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
      <Typography variant="overline" color="text.secondary" sx={{ mr: 0.5 }}>
        Tags
      </Typography>
      {c.tags.map((t) => (
        <Chip
          key={t.id}
          label={t.label}
          size="small"
          color={t.color}
          variant="outlined"
          onDelete={() => removeTag.mutate({ caseId, tagId: t.id })}
          deleteIcon={<XIcon size={12} />}
        />
      ))}
      <TextField
        size="small"
        placeholder="Add tag"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onAdd();
        }}
        sx={{ width: 120, "& .MuiInputBase-input": { fontSize: 12.5, py: 0.5 } }}
      />
      <Tooltip title="Add tag">
        <span>
          <Button
            size="small"
            variant="outlined"
            color="inherit"
            onClick={onAdd}
            disabled={!draft.trim() || addTag.isPending}
            sx={{ ...ACTION_BUTTON_SX, minWidth: 0, px: 0.75, borderColor: "divider" }}
          >
            <PlusIcon size={14} />
          </Button>
        </span>
      </Tooltip>
    </Stack>
  );
}

function EscalationPanel({ caseId }: { caseId: string }) {
  const meQuery = useCsmMe();
  const caseQuery = useCsmCase(caseId);
  const escalations = useCsmCaseEscalations(caseId);
  const escalate = useEscalateCsmCase();
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const c = caseQuery.data;
  if (!c) return null;

  const canDeescalate =
    Boolean(c.escalationLevel) &&
    (escalations.data?.currentNotifiedUsers ?? []).some((u) => isSameCsmUser(meQuery.data, u));

  const onEscalate = async () => {
    setFormError(null);
    try {
      await escalate.mutateAsync({ caseId, action: "ESCALATE", reason: reason.trim() });
      setReason("");
      setOpen(false);
    } catch (err) {
      setFormError(humanizeHttpError(err));
    }
  };

  const onDeescalate = async () => {
    setFormError(null);
    try {
      await escalate.mutateAsync({ caseId, action: "DEESCALATE" });
    } catch (err) {
      setFormError(humanizeHttpError(err));
    }
  };

  return (
    <Box sx={{ mt: 1.5 }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="overline" color="text.secondary" sx={{ mr: 0.5 }}>
          Escalation
        </Typography>
        <Button
          size="small"
          variant="outlined"
          color="warning"
          startIcon={<TriangleAlertIcon size={13} />}
          onClick={() => setOpen((o) => !o)}
          sx={ACTION_BUTTON_SX}
        >
          {open ? "Hide" : "Escalate…"}
        </Button>
        {canDeescalate && (
          <Button
            size="small"
            variant="text"
            color="warning"
            onClick={() => void onDeescalate()}
            sx={ACTION_BUTTON_SX}
          >
            De-escalate
          </Button>
        )}
      </Stack>
      {open && (
        <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mt: 1 }}>
          <TextField
            size="small"
            placeholder="Reason for escalating"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            sx={{ minWidth: 280 }}
          />
          <Button
            size="small"
            variant="contained"
            color="warning"
            disabled={!reason.trim() || escalate.isPending}
            onClick={() => void onEscalate()}
            sx={ACTION_BUTTON_SX}
          >
            Escalate
          </Button>
        </Stack>
      )}
      {formError && (
        <Alert severity="error" sx={{ mt: 1 }} onClose={() => setFormError(null)}>
          {formError}
        </Alert>
      )}
    </Box>
  );
}

// ---- Activities tab: comments + audit trail, merged, with the comment composer ----

interface FeedEntry {
  id: string;
  createdAt: string;
  kind: "comment" | "audit";
  actorName?: string;
  bodyHtml?: string;
  internal?: boolean;
  summary?: string;
}

function ActivitiesTab({ caseId }: { caseId: string }) {
  const caseQuery = useCsmCase(caseId);
  const commentsQuery = useCsmCaseComments(caseId);
  const activitiesQuery = useCsmCaseActivities(caseId);
  const meQuery = useCsmMe();
  const postComment = usePostCsmCaseComment();

  const [content, setContent] = useState("");
  const [asWorkNote, setAsWorkNote] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  const c = caseQuery.data;

  const feed = useMemo<FeedEntry[]>(() => {
    const comments: FeedEntry[] = (commentsQuery.data ?? []).map((cm) => ({
      id: cm.id,
      createdAt: cm.createdAt,
      kind: "comment",
      actorName: cm.authorName,
      bodyHtml: cm.bodyHtml,
      internal: cm.internal,
    }));
    // "comment_added" audit entries would duplicate what the comments list
    // already shows — every other audit kind (state changes, escalations, …)
    // has no comment counterpart, so only those are merged in.
    const audit: FeedEntry[] = (activitiesQuery.data ?? [])
      .filter((a) => a.kind !== "comment_added")
      .map((a) => ({ id: a.id, createdAt: a.createdAt, kind: "audit", actorName: a.actorName, summary: a.summary }));
    // Newest first — the composer sits above the feed, so posting a comment
    // lands it right below where it was typed, not at the bottom of a long
    // scroll.
    return [...comments, ...audit].sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
  }, [commentsQuery.data, activitiesQuery.data]);

  if (!c) return null;

  const gateReason = commentGateReason(c, meQuery.data, asWorkNote ? "work_note" : "comment");

  const onPost = async () => {
    setPostError(null);
    try {
      await postComment.mutateAsync({ caseId, type: asWorkNote ? "work_note" : "comment", content: content.trim() });
      setContent("");
    } catch (err) {
      setPostError(humanizeHttpError(err));
    }
  };

  return (
    <Box>
      {/* Composer first — newest activity is at the top of the feed below,
          so posting lands right underneath where it was typed. */}
      <Stack spacing={1}>
        <TextField
          multiline
          minRows={2}
          placeholder={asWorkNote ? "Add an internal work note…" : "Add a comment…"}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={Boolean(gateReason)}
          size="small"
        />
        <Stack direction="row" spacing={1} alignItems="center">
          <Select
            size="small"
            value={asWorkNote ? "work_note" : "comment"}
            onChange={(e) => setAsWorkNote(e.target.value === "work_note")}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="comment">Comment</MenuItem>
            <MenuItem value="work_note">Work note</MenuItem>
          </Select>
          <Button
            variant="contained"
            size="small"
            disabled={Boolean(gateReason) || !content.trim() || postComment.isPending}
            onClick={() => void onPost()}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            Post
          </Button>
        </Stack>
        {gateReason && (
          <Typography variant="caption" color="text.secondary">
            {gateReason}
          </Typography>
        )}
        {postError && <Alert severity="error">{postError}</Alert>}
      </Stack>

      <Divider sx={{ my: 1.5 }} />

      {commentsQuery.isPending || activitiesQuery.isPending ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
          <CircularProgress size={20} />
        </Box>
      ) : feed.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          No activity yet.
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {feed.map((entry) =>
            entry.kind === "comment" ? (
              <Box key={entry.id} sx={{ p: 1.5, border: 1, borderColor: "divider", borderRadius: 1.5 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: 12.5 }}>{entry.actorName}</Typography>
                  {entry.internal && <Chip label="Work note" size="small" variant="outlined" />}
                  <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
                    {formatDateTime(entry.createdAt)}
                  </Typography>
                </Stack>
                {/* Backend-authored rich text, not user input from this session — same
                    trust boundary as every other ported app's comment thread. */}
                <Box
                  sx={{ fontSize: 13, "& p": { m: 0 } }}
                  dangerouslySetInnerHTML={{ __html: entry.bodyHtml ?? "" }}
                />
              </Box>
            ) : (
              <Stack key={entry.id} direction="row" spacing={1} alignItems="center" sx={{ px: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  {formatDateTime(entry.createdAt)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {entry.summary}
                  {entry.actorName ? ` — ${entry.actorName}` : ""}
                </Typography>
              </Stack>
            ),
          )}
        </Stack>
      )}
    </Box>
  );
}

// ---- Details tab ----

function DetailField({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <Box sx={{ minWidth: 180 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
        {label}
      </Typography>
      <Typography variant="body2">{value === undefined || value === null || value === "" ? "—" : value}</Typography>
    </Box>
  );
}

function DetailsTab({ caseId }: { caseId: string }) {
  const caseQuery = useCsmCase(caseId);
  const c = caseQuery.data;
  if (!c) return null;

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="overline" color="text.secondary">
          Description
        </Typography>
        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
          {c.description || "—"}
        </Typography>
      </Box>

      <Box>
        <Typography variant="overline" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
          Case
        </Typography>
        <Stack direction="row" spacing={3} flexWrap="wrap">
          <DetailField label="Case number" value={c.caseNumber} />
          <DetailField label="Product" value={c.product} />
          <DetailField label="Issue type" value={c.issueType} />
          <DetailField label="Assignment group" value={c.assignmentGroup} />
          <DetailField label="Reporter" value={c.createdBy} />
          <DetailField label="Created" value={formatDateTime(c.createdAt)} />
          <DetailField label="Updated" value={formatDateTime(c.updatedAt)} />
        </Stack>
      </Box>

      {c.customerContext && (
        <Box>
          <Typography variant="overline" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
            Customer
          </Typography>
          <Stack direction="row" spacing={3} flexWrap="wrap">
            <DetailField label="Account" value={c.customerContext.accountName} />
            <DetailField label="Tier" value={c.customerContext.tier} />
            <DetailField label="Region" value={c.customerContext.region} />
            <DetailField label="Primary contact" value={c.customerContext.primaryContact} />
            <DetailField label="Account manager" value={c.customerContext.accountManager} />
            <DetailField label="Open cases" value={c.customerContext.openCases} />
          </Stack>
        </Box>
      )}

      {c.productContext && (
        <Box>
          <Typography variant="overline" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
            Product / deployment
          </Typography>
          <Stack direction="row" spacing={3} flexWrap="wrap">
            <DetailField label="Version" value={c.productContext.version} />
            <DetailField label="Update level" value={c.productContext.updateLevel} />
            <DetailField label="Deployment" value={c.productContext.deployment} />
            <DetailField label="Environment" value={c.productContext.environment} />
            <DetailField label="Region" value={c.productContext.region} />
          </Stack>
        </Box>
      )}

      {c.resolution && (
        <Box>
          <Typography variant="overline" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
            Resolution
          </Typography>
          <Stack direction="row" spacing={3} flexWrap="wrap" sx={{ mb: 1 }}>
            <DetailField label="Resolution code" value={c.resolution.resolutionCode} />
            <DetailField label="Cause" value={c.resolution.cause} />
          </Stack>
          {c.resolution.notes && (
            <Typography variant="body2" color="text.secondary">
              {c.resolution.notes}
            </Typography>
          )}
        </Box>
      )}
    </Stack>
  );
}
