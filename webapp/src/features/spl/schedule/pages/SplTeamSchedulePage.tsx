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

// Ported from SupportPortalLite's src/pages/ScheduleTable.tsx — see
// docs/ported-apps/spl.md. Routed at both csm/team-schedule and
// csm/team-schedule/:sysId (the source's one route with an optional :sysId?
// param is declared as two routes to this same element in App.tsx).
import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  tooltipClasses,
  Typography,
  type TooltipProps,
} from "@mui/material";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { type Dayjs } from "dayjs";
import styled from "@emotion/styled";
import { useParams } from "react-router";
import DOMPurify from "dompurify";
import SplShell from "@features/spl/components/SplShell";
import { splBackendUrl } from "@config/apiConfig";
import { useGetApi } from "@features/spl/api/useSplApi";
import type { ABTTeamScheduleList } from "../scheduleTypes";
import "../ScheduleTable.css";

enum EventType {
  Default = "ops_default",
  Engagement = "engagement",
  Evening = "ops_evening",
  Exclude = "exclude",
  TimeOff = "time_off",
  TimeOffEvening = "time_off_evening",
  TimeOffMorning = "time_off_morning",
  Morning = "ops_morning",
  Night = "ops_night",
  WeekendNight = "ops_weekend_night",
  Weekend = "ops_weekend",
}

function getBackgroundColor(eventType: string): string {
  switch (eventType) {
    case EventType.Default:
      return "#F0EAE6";
    case EventType.Engagement:
      return "#E6F0EA";
    case EventType.Evening:
      return "#E1F8DC";
    case EventType.Exclude:
    case EventType.TimeOff:
    case EventType.TimeOffEvening:
    case EventType.TimeOffMorning:
      return "#F7D8BA";
    case EventType.Morning:
      return "#ACDDDE";
    case EventType.Night:
    case EventType.WeekendNight:
      return "#CAF1DE";
    case EventType.Weekend:
      return "#FFE7C7";
    default:
      return "#F0EAE6";
  }
}

function formatDates(dates: string[]): string[] {
  return dates.map((date) => dayjs(date).format("ddd, D MMM"));
}

function getUniqueDates(list: ABTTeamScheduleList[]): string[] {
  const datesSet = new Set<string>();
  list.forEach((listItem) => {
    listItem.members.forEach((member) => {
      Object.keys(member.schedule).forEach((date) => datesSet.add(date));
    });
  });
  return Array.from(datesSet);
}

const BlackTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} arrow classes={{ popper: className }} />
))(() => ({
  [`& .${tooltipClasses.arrow}`]: {
    color: "#212A30",
  },
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: "#212A30",
    fontSize: "12px",
  },
}));

