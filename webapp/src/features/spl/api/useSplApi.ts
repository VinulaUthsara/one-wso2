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

// Drop-in replacement for SupportPortalLite's own src/data/hooks/api.ts —
// same three hooks, same signatures, same {data, loading, error} shape, so
// every ported page's call sites (`getApiData(url)`, `.data`, `.loading`,
// `.error.message`) carry over unchanged from the source app. Only the
// plumbing underneath differs:
//
//   - Identity: one-wso2's own useAccessToken() (Asgardeo React SDK) instead
//     of @asgardeo/auth-react's useAuthContext(). The header sent is
//     `Authorization: Bearer <token>`, not a manually-set `x-jwt-assertion` —
//     every other ported backend in this app (see csmBackendUrl's comment in
//     apiConfig.ts) sits behind the same Choreo gateway rewrite from Bearer
//     to x-jwt-assertion, so setting it here would be redundant at best and
//     wrong if the gateway ever changes its rewrite rule.
//   - Transport: fetch instead of the Asgardeo SDK's axios-like
//     httpRequest(), since that SDK isn't part of this app's auth story.
//   - Offline data: when isSplBackendConfigured() is false, every call
//     routes to splMockApi.ts's in-memory fixture instead of the network —
//     see mockSplRequest. Pages never need to know which mode they're in.
//
// Ported pages call these against relative paths built from splBackendUrl
// (e.g. `${splBackendUrl}/accounts`), exactly as the source app built them
// from RESOURCE_SERVER_URLS[0]. When unconfigured, splBackendUrl is "", so
// those become root-relative paths like "/accounts" — which is exactly what
// mockSplRequest expects (see its own doc comment).

import { useCallback, useRef, useState } from "react";
import { useAccessToken } from "@hooks/useAccessToken";
import { isSplBackendConfigured } from "@config/apiConfig";
import { mockSplRequest, SplMockError } from "./splMockApi";

export interface GetApiRequest {
  url: string;
  headers?: Record<string, string>;
}

export interface GetApiResponseError {
  message: string;
  status: number;
}

interface GetApiResponse<T> {
  data?: T;
  loading: boolean;
  error?: GetApiResponseError;
  getApiData: (url?: string, headers?: Record<string, string>) => Promise<void>;
}

interface PostApiResponse<T> {
  data?: T;
  loading: boolean;
  error?: GetApiResponseError;
  postApiData: (payload: unknown, url?: string, headers?: Record<string, string>) => Promise<void>;
}

async function performRequest<T>(
  method: "GET" | "POST" | "PUT",
  url: string,
  getAccessToken: () => Promise<string>,
  headers: Record<string, string>,
  payload?: unknown,
): Promise<T> {
  if (!isSplBackendConfigured()) {
    try {
      return mockSplRequest(method, url, payload) as T;
    } catch (err) {
      if (err instanceof SplMockError) {
        throw { response: { status: err.status, data: { message: err.message } } };
      }
      throw err;
    }
  }

  const token = await getAccessToken();
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: { ...headers, Authorization: `Bearer ${token}` },
      body: payload !== undefined ? JSON.stringify(payload) : undefined,
    });
  } catch {
    // fetch itself threw — a network failure, no response was ever received.
    throw { request: true };
  }

  if (!response.ok) {
    let data: { message?: string } = {};
    try {
      data = await response.json();
    } catch {
      // Non-JSON error body — fall through with an empty message.
    }
    throw { response: { status: response.status, data } };
  }

  // A 204 or an empty body is valid for some of these endpoints (e.g. the
  // customer-health init-health-tracking POST) — guard against parsing "".
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

function toApiError(error: unknown): GetApiResponseError {
  const err = error as { response?: { status: number; data?: { message?: string } }; request?: boolean };
  if (err?.response) {
    return { message: err.response.data?.message ?? "Something went wrong.", status: err.response.status };
  }
  if (err?.request) {
    return { message: "error while sending the request", status: 0 };
  }
  return { message: "unexpected error occured while invoking the api", status: 0 };
}

// A few source components (ReviewStatusCell, ActionItemsSection — the
// customer-health risk/action-item mutations, including the two PUT
// endpoints) call `useAuthContext()`'s `httpRequest`/`getAccessToken`
// directly instead of going through the three hooks above, managing their
// own local loading state. This is the equivalent low-level escape hatch,
// same {url, method, headers, data} shape as the Asgardeo SDK's
// httpRequest, routed through the same performRequest (so it gets the same
// mock-fallback and Bearer-token handling as everything else here).
export interface SplHttpRequestOptions {
  url: string;
  method?: "GET" | "POST" | "PUT";
  headers?: Record<string, string>;
  data?: unknown;
}

