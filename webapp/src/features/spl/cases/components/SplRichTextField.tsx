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

// The source app's CaseView work-note composer uses react-quilljs's
// useQuill hook (an uncontrolled ref-based editor). One-wso2 already
// standardizes on react-quill-new's controlled <ReactQuill value/onChange>
// component for rich text (see features/par/components/ParRichTextField.tsx)
// — same toolbar (header sizes, bold/italic/underline/strike, ordered/
// bullet list) as the source's own `options.modules.toolbar`, adapted to
// that component instead of adding react-quilljs as a second rich-text
// dependency. Plain MUI Box styling (not oxygen-ui) to match this port's
// visual-fidelity decision.
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { Box } from "@mui/material";

const MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, 4, 5, 6, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
  ],
};
const FORMATS = ["header", "bold", "italic", "underline", "strike", "list", "bullet"];

export default function SplRichTextField({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  return (
    <Box
      sx={{
        "& .ql-container": { minHeight: 100, fontSize: "inherit" },
        "& .ql-editor": { minHeight: 100 },
      }}
    >
      <ReactQuill theme="snow" value={value} onChange={onChange} modules={MODULES} formats={FORMATS} />
    </Box>
  );
}
