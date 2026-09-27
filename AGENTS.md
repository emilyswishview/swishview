# Project architecture rules

- Generate downloadable channel-report PDFs by capturing the canonical `/report/:slug` DOM rather than maintaining a second report renderer, so web and PDF output cannot drift.