export function useSplHttpRequest(): <T>(opts: SplHttpRequestOptions) => Promise<T> {
  const getAccessToken = useAccessToken();
  return useCallback(
    <T,>(opts: SplHttpRequestOptions): Promise<T> =>
      performRequest<T>(opts.method ?? "GET", opts.url, getAccessToken, opts.headers ?? {}, opts.data),
    [getAccessToken],
  );
}

export function useGetApi<T>(initialReq: GetApiRequest): GetApiResponse<T> {
  const getAccessToken = useAccessToken();
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<GetApiResponseError>();
  const reqRef = useRef(initialReq);

  const getApiData = useCallback(
    async (url?: string, headers?: Record<string, string>) => {
      const currentUrl = url || reqRef.current.url;
      const currentHeaders = headers || reqRef.current.headers || {};
      setLoading(true);
      setError(undefined);
      try {
        const result = await performRequest<T>("GET", currentUrl, getAccessToken, currentHeaders);
        setData(result);
      } catch (err) {
        setError(toApiError(err));
      } finally {
        setLoading(false);
      }
    },
    [getAccessToken],
  );

  return { data, loading, error, getApiData };
}

export function usePostApi<T>(initialReq: GetApiRequest): PostApiResponse<T> {
  const getAccessToken = useAccessToken();
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<GetApiResponseError>();
  const reqRef = useRef(initialReq);

  const postApiData = useCallback(
    async (payload: unknown, url?: string, headers?: Record<string, string>) => {
      const currentUrl = url || reqRef.current.url;
      const currentHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(headers || reqRef.current.headers || {}),
      };
      setLoading(true);
      setError(undefined);
      try {
        const result = await performRequest<T>("POST", currentUrl, getAccessToken, currentHeaders, payload);
        setData(result);
      } catch (err) {
        setError(toApiError(err));
      } finally {
        setLoading(false);
      }
    },
    [getAccessToken],
  );

  return { data, loading, error, postApiData };
}

interface ParallelPostApiResponse<T> {
  dataMap: Map<string, T>;
  loading: boolean;
  /** When merge=true, only fetches IDs not already in the map and merges results in. `url` may be a per-item builder for path-param endpoints. */
  postAll: (items: { id: string; payload: unknown }[], url: string | ((id: string) => string), merge?: boolean) => Promise<void>;
  clearAll: () => void;
}

export function useParallelPostApi<T>(): ParallelPostApiResponse<T> {
  const getAccessToken = useAccessToken();
  const [dataMap, setDataMap] = useState<Map<string, T>>(new Map());
  const [loading, setLoading] = useState(false);
  const generationRef = useRef(0);
  const dataMapRef = useRef(dataMap);
  dataMapRef.current = dataMap;

  const clearAll = () => setDataMap(new Map());

  const postAll = useCallback(
    async (
      items: { id: string; payload: unknown }[],
      url: string | ((id: string) => string),
      merge = false,
    ) => {
      const toFetch = merge ? items.filter(({ id }) => !dataMapRef.current.has(id)) : items;
      if (toFetch.length === 0) return;

      const generation = ++generationRef.current;
      const headers = { "Content-Type": "application/json", Accept: "application/json" };
      setLoading(true);
      try {
        const results = await Promise.all(
          toFetch.map(async ({ id, payload }) => {
            try {
              const itemUrl = typeof url === "function" ? url(id) : url;
              const data = await performRequest<T>("POST", itemUrl, getAccessToken, headers, payload);
              return { id, data };
            } catch {
              return { id, data: null as unknown as T };
            }
          }),
        );
        if (generation !== generationRef.current) return;
        if (merge) {
          setDataMap((prev) => {
            const merged = new Map(prev);
            results.forEach(({ id, data }) => {
              if (data !== null) merged.set(id, data);
            });
            return merged;
          });
        } else {
          const newMap = new Map<string, T>();
          results.forEach(({ id, data }) => {
            if (data !== null) newMap.set(id, data);
          });
          setDataMap(newMap);
        }
      } finally {
        if (generation === generationRef.current) setLoading(false);
      }
    },
    [getAccessToken],
  );

  return { dataMap, loading, postAll, clearAll };
}
