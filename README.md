# UPI Pending Payment Recovery — interactive prototype

An 11-screen flow for the moment a UPI payment hangs: it tells people where their money is, stops them paying twice, and walks them to a confirmed outcome (success or refund). Two themes share one layout, one type scale and one 400 ms motion clock:

- **Daylight** — light mode → `/daylight/`
- **Midnight** — dark mode → `/midnight/`

Colour tracks the money: blue = checking, amber = waiting / risk, green = safe.

## The flow

| # | Screen | What moves it on |
|---|--------|------------------|
| 01 | Checking payment | auto, 2.8 s |
| 02 | Payment status | auto, 7 s · "What does this mean?" |
| 03 | Explainer sheet | "Got it" / close |
| 04 | Still waiting | "Notify me when updated" |
| 05 | Payment update | tap the notification |
| 06 | Escalation · 5 min | copy ref ID · "Chat with support" |
| 07 | Support handoff | auto, 5.6 s |
| 08 | Resolved · success | "Done" |
| 09 | Reassurance | continue |
| 10 | Duplicate guardrail | wait for refund / pay again |
| 11 | Resolved · refunded | retry / close |

Deep links work: `/midnight/#escalation`. Switching theme keeps you on the same screen. ← / → step through screens. On phones the device screen goes full-bleed with a step picker at the bottom.

## Run locally

```bash
npm run build          # source/ -> site/
npx serve site         # or any static server
```

No dependencies to install — the build is a single Node script.

## How it's built

`source/` holds the screens as HTML templates (`Day*.dc.html`, `Night*.dc.html`) with the theme tokens in `day.css` / `night.css`. `tools/build.js` compiles them into a static site; `tools/dc-runtime.js` is a ~150-line runtime that renders the templates, keeps component state across renders and patches the DOM with [morphdom](https://github.com/patrick-steele-idem/morphdom) so running animations never restart.

## Deploy

Import the repo in Vercel — `vercel.json` already sets the build command and output folder (`site`). No framework preset needed.

---
Designed by Ajay Kumar Srivastava · [ajaysri.vercel.app](https://ajaysri.vercel.app)
