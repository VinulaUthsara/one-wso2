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

import { useEffect, useState } from "react";

export type SplColorScheme = "light" | "dark";

function readColorScheme(): SplColorScheme {
  return document.documentElement.getAttribute("data-color-scheme") === "dark" ? "dark" : "light";
}

// Why this exists: SPL is plain @mui/material (see SplShell's own header
// comment on why), but @wso2/oxygen-ui bundles its OWN copy of
// @mui/material (webapp depends on 7.3.4 directly; oxygen-ui vendors its own
// under node_modules/@wso2/oxygen-ui/node_modules/@mui) — two separate
// module instances, so OxygenUIThemeProvider's React context is invisible to
// every plain `@mui/material` import in this app. Without this, every SPL
// component always renders MUI's stock DEFAULT theme (light), regardless of
// what the rest of the app is showing — which is exactly the "some boxes
// still white" bug in dark mode: Card/Paper/Table defaults come from that
// stock light theme, not from whatever the user actually picked.
//
// Oxygen's ColorSchemeToggle (see ThemePreferenceContext.tsx) sets
// `data-color-scheme` on <html> when the user switches modes — the one
// signal that crosses the module-copy boundary, since it's a DOM attribute,
// not a React context. Polling it via MutationObserver is the only way to
// react to a live toggle from outside that context.
export function useSplColorScheme(): SplColorScheme {
  const [scheme, setScheme] = useState<SplColorScheme>(readColorScheme);

  useEffect(() => {
    const observer = new MutationObserver(() => setScheme(readColorScheme()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-color-scheme"],
    });
    return () => observer.disconnect();
  }, []);

  return scheme;
}
