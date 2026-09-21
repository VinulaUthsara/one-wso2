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

// Ported from the source app's
// src/components/list-views/account/ListAccountEscalations.tsx.
import { useEffect, useState } from "react";
import { useGetApi } from "@features/spl/api/useSplApi";
import { splBackendUrl } from "@config/apiConfig";
import type { EscalationDetails } from "../api/splAccountTypes";
import AccountsDataTable from "./AccountsDataTable";

export default function ListAccountEscalations({ id }: { id: string }) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const apiUrl = `${splBackendUrl}/accounts/${id}/escalations?offset=${page * rowsPerPage}&limit=${rowsPerPage}`;
  const { data, loading, error, getApiData } = useGetApi<EscalationDetails[]>({
    url: apiUrl,
    headers: { accept: "application/json" },
  });

  const colNameArray = ["ID", "Severity", "State", "Escalated Date"];
  const colAttributeArray = ["id", "severity", "state", "escalatedOn"];

  useEffect(() => {
    getApiData(apiUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apiUrl already reflects page/rowsPerPage
  }, [rowsPerPage, page]);

  return (
    <AccountsDataTable
      data={data}
      loading={loading}
      error={error}
      page={page}
      setPage={setPage}
      rowsPerPage={rowsPerPage}
      setRowsPerPage={setRowsPerPage}
      colNameArray={colNameArray}
      colAttributeArray={colAttributeArray}
    />
  );
}