function SplTeamScheduleContent() {
  const { sysId } = useParams<{ sysId?: string }>();
  const [teamId, setTeamId] = useState(sysId ? DOMPurify.sanitize(sysId) : "");
  const [duration, setDuration] = useState("");
  const [from, setFrom] = useState<string>(new Date().toLocaleDateString("en-CA"));
  const [eventType, setEventType] = useState("");

  const apiUrl = `${splBackendUrl}/abt-team-schedule?teamId=${teamId}&from=${from}&duration=${duration}&eventType=${eventType}`;
  const { data, loading, error, getApiData } = useGetApi<{
    list: ABTTeamScheduleList[];
    metadata: { teams: { id: string; label: string }[]; eventTypes: { name: string; label: string }[] }[];
    snURL: string;
  }>({ url: apiUrl, headers: { accept: "application/json" } });

  const serviceNowUrl = (data?.snURL ?? "") + teamId;

  useEffect(() => {
    void getApiData(apiUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ported 1:1 from the source's own dependency list
  }, [teamId, duration, eventType, from]);

  const uniqueDates = getUniqueDates(data?.list ?? []);
  const headerDates = formatDates(uniqueDates);

  const handleFromChange = (newValue: Dayjs | null) => {
    if (newValue) setFrom(newValue.format("YYYY-MM-DD"));
  };

  const handleSNUrlClick = () => window.open(serviceNowUrl, "_blank");

  return (
    <Box className="schedule-app-container">
      <Box sx={{ display: "flex", gap: 4, alignItems: "center", margin: "15px" }}>
        <Box sx={{ display: "flex", gap: 4, alignItems: "center", margin: "15px", width: "70%" }}>
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel id="schedule-team-label" sx={{ fontWeight: "bold" }}>
              Team
            </InputLabel>
            <Select
              labelId="schedule-team-label"
              value={teamId}
              label="Team"
              onChange={(e) => setTeamId(e.target.value)}
              autoWidth
            >
              <MenuItem value="">
                <em>All</em>
              </MenuItem>
              {data?.metadata[0]?.teams.map((team) => (
                <MenuItem value={team.id} key={team.id}>
                  {team.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 180 }}>
            <InputLabel id="schedule-allocation-label" sx={{ fontWeight: "bold" }}>
              Allocation Type
            </InputLabel>
            <Select
              labelId="schedule-allocation-label"
              value={eventType}
              label="Allocation Type"
              onChange={(e) => setEventType(e.target.value)}
              autoWidth
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {data?.metadata[0]?.eventTypes.map((event) => (
                <MenuItem value={event.name} key={event.name}>
                  {event.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel id="schedule-duration-label" sx={{ fontWeight: "bold" }}>
              Duration
            </InputLabel>
            <Select
              labelId="schedule-duration-label"
              value={duration}
              label="Duration"
              onChange={(e) => setDuration(e.target.value)}
              autoWidth
            >
              <MenuItem value="1">1 Week</MenuItem>
              <MenuItem value="2">2 Weeks</MenuItem>
              <MenuItem value="3">3 Weeks</MenuItem>
              <MenuItem value="4">4 Weeks</MenuItem>
            </Select>
          </FormControl>

          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker label="From" value={dayjs(from)} onChange={handleFromChange} />
          </LocalizationProvider>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "flex-end", marginLeft: "35px" }} width="20%">
          <BlackTooltip title="ServiceNow access is required" placement="top" arrow>
            <Button
              size="small"
              onClick={handleSNUrlClick}
              sx={{
                color: "#e96900",
                fontSize: "15px",
                marginLeft: "-5px",
                fontWeight: "bold",
                ":hover": { bgcolor: "#e96900", borderColor: "primary.main", color: "white" },
              }}
            >
              Open in ServiceNow
            </Button>
          </BlackTooltip>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <Typography variant="body1" color="text.secondary">
            Loading…
          </Typography>
        </Box>
      ) : error ? (
        <Typography sx={{ mt: 4, textAlign: "center" }} color="error">
          {error.status === 404 ? "Item not found." : "Something went wrong."}
        </Typography>
      ) : (
        data && (
          <TableContainer component={Paper} className="schedule-table-container">
            <Table stickyHeader>
              <TableHead className="schedule-table-header">
                <TableRow>
                  <TableCell className="schedule-header-cell">Team</TableCell>
                  <TableCell className="schedule-header-cell">Member</TableCell>
                  {headerDates.map((day) => (
                    <TableCell key={day} className="schedule-header-cell">
                      {day}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {data.list.map((team, teamIndex) => (
                  <React.Fragment key={teamIndex}>
                    {team.members.map((member, memberIndex) => (
                      <TableRow key={memberIndex}>
                        {memberIndex === 0 && (
                          <TableCell
                            rowSpan={team.members.length}
                            className="schedule-team-cell schedule-sticky-column"
                          >
                            {team.label}
                          </TableCell>
                        )}
                        <TableCell className="schedule-team-cell schedule-sticky-column">
                          {member.name}
                          {member.roles[0] && (
                            <span
                              style={{
                                marginLeft: "8px",
                                padding: "3px 8px",
                                backgroundColor: "#e0f7fa",
                                borderRadius: "10px",
                                fontSize: "0.8rem",
                                fontWeight: "bold",
                                color: "#036300",
                              }}
                            >
                              {member.roles[0].label}
                            </span>
                          )}
                        </TableCell>
                        {uniqueDates.map((day) => (
                          <TableCell key={day} className="schedule-table-cell">
                            {member.schedule[day] ? (
                              member.schedule[day].map((schedule, scheduleIndex) => (
                                <span
                                  key={scheduleIndex}
                                  style={{
                                    marginLeft: "8px",
                                    padding: "4px 40px",
                                    backgroundColor: getBackgroundColor(schedule.name),
                                    borderRadius: "10px",
                                    fontSize: "0.85rem",
                                    color: "black",
                                    display: "inline-block",
                                    marginBottom: "4px",
                                  }}
                                >
                                  {schedule.label}
                                </span>
                              ))
                            ) : (
                              <span
                                style={{
                                  marginLeft: "8px",
                                  padding: "4px 40px",
                                  backgroundColor: "#F0EAE6",
                                  borderRadius: "10px",
                                  fontSize: "0.85rem",
                                  color: "black",
                                }}
                              >
                                Default
                              </span>
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )
      )}
    </Box>
  );
}

export default function SplTeamSchedulePage() {
  return (
    <SplShell>
      <SplTeamScheduleContent />
    </SplShell>
  );
}
