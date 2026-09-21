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

// Ported from the source app's pages/usage-metrics/UsageMetricsDashboard.tsx.
// Gated two ways, same as the source: SplShell (below) checks the caller is
// Sales/Solutions Architecture at all; isUserAllowedToViewUsageMetrics (from
// useSplPermissions, replacing the source's PermissionContext) is a second,
// finer-grained check — not every Sales/SA viewer may see this dashboard.
import { useEffect, useMemo, useRef, useState, type UIEvent } from "react";
import {
  Box,
  Typography,
  FormControl,
  Select,
  MenuItem,
  TextField,
  Button,
  Paper,
  Tabs,
  Tab,
  ListSubheader,
  InputAdornment,
  Alert,
  CircularProgress,
  LinearProgress,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import SearchIcon from "@mui/icons-material/Search";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import SplShell from "@features/spl/components/SplShell";
import { useSplPermissions } from "@features/spl/api/useSplPermissions";
import { usePostApi, useParallelPostApi } from "@features/spl/api/useSplApi";
import { splBackendUrl } from "@config/apiConfig";
import { StatSummary, fmtNumber, computeStats, extractVersion } from "../utils/formatters";
import { ProductBreakdownRow, type ProductBreakdownRowProps } from "../components/ProductBreakdownRow";
import { METRIC_CHART_CONFIG } from "../utils/usageMetricsProductClassifier";
import type {
  SnInstancesResponse,
  DeploymentsSearchResponse,
  DeploymentItem,
  DeployedProductsSearchResponse,
  SnDeployedProductMetricsResponse,
  SnDeployedProductUsageCountsResponse,
} from "../api/splUsageMetricsTypes";

interface ProjectListItem {
  id: string;
  name: string;
  key: string;
}
interface ProjectsSearchResponse {
  projects: ProjectListItem[];
  totalRecords: number;
  offset: number;
  limit: number;
}

type TimeRange = "1M" | "3M" | "6M" | "12M" | "Custom";

// Preferred display order for known count-type keys; unrecognized keys are appended after these.
const KNOWN_METRIC_KEY_ORDER = Object.keys(METRIC_CHART_CONFIG);

const RANGE_DAYS: Record<Exclude<TimeRange, "Custom">, number> = {
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "12M": 365,
};

// Must stay in sync with MAX_METRICS_DATE_RANGE_DAYS in the SupportPortalLite backend's
// modules/operations/operations.bal.
const MAX_RANGE_DAYS = 366;

// Debounce for the project search box — ported value from the source's constants/constants.tsx.
const DEBOUNCE_DELAY = 500;

const BASE = splBackendUrl;
const PROJECTS_PAGE_SIZE = 20;
const PROJECTS_URL = BASE + "/usage-metrics/projects/search";

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}
function daysAgoStr(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString().split("T")[0];
}
const MIN_ALLOWED_DATE = daysAgoStr(MAX_RANGE_DAYS);

