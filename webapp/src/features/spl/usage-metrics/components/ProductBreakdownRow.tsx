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

// Ported from the source app's components/usage-metrics/ProductBreakdownRow.tsx.
// One deliberate deviation: the trend chart was `react-chartjs-2`'s <Line>
// (chart.js) — neither is a one-wso2 dependency, which already standardizes
// on `recharts`. Reimplemented with recharts' LineChart, same data shape,
// axes, tooltip and stroke color per metric.

import { useMemo } from "react";
import { Box, Typography, Collapse, Grid, Paper, CircularProgress } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import DnsOutlinedIcon from "@mui/icons-material/DnsOutlined";
import ComputerOutlinedIcon from "@mui/icons-material/ComputerOutlined";
import CodeOutlinedIcon from "@mui/icons-material/CodeOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import { StatSummary, fmtNumber, fmtDate, cleanJdkVersion } from "../utils/formatters";
import { METRIC_CHART_CONFIG, METRIC_CHART_CONFIG_FALLBACK, CORE_CHART_CONFIG } from "../utils/usageMetricsProductClassifier";
import type { SnInstancesResponse, SnDeployedProductMetricsResponse, SnDeployedProductUsageCountsResponse } from "../api/splUsageMetricsTypes";
import { USAGE_ACCENT_FIXED } from "../utils/usageMetricsAccent";

// Max metric summary tiles shown in the collapsed header before collapsing the rest into "+N more".
const MAX_HEADER_TILES = 4;

// ─── Trend chart card (title + single line, no headline) ─────────────────────

interface TrendPoint {
  name: string;
  value: number;
}
interface TrendDef {
  title: string;
  stroke: string;
  data: TrendPoint[];
}

function yTickFormatter(v: number): string {
  return v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v);
}

const ProductTrendChart: React.FC<{ trend: TrendDef }> = ({ trend }) => {
  const theme = useTheme();
  // Gridline/tick colors were hardcoded light-canvas greys (#F3F4F6/#9CA3AF) —
  // near-invisible against a dark chart background. theme.palette.divider and
  // text.secondary track whichever mode is actually showing; the line's own
  // stroke color (trend.stroke) stays untouched, it's the series accent.
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 0, height: "100%" }}>
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
        {trend.title}
      </Typography>
      <Box sx={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trend.data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={theme.palette.divider} vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis
              tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={yTickFormatter}
            />
            <RTooltip
              formatter={(v) => fmtNumber(Number(v))}
              contentStyle={{
                backgroundColor: theme.palette.background.paper,
                borderColor: theme.palette.divider,
                color: theme.palette.text.primary,
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={trend.stroke}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};

// ─── Metric pill (icon + label + value) ──────────────────────────────────────

const MetricPill: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
    <Box sx={{ color: "text.disabled", display: "flex" }}>{icon}</Box>
    <Box>
      <Typography variant="caption" color="text.secondary" display="block" lineHeight={1.2}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600}>
        {value}
      </Typography>
    </Box>
  </Box>
);

// ─── Header stat block (Avg/Min/Max) ─────────────────────────────────────────

const StatGroup: React.FC<{ label: string; stats: StatSummary }> = ({ label, stats }) => (
  <Box sx={{ textAlign: "left", flexShrink: 0 }}>
    <Typography variant="body2" fontWeight={700} display="block" sx={{ mb: 0.5 }}>
      {label}
    </Typography>
    <Box sx={{ display: "flex", gap: 2 }}>
      {[
        { l: "Avg", v: stats.avg },
        { l: "Min", v: stats.min },
        { l: "Max", v: stats.max },
      ].map(({ l, v }) => (
        <Box key={l} sx={{ textAlign: "left" }}>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.25 }}>
            {l}
          </Typography>
          <Typography variant="body1" fontWeight={700}>
            {v}
          </Typography>
        </Box>
      ))}
    </Box>
  </Box>
);

