# Site security & anti-scraping — what's in place, and what is actually possible

Applies to **cwreidaho.com · valleystats.com · stadiumsubdivision.com ·
blackcanyonhomesid.com · lakehavenstaridaho.com**. Last updated 2026-09-27.

## Read this part first

**A public website cannot be made unscrapable.** Every one of these sites is
delivered to the visitor's browser as plain HTML, CSS and JavaScript — the page
*is* the code. Anything a person can look at, a program can copy. "View Source"
is a browser feature, and a scraper that runs a real browser (which the serious
ones do) sees exactly what a customer sees.

So the goal is not "nobody can copy this." The goal is:

1. **Stop the AI companies that ask permission** — they're most of the volume.
2. **Stop competitors' SEO tools** from pulling the sites apart.
3. **Keep Google, Bing and link previews working** — these sites exist to be found.
4. **Reduce the blast radius** if someone does something hostile.

Anyone promising more than that is selling something.

## What is now in place

### 1. Crawler blocking — `robots.txt` on every site

Blocked outright:

- **AI training crawlers**: GPTBot (OpenAI), ClaudeBot, anthropic-ai, CCBot
  (Common Crawl, which feeds most training sets), Google-Extended (Gemini
  training — this does *not* affect Google Search), Applebot-Extended,
  meta-externalagent, FacebookBot, Bytespider (ByteDance), Amazonbot, AI2Bot,
  Diffbot, Omgili, ImagesiftBot, img2dataset, Webzio, Timpibot, YouBot, Scrapy.
- **SEO / competitive scrapers**: Ahrefs, Semrush, MJ12, DotBot, BLEXBot,
  DataForSeo, PetalBot, Serpstat, ZoomInfo. These are what another agent or
  brokerage would use to copy a keyword strategy.

Deliberately still allowed:

- **Google, Bing, DuckDuckGo.** Blocking them takes the sites off search.
- **Facebook, Instagram, LinkedIn, X, Slack, iMessage preview bots.** Blocking
  them kills the preview image when a listing link is shared.
- **AI answer engines** (ChatGPT search, Perplexity, Claude search). These send
  *real buyers* who asked an AI "new construction lots in Star Idaho." They are
  a lead source, not a threat. To block them anyway, open `robots.txt` and
  follow the note under "AI ANSWER ENGINES" — it's a one-line change.

**Limit:** robots.txt is voluntary. The named companies honour it; a hostile
scraper ignores it. Nothing written in a text file can change that.

### 2. Security headers — every site, every page

| Header | What it stops |
|---|---|
| `Strict-Transport-Security` | Downgrade attacks; forces HTTPS for two years |
| `X-Frame-Options` / `frame-ancestors` | Someone embedding your site inside theirs to pass it off as their own |
| `X-Content-Type-Options: nosniff` | Browsers being tricked into running a file as script |
| `Referrer-Policy` | Leaking full URLs to third parties |
| `Permissions-Policy` | Camera, mic, location, payment APIs — all switched off |
| `X-Robots-Tag: noai, noimageai` | A second, header-level "do not train on this" signal |
| `Content-Security-Policy` | Limits the page to the handful of approved outside sources (fonts, map tiles, the form service). If someone injected a script, the browser refuses to run it. |

CSP is on **lakehavenstaridaho.com** and **stadiumsubdivision.com**, where every
third-party dependency has been audited. It is deliberately **not** on
valleystats.com (Supabase/Stripe load at runtime — a wrong policy breaks
checkout), blackcanyonhomesid.com or cwreidaho.com (Buying Buddy IDX) until
those are audited the same way.

### 3. Smaller attack surface

Build scripts, print artwork and QR source files are excluded from the public
deployment via `.vercelignore`. They live on the Mac and in git, not on the web
server.

## What would add real protection, and what it costs

**Cloudflare in front of the sites — the one genuinely strong option.**
Cloudflare's free plan has a one-click **"Block AI Scrapers and Crawlers"** that
enforces at the network level, so it works on crawlers that ignore robots.txt.
It also gives bot-fight mode, rate limiting and hotlink protection for images.

The catch: DNS has to point at Cloudflare. lakehavenstaridaho.com was just moved
*off* Cloudflare to GoDaddy, so turning this on means moving it back. Worth doing
if AI scraping is the top concern; it's a 10-minute change per domain.

**Watermark the drone photos.** The photos are the asset with real value — they
cost money to make and a competitor can't recreate them. A discreet corner mark
survives copying and makes theft obvious. Say the word and I'll add it to the
export step.

**Strip EXIF from photos before upload.** Phone and drone photos carry GPS
coordinates and timestamps. Worth removing on principle.

## What is NOT possible — don't let anyone sell you these

- **Blocking "view source" or right-click.** Trivially bypassed, and it annoys
  real customers. Not implemented on purpose.
- **Stopping a human from copying text or saving a photo.** Cannot be done.
- **Blocking all bots while staying on Google.** Google *is* a bot. The two
  requirements are in direct conflict; the split above is the best trade.
- **Stopping a headless-browser scraper.** It looks identical to a customer on
  an iPhone. Cloudflare raises the cost; nothing eliminates it.

## Routine checks

- After any deploy: `curl -sI https://<site>/ | grep -i "content-security\|strict-transport"`
- `https://<site>/robots.txt` should load and show the block list.
- Google Search Console → Coverage, to confirm nothing important got deindexed.
