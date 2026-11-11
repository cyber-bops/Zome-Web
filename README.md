# Zome on the web

The consumer web app (ADR-0053): sign-in and the Care Purse first. It lives
at **app.myzome.app** and runs as its own Fly app, `zome-web`.

It holds no keys. Every request goes to the Zome API (`myzome-api`, `/v1/...`)
with the person's session, kept in an HttpOnly cookie. The browser only ever
talks to this app's `/api/z` door, which forwards a fixed list of routes
(`lib/door.ts`).

The look is "receipts": the purse printed as a total, a pay-code ticket,
tear-off stubs and a receipt tape (`app/globals.css`). Figures are set in
IBM Plex Mono, under the SIL Open Font License (`public/fonts/PlexMono-OFL.txt`).

## Run it

    npm ci
    ZOME_API_URL=http://localhost:8080 npm run dev

## Test

    npm test          # the door, the session cookie, the purse's figures, the words
    npm run typecheck

## Deploy

    fly deploy

The first time: `fly apps create zome-web`, then
`fly certs add app.myzome.app -a zome-web` and the DNS records it prints.
