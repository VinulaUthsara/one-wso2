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

// Matches @wso2/oxygen-ui's own OxygenThemeBase typography scale (see
// node_modules/@wso2/oxygen-ui/dist/index.js — base fontSize 14, every
// variant an offset from it) — not a coincidence, a deliberate match.
// Without this, SPL's plain-MUI Typography falls back to MUI's stock
// default scale (h4 = 34px vs oxygen-ui's 20px, nearly double), so SPL and
// the CSM/oxygen-ui side of this shared entry point rendered at visibly
// different text sizes despite living behind the same "csm" tile — cs-tools'
// own oxygen-ui port of SPL made that mismatch obvious side by side.
const SPL_FONT_SIZE = 14;
const splTypography = {
  fontFamily: "'Inter Variable', sans-serif",
  fontWeightRegular: 400,
  fontSize: SPL_FONT_SIZE,
  h1: { fontSize: `${(SPL_FONT_SIZE + 14) / 16}rem`, fontWeight: 400 },
  h2: { fontSize: `${(SPL_FONT_SIZE + 10) / 16}rem`, fontWeight: 400 },
  h3: { fontSize: `${(SPL_FONT_SIZE + 8) / 16}rem`, fontWeight: 400 },
  h4: { fontSize: `${(SPL_FONT_SIZE + 6) / 16}rem`, fontWeight: 400 },
  h5: { fontSize: `${(SPL_FONT_SIZE + 2) / 16}rem`, fontWeight: 400 },
  h6: { fontSize: `${SPL_FONT_SIZE / 16}rem`, fontWeight: 500 },
  subtitle1: { fontSize: `${(SPL_FONT_SIZE + 4) / 16}rem` },
  subtitle2: { fontSize: `${SPL_FONT_SIZE / 16}rem`, fontWeight: 400 },
  body1: { fontSize: `${SPL_FONT_SIZE / 16}rem` },
  body2: { fontSize: `${(SPL_FONT_SIZE - 1) / 16}rem`, fontWeight: 400 },
  button: { fontSize: `${SPL_FONT_SIZE / 16}rem`, fontWeight: 500, textTransform: "none" as const },
  caption: { fontSize: `${(SPL_FONT_SIZE - 3) / 16}rem`, fontWeight: 400 },
};

/** A real @mui/material theme, mode-matched to the app's live colour scheme. */
export function splMuiTheme(mode: SplColorScheme): Theme {
  const cached = cache.get(mode);
  if (cached) return cached;
  const theme = createTheme({ palette: { mode }, typography: splTypography });
  cache.set(mode, theme);
  return theme;
}
