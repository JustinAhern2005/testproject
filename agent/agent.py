"""
Document Analysis Agent
Processes large collections of files (100k+ pages) and extracts structured output.

Usage:
    python agent.py --input-dir ./docs --output results.json --prompt "Extract all contract dates and parties"
    python agent.py --input-dir ./docs --output results.csv --format csv --prompt "Summarize key findings per document"
"""

import anthropic
import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

MODEL = "claude-opus-4-7"

SUPPORTED_EXTENSIONS = {
    ".pdf": "application/pdf",
    ".txt": "text/plain",
    ".md": "text/plain",
    ".csv": "text/plain",
    ".json": "text/plain",
    ".html": "text/html",
    ".xml": "text/plain",
    ".py": "text/plain",
    ".js": "text/plain",
    ".ts": "text/plain",
}

# Max files to process in a single agent run before writing a checkpoint.
BATCH_SIZE = 20


# ---------------------------------------------------------------------------
# Tool definitions
# ---------------------------------------------------------------------------

TOOLS = [
    {
        "name": "list_files",
        "description": (
            "List all files available for analysis in the input directory. "
            "Returns file paths, sizes, and MIME types. Call this first to understand the corpus."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "page": {
                    "type": "integer",
                    "description": f"Page number (1-indexed). Each page contains up to {BATCH_SIZE} files.",
                },
            },
            "required": ["page"],
        },
    },
    {
        "name": "read_file",
        "description": (
            "Read the full text content of a file. For binary files (PDF, images) "
            "this returns a base64-encoded representation for Claude to analyse."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Relative or absolute file path."},
            },
            "required": ["path"],
        },
    },
    {
        "name": "write_output",
        "description": (
            "Append one or more result records to the output file. "
            "Call this incrementally as you finish analyzing each document — "
            "do not wait until all files are processed."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "records": {
                    "type": "array",
                    "description": "List of result objects. Each object must have a 'source_file' key.",
                    "items": {"type": "object"},
                },
            },
            "required": ["records"],
        },
    },
    {
        "name": "mark_done",
        "description": "Signal that all files have been analyzed and the output is complete.",
        "input_schema": {
            "type": "object",
            "properties": {
                "summary": {"type": "string", "description": "Brief summary of what was found."},
            },
            "required": ["summary"],
        },
    },
]


# ---------------------------------------------------------------------------
# Tool implementations
# ---------------------------------------------------------------------------

