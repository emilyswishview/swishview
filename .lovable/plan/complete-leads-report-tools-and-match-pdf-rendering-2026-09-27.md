# Complete Leads report tools and match PDF rendering

## What will change
- Add **Reports + Sheet** to the `/prospects/leads` selection bar, using every selected creator’s YouTube channel link and preserving all selected lead columns in the companion sheet.
- Add a bulk **Comment** control to the same selection bar with append and replace modes, progress/error handling, and immediate row updates.
- Replace the separate simplified PDF drawing code with capture of the actual `/report/:slug` page, so downloaded PDFs reuse the same report layout, gauges, charts, typography, and data shown in the web link.
- Keep individual report actions and the existing Calling-tab tools working.

## Print fidelity
- Add a deterministic “PDF capture ready” state after report data, fonts, images, and chart animations have settled.
- Capture the web report at its fixed desktop report width, split it cleanly across A4 pages, and prevent charts or sections from being clipped between pages.
- Keep browser Print as a matching fallback, hide navigation from print/PDF output, and remove mobile bottom spacing in printed reports.

## Verification
- Check the Leads selection bar actions and bulk comment behavior.
- Generate a report and compare the web and downloaded PDF pages, including gauge, pie, bar, and line charts.
- Verify mobile/desktop report rendering and confirm the latest preview build has no errors.

## Technical details
- Reuse the existing report persistence and report URL helpers.
- Use DOM-to-canvas capture for PDF creation instead of rebuilding charts with PDF drawing commands.
- Process bulk PDFs sequentially to limit memory usage and report per-lead failures without pretending success.
