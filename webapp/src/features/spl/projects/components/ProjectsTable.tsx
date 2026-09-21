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

// Ported from SupportPortalLite's src/components/list-views/ListProjects.tsx.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { splBackendUrl } from "@config/apiConfig";
import { useGetApi } from "@features/spl/api/useSplApi";
import DefaultTable from "./DefaultTable";
import ProjectSearch from "./ProjectSearch";
import type { ProjectDetails } from "../projectTypes";

export default function ProjectsTable() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [showTable, setShowTable] = useState(true);
  const navigate = useNavigate();

  const apiUrl = `${splBackendUrl}/projects?offset=${page * rowsPerPage}&limit=${rowsPerPage}`;
  const { data, loading, error, getApiData } = useGetApi<ProjectDetails[]>({ url: apiUrl });

  useEffect(() => {
    void getApiData(apiUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-fetch on pagination only, same as the source component
  }, [rowsPerPage, page]);

  return (
    <>
      <ProjectSearch setShowTable={setShowTable} />
      {showTable && (
        <DefaultTable
          data={data}
          loading={loading}
          error={error}
          page={page}
          setPage={setPage}
          rowsPerPage={rowsPerPage}
          setRowsPerPage={setRowsPerPage}
          colNameArray={["Number", "Name", "Key", "Start Date", "End Date", "Remaining Query Hours"]}
          colAttributeArray={["number", "name", "key", "startDate", "endDate", "remainingQueryHours"]}
          handleRowClick={(rowData) => navigate(`/csm/projects/${rowData.number}`)}
        />
      )}
    </>
  );
}