export interface ProductBreakdownRowProps {
  id: string;
  name: string;
  version: string;
  /** Ordered metric summary tiles, one per classifier metric key (already formatted). */
  summaryStats: { label: string; value: string }[];
  /** Ordered metric keys for this product type — drives the trend charts. */
  metricKeys: string[];
  instanceStats: StatSummary;
  coreStats: StatSummary;
  deploymentId?: string;
  /** Core/instance-count chart data, scoped to this deployed product. */
  coreMetrics?: SnDeployedProductMetricsResponse;
  /** Usage-count chart data (transactions, users, orgs, etc.), scoped to this deployed product. */
  usageCounts?: SnDeployedProductUsageCountsResponse;
  /** True while coreMetrics/usageCounts are still being fetched for the active deployment. */
  statsLoading?: boolean;
  /** Per-instance metadata (OS/JDK/U2 level), scoped to this deployed product — lazy-loaded on expand. */
  instancesData?: SnInstancesResponse;
  instancesLoading?: boolean;
  /** Controlled expand/collapse state — lifted to the parent so date-range changes can refetch open rows. */
  expanded: boolean;
  onToggle: () => void;
}

export const ProductBreakdownRow: React.FC<ProductBreakdownRowProps> = ({
  name,
  version,
  summaryStats,
  metricKeys,
  instanceStats,
  coreStats,
  coreMetrics,
  usageCounts,
  statsLoading,
  instancesData,
  instancesLoading,
  expanded,
  onToggle,
}) => {
  const a = USAGE_ACCENT_FIXED;
  const theme = useTheme();

  // Per-product time-series trends: one chart per classifier metric key + Core Usage.
  const trends = useMemo((): TrendDef[] => {
    const result: TrendDef[] = [];

    // Core Usage (CPU) trend from the core-metrics chart data — always shown first.
    const sortedCoreChart = [...(coreMetrics?.chartData ?? [])].sort((a, b) => a.date.localeCompare(b.date));
    result.push({
      title: CORE_CHART_CONFIG.title,
      stroke: CORE_CHART_CONFIG.stroke,
      data: sortedCoreChart.map((p) => ({ name: fmtDate(p.date), value: p.totalCores ?? 0 })),
    });

    // One trend per classifier metric key, from the usage-counts chart data.
    const sortedUsageChart = [...(usageCounts?.chartData ?? [])].sort((a, b) => a.date.localeCompare(b.date));
    metricKeys.forEach((key) => {
      const cfg = METRIC_CHART_CONFIG[key] ?? METRIC_CHART_CONFIG_FALLBACK;
      result.push({
        title: cfg.title,
        stroke: cfg.stroke,
        data: sortedUsageChart.map((p) => ({ name: fmtDate(p.date), value: p.counts[key]?.value ?? 0 })),
      });
    });

    return result;
  }, [metricKeys, coreMetrics, usageCounts]);

  // Per-instance rows for this product — OS, Java version and U2 level from each instance snapshot.
  const instances = useMemo(() => {
    return (instancesData?.instances ?? []).map((inst) => {
      const dm = inst.metadata.deploymentMetadata;
      const keyDisplay = inst.key.length > 20 ? inst.key.slice(0, 12) + "…" : inst.key;

      const os = dm?.os ? (dm.osVersion ? `${dm.os} ${dm.osVersion}` : dm.os) : "—";

      return {
        instanceId: inst.id,
        keyDisplay,
        os,
        jdkVersion: cleanJdkVersion(inst.metadata.jdkVersion ?? dm?.jdkVersion) || "—",
        u2Level: dm?.updateLevel || "—",
      };
    });
  }, [instancesData]);

  // Fixed at 3 charts per row (wraps to additional rows as needed), except when there's only one.
  const chartGridSize = trends.length === 1 ? 12 : 4;

  // Cap the collapsed header to a fixed number of tiles (by priority order) so products with many
  // count types don't blow up the header's height — the full set is always in the drill-down charts.
  const visibleSummaryStats = summaryStats.slice(0, MAX_HEADER_TILES);
  const hiddenSummaryStatsCount = summaryStats.length - visibleSummaryStats.length;

  // Nothing to expand into if neither chart source has any data points for this range.
  const hasChartData = (coreMetrics?.chartData?.length ?? 0) > 0 || (usageCounts?.chartData?.length ?? 0) > 0;
  // Still waiting on stats fetches for this product — don't claim "not available" yet.
  const isLoadingStats = !!statsLoading && (coreMetrics === undefined || usageCounts === undefined);

  return (
    <Box sx={{ mb: 1.5 }}>
      {/* Header */}
      <Box
        onClick={hasChartData ? onToggle : undefined}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          p: 2,
          minHeight: 84,
          bgcolor: a.headerBg,
          border: `1px solid ${a.border}`,
          cursor: hasChartData ? "pointer" : "default",
          userSelect: "none",
          boxShadow: 1,
          "&:hover": hasChartData ? { bgcolor: a.headerHoverBg } : undefined,
        }}
      >
        {/* Product icon well + name + version */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: { lg: 240 }, flexShrink: 0 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              bgcolor: a.iconWellBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Inventory2OutlinedIcon sx={{ color: a.iconColor, fontSize: 20 }} />
          </Box>
          <Box sx={{ overflow: "hidden" }}>
            <Typography fontWeight={700} fontSize={14} noWrap color={a.title}>
              {name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {version ? `v${version}` : "—"}
            </Typography>
          </Box>
        </Box>

        {/* Metric summary tiles + Instance Metrics + CPU Usage, or a "no data" notice */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "flex-end",
            alignItems: "flex-start",
            gap: 5,
          }}
        >
          {isLoadingStats ? (
            <CircularProgress size={20} sx={{ color: a.iconColor }} />
          ) : !hasChartData ? (
            <Typography variant="body2" color="text.secondary" fontStyle="italic">
              Usage data is not available for this product
            </Typography>
          ) : (
            <>
              {visibleSummaryStats.map((stat) => (
                <Box key={stat.label}>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                    {stat.label}
                  </Typography>
                  <Typography variant="body1" fontWeight={700}>
                    {stat.value}
                  </Typography>
                </Box>
              ))}

              {hiddenSummaryStatsCount > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                    &nbsp;
                  </Typography>
                  <Typography variant="body1" fontWeight={700} color="text.secondary">
                    +{hiddenSummaryStatsCount} more
                  </Typography>
                </Box>
              )}

              <StatGroup label="Instance Metrics" stats={instanceStats} />
              <StatGroup label="CPU Usage" stats={coreStats} />
            </>
          )}
        </Box>

        {/* Expand chevron — hidden when there's no chart data to drill into */}
        {hasChartData && (
          <Box sx={{ color: a.iconColor, display: "flex", alignItems: "center", flexShrink: 0, ml: 1 }}>
            {expanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </Box>
        )}
      </Box>

      {/* Drill-down: charts + instance rows */}
      <Collapse in={expanded} unmountOnExit>
        <Box
          sx={{
            border: `1px solid ${a.border}`,
            borderTop: "none",
            bgcolor: "background.paper",
            p: 2,
          }}
        >
          {instancesLoading && !instancesData ? (
            <Box sx={{ py: 3, textAlign: "center" }}>
              <CircularProgress size={20} />
            </Box>
          ) : (
            <>
              {/* Trend charts */}
              {trends.length > 0 && (
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  {trends.map((t) => (
                    <Grid key={t.title} size={{ xs: 12, lg: chartGridSize }}>
                      <ProductTrendChart trend={t} />
                    </Grid>
                  ))}
                </Grid>
              )}

              {/* Instances */}
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
                Instances ({instances.length})
              </Typography>
              {instances.length === 0 ? (
                <Typography color="text.secondary" fontSize={13}>
                  No instance data available for this product.
                </Typography>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {instances.map((inst) => (
                    <Box
                      key={inst.instanceId}
                      sx={{
                        px: 2,
                        py: 1.5,
                        display: "flex",
                        flexDirection: { xs: "column", lg: "row" },
                        alignItems: { xs: "stretch", lg: "center" },
                        justifyContent: "space-between",
                        gap: 2,
                        border: `1px solid ${theme.palette.divider}`,
                        bgcolor: theme.palette.action.hover,
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: { lg: 200 } }}>
                        <DnsOutlinedIcon sx={{ color: "text.disabled", fontSize: 18 }} />
                        <Typography variant="body2" fontWeight={600} fontFamily="monospace" noWrap title={inst.instanceId}>
                          {inst.keyDisplay}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 5,
                          alignItems: "center",
                          justifyContent: { xs: "flex-start", lg: "flex-end" },
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <MetricPill icon={<ComputerOutlinedIcon sx={{ fontSize: 16 }} />} label="OS" value={inst.os} />
                        <MetricPill icon={<CodeOutlinedIcon sx={{ fontSize: 16 }} />} label="Java Version" value={inst.jdkVersion} />
                        <MetricPill icon={<Inventory2OutlinedIcon sx={{ fontSize: 16 }} />} label="U2 Level" value={inst.u2Level} />
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </>
          )}
        </Box>
      </Collapse>
    </Box>
  );
};
