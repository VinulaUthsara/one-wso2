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

// Ported from SupportPortalLite's src/components/DefaultTable.tsx, scoped
// locally to the projects domain (each ported domain keeps its own copy
// rather than sharing one across features/spl/* — see the port's own
// per-domain isolation note in docs/ported-apps/spl.md). Trimmed to plain
// arrays only: the source's `caseDetailsWithCount` union branch is a Cases-
// domain concern this table never receives.
import type { ChangeEvent, MouseEvent } from "react";
import {
  Box,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TablePagination,
  TableRow,
  Alert,
  useTheme,
} from "@mui/material";
import FirstPageIcon from "@mui/icons-material/FirstPage";
import LastPageIcon from "@mui/icons-material/LastPage";
import KeyboardArrowLeft from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRight from "@mui/icons-material/KeyboardArrowRight";
import LinearLoading from "./LinearLoading";
import NoDataAvailable from "./NoDataAvailable";
import type { GetApiResponseError } from "@features/spl/api/useSplApi";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- row shape is caller-defined per table instance, same as the source's DataStruct index signature
export interface TableDataProps<T = any> {
  data: T[] | undefined;
  loading: boolean;
  error?: GetApiResponseError;
  page: number;
  setPage: (page: number) => void;
  rowsPerPage: number;
  setRowsPerPage: (rowsPerPage: number) => void;
  colNameArray: string[];
  colAttributeArray: string[];
  handleRowClick?: (rowData: T) => void;
}

export default function DefaultTable<T extends Record<string, unknown>>(props: TableDataProps<T>) {
  const handleChangePage = (_event: MouseEvent<HTMLButtonElement> | null, newPage: number) => {
    props.setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    props.setRowsPerPage(parseInt(event.target.value, 10));
    props.setPage(0);
  };

  if (props.loading) return <LinearLoading />;
  if (props.error) return <Alert severity="error">{props.error.message}</Alert>;
  if (!props.data) return null;

  return (
    <PopulateTable
      data={props.data}
      rowsPerPage={props.rowsPerPage}
      page={props.page}
      handleChangePage={handleChangePage}
      handleChangeRowsPerPage={handleChangeRowsPerPage}
      colNameArray={props.colNameArray}
      colAttributeArray={props.colAttributeArray}
      handleRowClick={props.handleRowClick}
    />
  );
}

function PopulateTable<T extends Record<string, unknown>>({
  data,
  rowsPerPage,
  page,
  handleChangePage,
  handleChangeRowsPerPage,
  colNameArray,
  colAttributeArray,
  handleRowClick,
}: {
  data: T[];
  rowsPerPage: number;
  page: number;
  handleChangePage: (event: MouseEvent<HTMLButtonElement> | null, newPage: number) => void;
  handleChangeRowsPerPage: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  colNameArray: string[];
  colAttributeArray: string[];
  handleRowClick?: (rowData: T) => void;
}) {
  const theme = useTheme();

  if (data.length === 0) {
    return (
      <NoDataAvailable
        message="No data available"
        description="There are no items to display. Try adjusting your filters or check back later."
      />
    );
  }

  const isDark = theme.palette.mode === "dark";
  const headerBg = isDark ? theme.palette.grey[800] : theme.palette.grey[300];
  const rowHoverBg = isDark ? "rgba(242, 92, 54, 0.18)" : "#f9dcc5";

  return (
    <Paper
      sx={{
        width: "100%",
        border: `2px solid ${theme.palette.divider}`,
        borderRadius: "8px",
        overflow: "hidden",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      }}
    >
      <TableContainer sx={{ maxHeight: "70vh", overflow: "auto", margin: 0, padding: 0 }}>
        <Table stickyHeader aria-label="sticky table" sx={{ margin: 0 }}>
          <TableHead>
            <TableRow>
              {colNameArray.map((value, index) => (
                <TableCell
                  key={index}
                  sx={{
                    backgroundColor: headerBg,
                    color: theme.palette.text.primary,
                    borderBottom: `2px solid ${headerBg}`,
                    fontWeight: "bold",
                    margin: 0,
                    padding: "12px 16px",
                  }}
                >
                  {value}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((dataRow, index) => (
              <TableRow
                key={index}
                onClick={() => handleRowClick?.(dataRow)}
                sx={{
                  ...(handleRowClick ? { cursor: "pointer" } : {}),
                  "&:nth-of-type(even)": { backgroundColor: theme.palette.action.hover },
                  "&:hover": { backgroundColor: rowHoverBg },
                  borderBottom: `1px solid ${theme.palette.divider}`,
                }}
              >
                {colAttributeArray.map((attributeName, i) => (
                  <TableCell key={i}>{String(dataRow[attributeName] ?? "")}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                count={-1}
                rowsPerPage={rowsPerPage}
                page={page}
                slotProps={{ select: { inputProps: { "aria-label": "rows per page" }, native: false } }}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                ActionsComponent={({ page: p, onPageChange }) => (
                  <PaginationActions page={p} rowsPerPage={rowsPerPage} onPageChange={onPageChange} currentDataLength={data.length} />
                )}
              />
            </TableRow>
          </TableFooter>
        </Table>
      </TableContainer>
    </Paper>
  );
}

function PaginationActions({
  page,
  rowsPerPage,
  onPageChange,
  currentDataLength,
}: {
  page: number;
  rowsPerPage: number;
  onPageChange: (event: MouseEvent<HTMLButtonElement>, newPage: number) => void;
  currentDataLength: number;
}) {
  const theme = useTheme();
  // No "last page" control: these list endpoints report no total count, same
  // as the source app's smart-pagination fallback for accounts/projects/cases.
  const isNextDisabled = currentDataLength < rowsPerPage;

  return (
    <Box sx={{ flexShrink: 0, ml: 2.5, display: "flex" }}>
      <IconButton onClick={(e) => onPageChange(e, 0)} disabled={page === 0} aria-label="first page">
        {theme.direction === "rtl" ? <LastPageIcon /> : <FirstPageIcon />}
      </IconButton>
      <IconButton onClick={(e) => onPageChange(e, page - 1)} disabled={page === 0} aria-label="previous page">
        {theme.direction === "rtl" ? <KeyboardArrowRight /> : <KeyboardArrowLeft />}
      </IconButton>
      <IconButton onClick={(e) => onPageChange(e, page + 1)} disabled={isNextDisabled} aria-label="next page">
        {theme.direction === "rtl" ? <KeyboardArrowLeft /> : <KeyboardArrowRight />}
      </IconButton>
    </Box>
  );
}
