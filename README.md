# TV Home

A home screen for Samsung Tizen TVs with four looks and live trending art. Built for a 65" CU7000 (Tizen 8).

| Style | What it is |
|---|---|
| 1 Marquee | Full-screen art for the app you're on, big cinema titles |
| 3 Shelf | Art on top, a row of apps and a row of trending titles |
| 4 Wall | Scrolling posters behind a dock of apps |
| 5 Cast | A lead actor and their character on a color field, like a magazine cover |

Switch styles from the top row on the TV (press Up). The choice is remembered.

## Art

With a TMDB key, each app shows what's trending on it in the US (Netflix, Prime Video and Apple TV+ by watch provider; YouTube, HDMI and others show general trending). It refreshes every 12 hours and keeps the last art when offline. Without a key, public-domain paintings from the Art Institute of Chicago (CC0) stand in.

Put your key (TMDB "API Key" or "API Read Access Token") in `~/.config/tv-home/tmdb.key`. The install script copies it into the build in `dist/` only; it is never committed.

## Install

Needs [AeroTizen's CLI](https://github.com/helalaou/AeroTizen) with signing certificates already made for the TV, and Developer Mode on.

```sh
tools/install.sh <tv-ip>
```

Only one launcher with a Home watcher should be installed at a time.

## Check

```sh
node tools/screens.cjs <path-to-playwright> <out-dir>      # desktop, 1920x1080, all styles
aerotizen --tv <tv-ip> inspect TvHome0001.Home             # then, in another shell:
node tools/tv-check.mjs <out-dir>                           # on the TV: errors, key timing, screenshots
```

## Credits

- `app/service/` is the Home-button watcher from AeroTizen 2.5.0 by Hamza El Alaoui, MIT (`app/service/LICENSE-AeroTizen`), with the app ID and port changed.
- Fonts: Big Shoulders Display, Hanken Grotesk, JetBrains Mono, SIL Open Font License.
- Fallback art: Art Institute of Chicago public-domain images, CC0.
- Trending art and data from TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.
