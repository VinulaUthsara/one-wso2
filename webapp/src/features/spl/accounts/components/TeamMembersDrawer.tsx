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

// Ported from the source app's src/components/TeamMembersDrawer.tsx.
import { useEffect } from "react";
import {
  Avatar,
  Box,
  CircularProgress,
  Drawer,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useGetApi } from "@features/spl/api/useSplApi";
import { splBackendUrl } from "@config/apiConfig";
import type { ABTTeamMembersDetails } from "../api/splAccountTypes";

export default function TeamMembersDrawer({
  open,
  onClose,
  teamName,
  teamId,
}: {
  open: boolean;
  onClose: () => void;
  teamName: string;
  teamId: string;
}) {
  const apiUrl = `${splBackendUrl}/abt-team-members?teamId=${encodeURIComponent(teamId)}`;
  const { data, loading, error, getApiData } = useGetApi<ABTTeamMembersDetails[]>({
    url: apiUrl,
    headers: { accept: "application/json" },
  });

  useEffect(() => {
    getApiData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch once on mount, same as the source
  }, []);

  const capitalize = (item: string) => item.charAt(0).toUpperCase() + item.slice(1);
  const theme = useTheme();
  // Source's role badge (#e0f7fa/#00796b) was a light-canvas-only pastel
  // pairing — swap to a dark-mode-appropriate teal pair rather than leaving
  // a pale chip stranded on a dark background.
  const roleBadgeColors =
    theme.palette.mode === "dark"
      ? { backgroundColor: "#1a3c3c", color: "#80cbc4" }
      : { backgroundColor: "#e0f7fa", color: "#00796b" };

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 400, p: 5, mt: 10 }}>
        <Box sx={{ display: "flex", justifyContent: "center", mb: 2.5, textDecoration: "underline" }}>
          <Typography variant="h4" fontWeight="bold">
            {teamName}
          </Typography>
        </Box>
        <Typography variant="h5" gutterBottom>
          Team Members
        </Typography>
        {loading ? (
          <Stack alignItems="center" sx={{ mt: 4 }}>
            <CircularProgress size={20} />
          </Stack>
        ) : error ? (
          <Typography variant="body2" color="text.secondary">
            {error.status === 404 ? "Team not found." : "Couldn't load team members."}
          </Typography>
        ) : (
          <List>
            {data?.map((member, index) => (
              <ListItem key={index}>
                <ListItemAvatar>
                  <Avatar alt={member.name} src={member.employeeThumbnail} />
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      {member.name.replace(" ⓦ", "")}
                      {member.role && (
                        <Box
                          component="span"
                          sx={{
                            ml: 1,
                            px: 1,
                            py: 0.3,
                            borderRadius: "10px",
                            fontSize: "0.75rem",
                            fontWeight: "bold",
                            ...roleBadgeColors,
                          }}
                        >
                          {capitalize(member.role)}
                        </Box>
                      )}
                    </Box>
                  }
                  secondary={member.email}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </Drawer>
  );
}
