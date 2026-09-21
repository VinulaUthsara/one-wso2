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

import { createTheme, type Theme } from "@mui/material/styles";
import type { SplColorScheme } from "./useSplColorScheme";

// Two possible values, so a plain memo table beats recomputing createTheme()
// (not free) on every SplShell render.
const cache = new Map<SplColorScheme, Theme>();

/** A real @mui/material theme, mode-matched to the app's live colour scheme. */
export function splMuiTheme(mode: SplColorScheme): Theme {
  const cached = cache.get(mode);
  if (cached) return cached;
  const theme = createTheme({ palette: { mode } });
  cache.set(mode, theme);
  return theme;
}