function UsageMetricsDashboard() {
  const { isUserAllowedToViewUsageMetrics } = useSplPermissions();

  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedProjectLabel, setSelectedProjectLabel] = useState("");
  const [projectSearch, setProjectSearch] = useState("");
  const [projectList, setProjectList] = useState<ProjectListItem[]>([]);
  const [projectsHasMore, setProjectsHasMore] = useState(false);
  const [projectsSearching, setProjectsSearching] = useState(false);
  const projectsOffsetRef = useRef(0);
  const projectListRef = useRef<ProjectListItem[]>([]);
  const dropdownOpenRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const activeSearchQueryRef = useRef("");
  const projectsCacheRef = useRef<Map<string, { list: ProjectListItem[]; totalRecords: number }>>(new Map());
  const searchInputRef = useRef<HTMLInputElement>(null);
  // Active deployment tab (holds a deployment sys_id; empty before deployments load).
  const [activeEnv, setActiveEnv] = useState("");
  // Deployed product rows currently expanded — tracked here (not just in the row) so a date-range
  // change can trigger a refetch for rows that are already open.
  const [expandedProductIds, setExpandedProductIds] = useState<Set<string>>(new Set());
  const [timeRange, setTimeRange] = useState<TimeRange>("1M");
  const [customFrom, setCustomFrom] = useState(daysAgoStr(30));
  const [customTo, setCustomTo] = useState(todayStr());
  const [pendingFrom, setPendingFrom] = useState(daysAgoStr(30));
  const [pendingTo, setPendingTo] = useState(todayStr());

  const dateFrom = timeRange === "Custom" ? customFrom : daysAgoStr(RANGE_DAYS[timeRange as Exclude<TimeRange, "Custom">]);
  const dateTo = timeRange === "Custom" ? customTo : todayStr();

  // Active deployment sys_id (empty until a deployment tab is selected).
  const activeDepId = activeEnv || undefined;

  const { data: projectsPage, loading: projectsLoading, postApiData: fetchProjectsPage } = usePostApi<ProjectsSearchResponse>({ url: "" });
  const fetchProjectsPageRef = useRef(fetchProjectsPage);
  fetchProjectsPageRef.current = fetchProjectsPage;

  const { data: deploymentsData, loading: deploymentsLoading, postApiData: fetchDeployments } = usePostApi<DeploymentsSearchResponse>({
    url: "",
  });

  // Authoritative list of deployed products for the active deployment tab
  const { data: deployedProductsData, loading: deployedProductsLoading, postApiData: fetchDeployedProducts } =
    usePostApi<DeployedProductsSearchResponse>({ url: "" });

  // Deployments with no deployed products aren't useful in this UI — filter them out
  const deployments = useMemo(() => (deploymentsData?.deployments ?? []).filter((d) => d.deployedProductCount > 0), [deploymentsData]);

  // Lazy per-deployedProduct instance details (OS/JDK/U2 level) — fires when a product row is expanded
  const {
    dataMap: prodInstances,
    loading: prodInstancesLoading,
    postAll: fetchProdInstances,
    clearAll: clearProdInstances,
  } = useParallelPostApi<SnInstancesResponse>();

  // Per-deployedProduct core/instance metrics (keyed by deployedProduct sys_id)
  const { dataMap: prodMetricsStats, loading: prodMetricsStatsLoading, postAll: fetchProdMetricsStats } =
    useParallelPostApi<SnDeployedProductMetricsResponse>();

  // Per-deployedProduct usage counts — Transactions/API Count/Total Users/etc (keyed by deployedProduct sys_id)
  const { dataMap: prodUsagesStats, loading: prodUsagesStatsLoading, postAll: fetchProdUsagesStats } =
    useParallelPostApi<SnDeployedProductUsageCountsResponse>();

  // Effects

  // Accumulate project pages — use the response's own offset to decide append vs. replace,
  // so out-of-order or duplicate responses can't corrupt the list.
  // After each batch, update the session cache so subsequent opens are instant.
  useEffect(() => {
    if (!projectsPage) return;
    loadingMoreRef.current = false;
    const incoming = projectsPage.projects ?? [];
    const base = projectsPage.offset === 0 ? [] : projectListRef.current;
    const newList = [...base, ...incoming];

    if (projectsPage.offset === 0) setProjectsSearching(false);
    setProjectList(newList);
    projectListRef.current = newList;
    projectsOffsetRef.current = projectsPage.offset + incoming.length;
    setProjectsHasMore(projectsOffsetRef.current < projectsPage.totalRecords);

    projectsCacheRef.current.set(activeSearchQueryRef.current, {
      list: newList,
      totalRecords: projectsPage.totalRecords,
    });
  }, [projectsPage]);

  // Debounced project search — only fires while the dropdown is open (typing inside it).
  // Skips the network call entirely on a cache hit.
  useEffect(() => {
    if (!dropdownOpenRef.current) return;
    const cacheKey = projectSearch.length >= 2 ? projectSearch : "";
    if (projectsCacheRef.current.has(cacheKey)) return; // already handled by onChange
    const timer = setTimeout(() => {
      projectsOffsetRef.current = 0;
      loadingMoreRef.current = false;
      activeSearchQueryRef.current = cacheKey;
      fetchProjectsPageRef.current(
        { filters: cacheKey ? { searchQuery: cacheKey } : {}, pagination: { offset: 0, limit: PROJECTS_PAGE_SIZE } },
        PROJECTS_URL,
      );
    }, DEBOUNCE_DELAY);
    return () => clearTimeout(timer);
  }, [projectSearch]);

  // Fetch deployments when project changes; clear the active tab until they load
  useEffect(() => {
    if (!selectedProjectId) return;
    fetchDeployments({ filters: { projectIds: [selectedProjectId] }, pagination: { offset: 0, limit: 50 } }, BASE + "/usage-metrics/deployments/search");
    setActiveEnv("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId]);

  // Default the active tab to the Production deployment once deployments load.
  useEffect(() => {
    const deps = deployments;
    if (deps.length === 0) return;
    const isProduction = (d: DeploymentItem) => (d.type?.label ?? "").toLowerCase() === "production" || (d.name ?? "").toLowerCase() === "production";
    const target = deps.find(isProduction) ?? deps[0];
    setActiveEnv((prev) => (prev && deps.some((d) => d.id === prev) ? prev : target.id));
  }, [deployments]);

  // Fetch all per-deployment and project-level data when deployments or date range changes.
  // Also clear lazy-loaded caches so re-expanding/re-clicking refetches with new dates.
  useEffect(() => {
    if (!selectedProjectId || !deploymentsData) return;
    const deps = deployments;
    if (deps.length === 0) return;

    // Default to the first deployment's tab once deployments are available
    const currentEnv = deps.some((d) => d.id === activeEnv) ? activeEnv : deps[0].id;
    if (currentEnv !== activeEnv) setActiveEnv(currentEnv);

    // (prodMetricsStats/prodUsagesStats are NOT cleared here: clearAll() is an async state
    // update, so the "Per-product core/instance metrics" effect below — which runs in the
    // same commit — would still see the pre-clear map and skip fetching. That effect instead
    // always does a full fetch on date change, which naturally replaces stale entries.)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId, deployments, dateFrom, dateTo]);

  // Collapse product rows and clear their instance cache when switching deployment tabs —
  // the previous tab's expanded ids/data don't apply to the new tab's products.
  useEffect(() => {
    clearProdInstances();
    setExpandedProductIds(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDepId]);

  // Refetch instances for any already-expanded product rows when the date range changes,
  // instead of only fetching on the collapsed→expanded transition (which would otherwise
  // leave an open row showing stale/empty instance data after a date-range change).
  useEffect(() => {
    if (expandedProductIds.size === 0) return;
    const ids = Array.from(expandedProductIds);
    fetchProdInstances(
      ids.map((id) => ({
        id,
        payload: {
          filters: { deployedProductIds: [id], startDate: dateFrom, endDate: dateTo },
          pagination: { offset: 0, limit: 50 },
        },
      })),
      BASE + "/usage-metrics/instances/search",
      false,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo]);

  // Fetch the authoritative deployed-products list for the active deployment tab.
  useEffect(() => {
    if (!activeDepId) return;
    fetchDeployedProducts({ filters: { deploymentIds: [activeDepId] }, pagination: { offset: 0, limit: 50 } }, BASE + "/usage-metrics/deployed-products/search");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDepId]);

  // Per-product core/instance metrics + usage counts, keyed by deployedProduct id.
  useEffect(() => {
    if (!activeDepId) return;
    const allProducts = deployedProductsData?.deployedProducts ?? [];
    // deployedProductsData is a single non-keyed result — after switching tabs it can still hold
    // the previous deployment's list for a moment. Filter to products that actually belong to
    // activeDepId, otherwise we'd pair a stale deployedProductId with the new deploymentId and
    // get a 404 (this also correctly excludes any product with a null deployment ref).
    const productsForActiveDep = allProducts.filter((p) => p.deployment?.id === activeDepId);
    if (productsForActiveDep.length === 0) return;
    const productIds = productsForActiveDep.map((p) => p.id);

    // Always fetch fresh (merge=false) — this effect only re-runs when something relevant
    // actually changed (deployment, products, or date range), so a full replace is correct
    // and avoids stale-cache guards racing with the async clearAll() in the effect above.
    const payload = { deploymentId: activeDepId, startDate: dateFrom, endDate: dateTo };
    fetchProdMetricsStats(
      productIds.map((id) => ({ id, payload })),
      (id: string) => BASE + `/usage-metrics/deployed-products/${id}/metrics/search`,
      false,
    );
    fetchProdUsagesStats(
      productIds.map((id) => ({ id, payload })),
      (id: string) => BASE + `/usage-metrics/deployed-products/${id}/metrics/usage-counts/search`,
      false,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDepId, deployedProductsData, dateFrom, dateTo]);

  // Handlers

  const handleProjectDropdownOpen = () => {
    dropdownOpenRef.current = true;
    setTimeout(() => searchInputRef.current?.focus(), 0);

    const cacheKey = projectSearch.length >= 2 ? projectSearch : "";
    const cached = projectsCacheRef.current.get(cacheKey);
    if (cached) {
      // Cache hit — restore instantly, no network call
      setProjectsSearching(false);
      setProjectList(cached.list);
      projectListRef.current = cached.list;
      projectsOffsetRef.current = cached.list.length;
      setProjectsHasMore(cached.list.length < cached.totalRecords);
      return;
    }

    projectsOffsetRef.current = 0;
    loadingMoreRef.current = false;
    setProjectsHasMore(false);
    setProjectsSearching(true);
    activeSearchQueryRef.current = cacheKey;
    fetchProjectsPageRef.current(
      { filters: cacheKey ? { searchQuery: cacheKey } : {}, pagination: { offset: 0, limit: PROJECTS_PAGE_SIZE } },
      PROJECTS_URL,
    );
  };

  const loadMoreProjects = () => {
    // Use a synchronous ref guard so rapid scroll events can't fire concurrent fetches
    // before projectsLoading (React state) has time to propagate through a re-render.
    if (loadingMoreRef.current || projectsLoading || !projectsHasMore) return;
    loadingMoreRef.current = true;
    const cacheKey = projectSearch.length >= 2 ? projectSearch : "";
    activeSearchQueryRef.current = cacheKey;
    fetchProjectsPageRef.current(
      { filters: cacheKey ? { searchQuery: cacheKey } : {}, pagination: { offset: projectsOffsetRef.current, limit: PROJECTS_PAGE_SIZE } },
      PROJECTS_URL,
    );
  };

  const handleProjectMenuScroll = (event: UIEvent<HTMLElement>) => {
    const el = event.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
      loadMoreProjects();
    }
  };

  const handleTabChange = (_: React.SyntheticEvent, val: string) => setActiveEnv(val);

  // Toggle a product row's expanded state; lazy-loads instance details (OS/JDK/U2 level) the
  // first time it's opened. Subsequent date-range changes are handled by the effect above.
  const handleProductToggle = (deployedProductId: string) => {
    setExpandedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(deployedProductId)) {
        next.delete(deployedProductId);
        return next;
      }
      next.add(deployedProductId);
      if (!prodInstances.has(deployedProductId)) {
        fetchProdInstances(
          [
            {
              id: deployedProductId,
              payload: {
                filters: { deployedProductIds: [deployedProductId], startDate: dateFrom, endDate: dateTo },
                pagination: { offset: 0, limit: 50 },
              },
            },
          ],
          BASE + "/usage-metrics/instances/search",
          true,
        );
      }
      return next;
    });
  };

  // Tabs: one per deployment (value = id, label = name)
  const envTabs = useMemo(() => deployments.map((d) => ({ value: d.id, label: d.name })), [deployments]);

  const activeDeployment = deployments.find((d) => d.id === activeEnv);

  //Product breakdown (specific deployment tab)

  const productBreakdown = useMemo((): Omit<ProductBreakdownRowProps, "expanded" | "onToggle">[] => {
    if (!activeEnv) return [];
    // Filter out stale entries — deployedProductsData can briefly still hold the previous
    // deployment's list right after switching tabs (see fetch effect above for details).
    const deployedProducts = (deployedProductsData?.deployedProducts ?? []).filter((p) => p.deployment?.id === activeEnv);
    if (deployedProducts.length === 0) return [];

    return deployedProducts.map((dp) => {
      const dpId = dp.id;
      const productName = dp.product?.name ?? "";
      const displayName = [productName, dp.version?.name].filter(Boolean).join(" ") || "Unknown";
      const version = dp.version?.name ?? extractVersion(undefined, productName);

      // Instance + core stats — from the per-product metrics/search chart data (server-side).
      const metricsResp = prodMetricsStats.get(dpId);
      const sortedChart = [...(metricsResp?.chartData ?? [])].sort((a, b) => a.date.localeCompare(b.date));

      const instanceStats: StatSummary = computeStats(sortedChart.map((p) => p.instanceCount));

      const coreStats: StatSummary = metricsResp?.summary
        ? {
            curr: sortedChart.length > 0 ? sortedChart[sortedChart.length - 1].totalCores ?? 0 : 0,
            avg: Math.round(metricsResp.summary.avgCores ?? 0),
            min: metricsResp.summary.minCores ?? 0,
            max: metricsResp.summary.maxCores ?? 0,
          }
        : { curr: 0, avg: 0, min: 0, max: 0 };

      // Metric summary tiles — driven by whichever count types the server actually returns for
      // this product, not a static per-product-type guess (which can miss keys the classifier
      // doesn't know about, e.g. TOTAL_B2B_ORGS on older IS versions). Known keys are ordered per
      // METRIC_CHART_CONFIG; any unrecognized keys are appended after.
      const usagesResp = prodUsagesStats.get(dpId);
      const countTypes = usagesResp?.summary.countTypes ?? {};
      const availableKeys = Object.keys(countTypes);
      const metricKeys = [
        ...KNOWN_METRIC_KEY_ORDER.filter((k) => availableKeys.includes(k)),
        ...availableKeys.filter((k) => !KNOWN_METRIC_KEY_ORDER.includes(k)),
      ];
      const usageChartData = usagesResp?.chartData ?? [];
      const summaryStats = metricKeys.map((key) => {
        const stat = countTypes[key];
        let value = 0;
        if (stat) {
          value =
            stat.aggregation === "sum"
              ? usageChartData.reduce((total, point) => total + (point.counts[key]?.value ?? 0), 0)
              : (stat[stat.aggregation as "min" | "max" | "avg"] ?? stat.avg);
        }
        return {
          label: METRIC_CHART_CONFIG[key]?.title ?? key,
          value: fmtNumber(value),
        };
      });

      return {
        id: dpId,
        name: displayName,
        version,
        summaryStats,
        metricKeys,
        instanceStats,
        coreStats,
      };
    });
  }, [activeEnv, deployedProductsData, prodMetricsStats, prodUsagesStats]);

  const mainLoading = deploymentsLoading;

  // Show loading on the deployment tab only while the deployed-products list is absent.
  // Instance/core stats from metrics/search start at zero and fill in silently once loaded.
  const prodBreakdownLoading = (() => {
    if (!activeDepId) return deploymentsLoading;
    return deployedProductsLoading || !deployedProductsData;
  })();

  // Render
  if (!isUserAllowedToViewUsageMetrics) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", py: 12 }}>
        <LockOutlinedIcon sx={{ fontSize: 52, color: "text.disabled", mb: 2 }} />
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Access Restricted
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Usage & Metrics data is restricted to authorized personnel only. This page is accessible to members of the
          Customer Success, Sales, and Sales Engineering teams.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Usage & Metrics
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Monitor transaction volumes and core usage across deployments
      </Typography>

      {/* Project selector with search */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" fontWeight={600} sx={{ mb: 0.75, color: "text.secondary" }}>
          Project
        </Typography>
        <FormControl sx={{ width: 380 }}>
          <Select
            value={selectedProjectId}
            onChange={(e: SelectChangeEvent) => {
              const id = e.target.value;
              const proj = projectList.find((p) => p.id === id);
              setSelectedProjectId(id);
              setSelectedProjectLabel(proj ? `${proj.key} – ${proj.name}` : id);
            }}
            displayEmpty
            onOpen={handleProjectDropdownOpen}
            onClose={() => {
              dropdownOpenRef.current = false;
              setProjectSearch("");
            }}
            renderValue={(val) => {
              if (!val) return <Typography color="text.secondary">Select a project to view metrics...</Typography>;
              return selectedProjectLabel || val;
            }}
            sx={{
              bgcolor: "background.paper",
              fontSize: 15,
              fontWeight: 500,
              "& .MuiOutlinedInput-notchedOutline": { borderColor: "#e96900", borderWidth: 1.5 },
              "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#c85a00" },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#e96900", borderWidth: 2 },
            }}
            MenuProps={{ autoFocus: false, PaperProps: { onScroll: handleProjectMenuScroll, sx: { maxHeight: 360 } } }}
          >
            <ListSubheader sx={{ pt: 1, pb: 0.5, px: 1, bgcolor: "background.paper" }}>
              <TextField
                size="small"
                fullWidth
                placeholder="Search projects..."
                value={projectSearch}
                onChange={(e) => {
                  const val = e.target.value;
                  setProjectSearch(val);
                  const cacheKey = val.length >= 2 ? val : "";
                  const cached = projectsCacheRef.current.get(cacheKey);
                  if (cached) {
                    setProjectsSearching(false);
                    setProjectList(cached.list);
                    projectListRef.current = cached.list;
                    projectsOffsetRef.current = cached.list.length;
                    setProjectsHasMore(cached.list.length < cached.totalRecords);
                  } else {
                    setProjectsSearching(true);
                  }
                }}
                inputRef={searchInputRef}
                onKeyDown={(e) => e.stopPropagation()}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }}
              />
            </ListSubheader>

            {projectsSearching && (
              <MenuItem disabled sx={{ justifyContent: "center", gap: 1, py: 2 }}>
                <CircularProgress size={16} />
                <Typography fontSize={13} color="text.secondary">
                  {projectSearch.length >= 2 ? "Searching..." : "Loading..."}
                </Typography>
              </MenuItem>
            )}

            {!projectsSearching &&
              projectList.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  <Box>
                    <Typography fontSize={13} fontWeight={600}>
                      {p.key}
                    </Typography>
                    <Typography fontSize={12} color="text.secondary">
                      {p.name}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}

            {!projectsSearching && !projectsLoading && projectList.length === 0 && (
              <MenuItem disabled>
                <Typography fontSize={13} color="text.secondary">
                  {projectSearch.length >= 2 ? "No projects found" : "No projects available"}
                </Typography>
              </MenuItem>
            )}

            {!projectsSearching && projectsLoading && (
              <MenuItem disabled sx={{ justifyContent: "center", gap: 1 }}>
                <CircularProgress size={14} />
                <Typography fontSize={13} color="text.secondary">
                  Loading more...
                </Typography>
              </MenuItem>
            )}
          </Select>
        </FormControl>
      </Box>

      {/* Main content */}
      {!selectedProjectId ? (
        <Box sx={{ textAlign: "center", py: 10 }}>
          <Typography color="text.secondary">Select a project to view usage and metrics.</Typography>
        </Box>
      ) : (
        <>
          {/* Environment / Deployment tabs */}
          <Paper variant="outlined" sx={{ mb: 3, borderRadius: 0, overflow: "hidden" }}>
            <Tabs
              value={activeEnv}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                borderBottom: 1,
                borderColor: "divider",
                "& .MuiTab-root": { textTransform: "none", fontWeight: 500, minWidth: 100 },
                "& .Mui-selected": { color: "#e96900", fontWeight: 700 },
                "& .MuiTabs-indicator": { backgroundColor: "#e96900" },
              }}
            >
              {envTabs.map((tab) => (
                <Tab key={tab.value} label={tab.label} value={tab.value} />
              ))}
            </Tabs>
          </Paper>

          {mainLoading ? (
            <LinearProgress />
          ) : envTabs.length === 0 ? (
            <Typography color="text.secondary" sx={{ mb: 4 }}>
              No deployment data available.
            </Typography>
          ) : (
            <>
              {/* Product Breakdown for the active deployment */}
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                {activeDeployment?.name}
                {activeDeployment?.type?.label && (
                  <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                    · {activeDeployment.type.label}
                  </Typography>
                )}
              </Typography>
              {/* Time Range row */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2, flexWrap: "wrap" }}>
                <CalendarTodayIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                  Time Range:
                </Typography>

                {(["1M", "3M", "6M", "12M"] as TimeRange[]).map((r) => (
                  <Button
                    key={r}
                    size="small"
                    onClick={() => setTimeRange(r)}
                    variant={timeRange === r ? "contained" : "outlined"}
                    sx={{
                      borderRadius: "20px",
                      textTransform: "none",
                      minWidth: 52,
                      fontWeight: timeRange === r ? 600 : 400,
                      ...(timeRange === r
                        ? {
                            bgcolor: "#e96900",
                            borderColor: "#e96900",
                            color: "white",
                            "&:hover": { bgcolor: "#d05800", borderColor: "#d05800" },
                          }
                        : {
                            borderColor: "divider",
                            color: "text.primary",
                            "&:hover": { borderColor: "#e96900", color: "#e96900", bgcolor: "transparent" },
                          }),
                    }}
                  >
                    {r}
                  </Button>
                ))}

                <Button
                  size="small"
                  onClick={() => {
                    if (timeRange !== "Custom") {
                      setPendingFrom(dateFrom);
                      setPendingTo(dateTo);
                      setTimeRange("Custom");
                    }
                  }}
                  variant={timeRange === "Custom" ? "contained" : "outlined"}
                  sx={{
                    borderRadius: "20px",
                    textTransform: "none",
                    minWidth: 64,
                    ...(timeRange === "Custom"
                      ? {
                          bgcolor: "#e96900",
                          borderColor: "#e96900",
                          color: "white",
                          "&:hover": { bgcolor: "#d05800", borderColor: "#d05800" },
                        }
                      : {
                          borderColor: "divider",
                          color: "text.primary",
                          "&:hover": { borderColor: "#e96900", color: "#e96900", bgcolor: "transparent" },
                        }),
                  }}
                >
                  Custom
                </Button>

                {timeRange === "Custom" && (
                  <>
                    <TextField
                      type="date"
                      size="small"
                      value={pendingFrom}
                      onChange={(e) => setPendingFrom(e.target.value)}
                      slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: MIN_ALLOWED_DATE, max: todayStr() } }}
                      sx={{ width: 150, "& .MuiOutlinedInput-root": { borderRadius: "8px" } }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      to
                    </Typography>
                    <TextField
                      type="date"
                      size="small"
                      value={pendingTo}
                      onChange={(e) => setPendingTo(e.target.value)}
                      slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: MIN_ALLOWED_DATE, max: todayStr() } }}
                      sx={{ width: 150, "& .MuiOutlinedInput-root": { borderRadius: "8px" } }}
                    />
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => {
                        setCustomFrom(pendingFrom);
                        setCustomTo(pendingTo);
                      }}
                      disabled={
                        !pendingFrom ||
                        !pendingTo ||
                        isNaN(new Date(pendingFrom).getTime()) ||
                        isNaN(new Date(pendingTo).getTime()) ||
                        new Date(pendingFrom) >= new Date(pendingTo) ||
                        new Date(pendingTo).getTime() - new Date(pendingFrom).getTime() > MAX_RANGE_DAYS * 86_400_000
                      }
                      sx={{
                        bgcolor: "#e96900",
                        "&:hover": { bgcolor: "#d05800" },
                        borderRadius: "8px",
                        textTransform: "none",
                        px: 2,
                      }}
                    >
                      Apply
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => setTimeRange("1M")}
                      sx={{ borderRadius: "8px", textTransform: "none", borderColor: "divider", color: "text.primary" }}
                    >
                      Cancel
                    </Button>
                    <Box sx={{ ml: "auto" }}>
                      <Typography variant="caption" color="text.secondary">
                        Custom Range: {customFrom} → {customTo}
                      </Typography>
                    </Box>
                    {new Date(pendingFrom) >= new Date(pendingTo) && (
                      <Alert severity="error" sx={{ mt: 1, width: "100%", borderRadius: "8px" }}>
                        Start date must be before end date.
                      </Alert>
                    )}
                    {new Date(pendingFrom) < new Date(pendingTo) &&
                      new Date(pendingTo).getTime() - new Date(pendingFrom).getTime() > MAX_RANGE_DAYS * 86_400_000 && (
                        <Alert severity="warning" sx={{ mt: 1, width: "100%", borderRadius: "8px" }}>
                          This dashboard supports a maximum date range of {MAX_RANGE_DAYS} days. Please adjust your
                          selection.
                        </Alert>
                      )}
                  </>
                )}
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Product breakdown for this deployment
              </Typography>

              {prodBreakdownLoading ? (
                <LinearProgress />
              ) : productBreakdown.length === 0 ? (
                <Typography color="text.secondary">No product data available for this deployment.</Typography>
              ) : (
                productBreakdown.map((p) => (
                  <ProductBreakdownRow
                    key={p.id}
                    {...p}
                    deploymentId={activeDepId}
                    coreMetrics={prodMetricsStats.get(p.id)}
                    usageCounts={prodUsagesStats.get(p.id)}
                    statsLoading={prodMetricsStatsLoading || prodUsagesStatsLoading}
                    instancesData={prodInstances.get(p.id)}
                    instancesLoading={prodInstancesLoading}
                    expanded={expandedProductIds.has(p.id)}
                    onToggle={() => handleProductToggle(p.id)}
                  />
                ))
              )}
            </>
          )}
        </>
      )}
    </Box>
  );
}

export default function SplUsageMetricsPage() {
  return (
    <SplShell>
      <UsageMetricsDashboard />
    </SplShell>
  );
}
