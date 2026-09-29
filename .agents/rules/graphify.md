---
trigger: always_on
description: Consult the graphify knowledge graph at graphify-out/ for codebase and architecture questions.
---

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Always consult the graphify knowledge graph FIRST before modifying or inspecting code: analyze what components, callers, and dependencies it connects to, and identify potential ripple effects or points of failure.
- When `graphify-out/graph.json` exists, run `graphify query "<question>"` (CLI) or inspect the graph. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts.
- Only after understanding the high-level impact from the graph, dive into specific code lines.
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost).

