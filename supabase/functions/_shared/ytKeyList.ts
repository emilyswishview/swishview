// ─────────────────────────────────────────────────────────────────────────────
//  ADD YOUR YOUTUBE DATA API KEYS HERE
// ─────────────────────────────────────────────────────────────────────────────
//
//  One line per key. Each key should come from a SEPARATE Google Cloud project
//  (each project = its own 10,000 units/day quota ≈ 5,000 more channels).
//
//  Steps for every new key:
//    1. console.cloud.google.com → create a new project
//    2. APIs & Services → Library → enable "YouTube Data API v3"
//    3. Credentials → Create credentials → API key
//    4. Paste it below, inside the array, wrapped in quotes, with a comma.
//
//  Keys added here are merged with any keys stored as environment secrets
//  (YOUTUBE_API_KEY, YOUTUBE_API_KEY_2 … _20, YOUTUBE_API_KEYS).
//  Duplicates and blanks are ignored automatically.
//
//  NOTE: keys listed in this file live in the repository. If you prefer them
//  hidden, leave the array empty and store them as secrets instead.

export const YOUTUBE_API_KEYS: string[] = [
  "AIzaSyA4VUB--2LegY_mvTbK56ikDVCekJJ2lr8",
  "AIzaSyDieprUXw1XqM71wG5jqTy0EE5urqj1f2Q",
  "AIzaSyD3GCrXyTlgPoM76c_WUi9L05bxbsH5njQ",
  "AIzaSyDs01sOOdLdASYcP0jskU6Nnsl4Q45Ldio",
  "AIzaSyApvPGhEhjt0C1iKzxYmFZKDvMT5wEVSks",
  "AIzaSyB5lO6RQR8VFMPhAkoObnpKPox_stYVrxU",
  // "AIzaSy...key-from-project-3",
];
