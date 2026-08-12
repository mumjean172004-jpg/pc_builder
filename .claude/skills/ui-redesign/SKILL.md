---
name: ui-redesign
description: Use when redesigning, restyling, or adding UI to any page in 04_frontend/ (removing emoji/informal icons, adding form components, touching the navbar, or general visual cleanup) — loads this project's UI/UX design system so different sessions/agents stay visually consistent instead of re-deriving conventions each time.
---

# UI Redesign (PC Builder Pro)

Before writing or editing any HTML/CSS/JS under `04_frontend/`, read
`KnowledgeBase/08_design_system/UI_UX_Guidelines.md` in full. It documents,
with copy-pasteable examples:

- The stack decision (vanilla HTML/CSS/JS — no framework migration mid-task)
- Where shared vs. page-specific CSS belongs
- The no-emoji / inline-SVG icon convention (and how to size/color icons via
  the shared `.icon` class)
- Shared component classes already in `css/style.css` (`.form-input-group`,
  `.has-error`, `.btn .spinner`, etc.) — reuse them, don't redefine
- The `setBtnLoading` / `setFieldError` JS helper pattern for async forms
- The copy-pasted navbar markup pattern (no shared partial exists — this is
  a static Express file server)
- The verification bar (screenshot light + dark mode, check console errors)
  before calling any page done
- The per-page redesign status table — update it when you finish a page

After finishing a page redesign, update that status table in the same
change, and update `KnowledgeBase/Index.md`'s "Rules for Future Changes"
expectations if you introduce a new shared pattern.

Reference implementation: `04_frontend/login.html` +
`04_frontend/css/style.css` (the shared classes section near the top of the
`body` rules) — read these to see the pattern applied, not just described.