class DocumentAgent:
    def __init__(self, input_dir: str, output_path: str, output_format: str):
        self.input_dir = Path(input_dir).resolve()
        self.output_path = Path(output_path)
        self.output_format = output_format  # "json" | "csv" | "jsonl"
        self.client = anthropic.Anthropic()
        self.results: list[dict] = []
        self._file_list: list[dict] | None = None

    # ------------------------------------------------------------------
    # File helpers
    # ------------------------------------------------------------------

    def _build_file_list(self) -> list[dict]:
        if self._file_list is not None:
            return self._file_list
        files = []
        for p in sorted(self.input_dir.rglob("*")):
            if p.is_file() and p.suffix.lower() in SUPPORTED_EXTENSIONS:
                files.append({
                    "path": str(p),
                    "relative_path": str(p.relative_to(self.input_dir)),
                    "size_bytes": p.stat().st_size,
                    "mime_type": SUPPORTED_EXTENSIONS[p.suffix.lower()],
                })
        self._file_list = files
        return files

    # ------------------------------------------------------------------
    # Tool handlers
    # ------------------------------------------------------------------

    def handle_list_files(self, page: int) -> dict:
        files = self._build_file_list()
        start = (page - 1) * BATCH_SIZE
        end = start + BATCH_SIZE
        page_files = files[start:end]
        return {
            "total_files": len(files),
            "total_pages": (len(files) + BATCH_SIZE - 1) // BATCH_SIZE,
            "page": page,
            "files": page_files,
        }

    def handle_read_file(self, path: str) -> dict:
        # Accept both absolute paths and paths relative to input_dir
        p = Path(path)
        if not p.is_absolute():
            p = self.input_dir / p
        p = p.resolve()

        # Safety: only allow files inside input_dir
        try:
            p.relative_to(self.input_dir)
        except ValueError:
            return {"error": f"Access denied: {path} is outside the input directory."}

        if not p.exists():
            return {"error": f"File not found: {path}"}

        mime = SUPPORTED_EXTENSIONS.get(p.suffix.lower(), "text/plain")

        if mime == "application/pdf":
            import base64
            data = base64.standard_b64encode(p.read_bytes()).decode()
            return {"type": "base64_pdf", "data": data, "path": str(p)}
        else:
            try:
                content = p.read_text(encoding="utf-8", errors="replace")
                return {"type": "text", "content": content, "path": str(p)}
            except Exception as e:
                return {"error": str(e)}

    def handle_write_output(self, records: list[dict]) -> dict:
        self.results.extend(records)
        self._flush_results()
        return {"written": len(records), "total_so_far": len(self.results)}

    def handle_mark_done(self, summary: str) -> dict:
        self._flush_results()
        return {"status": "complete", "total_records": len(self.results), "summary": summary}

    # ------------------------------------------------------------------
    # Output serialisation
    # ------------------------------------------------------------------

    def _flush_results(self):
        self.output_path.parent.mkdir(parents=True, exist_ok=True)
        if self.output_format == "jsonl":
            with open(self.output_path, "w", encoding="utf-8") as f:
                for r in self.results:
                    f.write(json.dumps(r, ensure_ascii=False) + "\n")
        elif self.output_format == "csv":
            import csv
            if not self.results:
                return
            fieldnames = list(dict.fromkeys(k for r in self.results for k in r))
            with open(self.output_path, "w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
                writer.writeheader()
                writer.writerows(self.results)
        else:  # json (default)
            with open(self.output_path, "w", encoding="utf-8") as f:
                json.dump(self.results, f, indent=2, ensure_ascii=False)

    # ------------------------------------------------------------------
    # Tool dispatch
    # ------------------------------------------------------------------

    def dispatch_tool(self, name: str, inputs: dict) -> Any:
        if name == "list_files":
            return self.handle_list_files(**inputs)
        elif name == "read_file":
            return self.handle_read_file(**inputs)
        elif name == "write_output":
            return self.handle_write_output(**inputs)
        elif name == "mark_done":
            return self.handle_mark_done(**inputs)
        else:
            return {"error": f"Unknown tool: {name}"}

    # ------------------------------------------------------------------
    # Agent loop
    # ------------------------------------------------------------------

    def run(self, user_prompt: str) -> str:
        file_count = len(self._build_file_list())
        system = f"""You are a document analysis agent.

Your job:
1. Call list_files(page=1) to see what's available.
2. Read each file with read_file and extract the information the user asks for.
3. After analyzing each file (or a small batch), call write_output with your findings.
4. Continue through all {file_count} files across all pages.
5. When done, call mark_done with a summary.

Rules:
- ALWAYS call write_output incrementally — do not accumulate all results in memory.
- Every record passed to write_output MUST have a "source_file" key.
- If a file cannot be parsed, write a record with {{ "source_file": "...", "error": "..." }}.
- Work methodically: list page 1, read those files, write output, list page 2, etc."""

        messages: list[dict] = [{"role": "user", "content": user_prompt}]

        print(f"\n{'='*60}")
        print(f"Agent starting — {file_count} files to process")
        print(f"Output: {self.output_path} ({self.output_format})")
        print(f"{'='*60}\n")

        while True:
            response = self.client.messages.create(
                model=MODEL,
                max_tokens=8096,
                thinking={"type": "adaptive"},
                system=system,
                tools=TOOLS,
                messages=messages,
            )

            # Collect text output from this turn
            for block in response.content:
                if block.type == "text" and block.text.strip():
                    print(f"[agent] {block.text.strip()}\n")

            # Stop if done
            if response.stop_reason == "end_turn":
                final_text = next(
                    (b.text for b in response.content if b.type == "text"), ""
                )
                print(f"\n{'='*60}")
                print(f"Done. {len(self.results)} records written to {self.output_path}")
                print(f"{'='*60}\n")
                return final_text

            # Handle tool calls
            if response.stop_reason == "tool_use":
                # Append the assistant turn
                messages.append({"role": "assistant", "content": response.content})

                tool_results = []
                for block in response.content:
                    if block.type != "tool_use":
                        continue

                    print(f"  → {block.name}({_summarise(block.input)})")
                    result = self.dispatch_tool(block.name, block.input)

                    # Format result for the API
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": json.dumps(result, ensure_ascii=False),
                    })

                    # Terminate the loop from within the tool
                    if block.name == "mark_done":
                        messages.append({"role": "user", "content": tool_results})
                        print(f"\nDone. {len(self.results)} records → {self.output_path}")
                        return result.get("summary", "")

                messages.append({"role": "user", "content": tool_results})
            else:
                # Unexpected stop reason — bail out
                print(f"[warn] Unexpected stop_reason: {response.stop_reason}")
                break

        return ""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _summarise(inputs: dict) -> str:
    """One-line summary of tool inputs for logging."""
    parts = []
    for k, v in inputs.items():
        if isinstance(v, str) and len(v) > 60:
            parts.append(f"{k}='{v[:57]}...'")
        elif isinstance(v, list):
            parts.append(f"{k}=[{len(v)} items]")
        else:
            parts.append(f"{k}={v!r}")
    return ", ".join(parts)


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Document Analysis Agent")
    parser.add_argument("--input-dir", required=True, help="Directory containing files to analyse")
    parser.add_argument("--output", required=True, help="Output file path (e.g. results.json)")
    parser.add_argument(
        "--format",
        choices=["json", "jsonl", "csv"],
        default="json",
        help="Output format (default: json)",
    )
    parser.add_argument(
        "--prompt",
        default="Analyse each document and extract the key information, entities, dates, and main topics.",
        help="What to extract from the documents",
    )
    args = parser.parse_args()

    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("Error: ANTHROPIC_API_KEY environment variable is not set.")
        sys.exit(1)

    agent = DocumentAgent(
        input_dir=args.input_dir,
        output_path=args.output,
        output_format=args.format,
    )
    agent.run(args.prompt)


if __name__ == "__main__":
    main()
