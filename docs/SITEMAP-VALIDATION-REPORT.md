# Sitemap validation report: facturafacilapp.com

Date: 2026-10-07. Sources: `public/sitemap.xml`, `public/robots.txt`, the route `head()`
definitions in `src/routes/`, and the live site.

## Summary

The sitemap is small (6 URLs) and structurally valid. The real problems were in the
pages it lists: no canonical links, every page claiming the homepage as its `og:url`,
and two pages without their own description. All issues below are fixed in the repo;
they take effect after the next deploy.

## Checks

| Check                                 | Result                                                    |
| ------------------------------------- | --------------------------------------------------------- |
| Valid XML                             | Pass                                                      |
| Under 50,000 URLs per file            | Pass (6)                                                  |
| All URLs return 200                   | Pass (checked live)                                       |
| HTTPS only                            | Pass; http now 301s to https (Always Use HTTPS)           |
| No `noindex` URLs                     | Pass; `/i/*`, `/api/*` and app pages are not listed       |
| No redirected URLs                    | Pass                                                      |
| No non-canonical URLs                 | Was unverifiable (no canonicals); fixed                   |
| `<lastmod>` accurate                  | Was identical on every URL; fixed                         |
| `<priority>` / `<changefreq>`         | Were present (ignored by Google); removed                 |
| Referenced in `robots.txt`            | Pass (`Sitemap: https://facturafacilapp.com/sitemap.xml`) |
| Public pages missing from the sitemap | None; everything else is private or a share link          |

## Issues

| Issue                                                        | Severity | Status                                                                     |
| ------------------------------------------------------------ | -------- | -------------------------------------------------------------------------- |
| No `<link rel="canonical">` on any page                      | High     | Fixed: each public page sets one with `pageUrl()` (`src/lib/constants.ts`) |
| `og:url` set to the homepage on every page (root route)      | Medium   | Fixed: removed from `__root.tsx`; each public page sets its own            |
| `/login` and `/signup` inherited the homepage description    | Medium   | Fixed: each has its own title and description                              |
| `/privacy` and `/terms` descriptions did not mention billing | Low      | Fixed, with the legal rewrite                                              |
| Identical `<lastmod>` on all URLs                            | Low      | Fixed: dates now match the last content change                             |
| `<priority>` and `<changefreq>` present                      | Info     | Removed                                                                    |

## Notes

- **One language per URL.** Every page serves Spanish by default; English is a cookie
  toggle on the same URL. Google indexes the Spanish version only, which matches the
  audience. `hreflang` would only make sense with separate English URLs (for example
  `/en/...`); not worth it now.
- **Login and signup are listed** because they are public, indexable and have their own
  content. Drop them if you prefer only the homepage and legal pages in results.
- **Share links stay out.** `/i/<token>` pages are `noindex` and disallowed in
  `robots.txt` (except for Facebook's preview crawler). Keep it that way.

## Keeping it accurate

- When a listed page's content changes, update its `<lastmod>` in `public/sitemap.xml`.
  The legal pages also carry an `updated` date in `src/content/legal/*.ts`; change both.
- When you add a public page: add a `<url>` entry, give the route a `head()` with a
  title, description, `og:url` and canonical link via `pageUrl()`, and make sure
  `robots.txt` doesn't block it.

## Google Search Console

1. Deploy first: Google should read the new canonicals and sitemap.
2. Go to https://search.google.com/search-console → **Add property** → **Domain** →
   `facturafacilapp.com`. The `google-site-verification` TXT record is already in DNS, so
   **Verify** should pass at once.
3. **Sitemaps** → enter `sitemap.xml` → **Submit**. Status should turn to "Success" with
   6 discovered pages, usually within a day.
4. **URL Inspection** → `https://facturafacilapp.com/` → **Request indexing**.
5. After a few days, check **Pages** for anything under "Not indexed". "Alternate page
   with proper canonical tag" or "Excluded by noindex" for `/i/...` links is expected.
