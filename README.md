# LocalBite — Vercel edition

One Next.js application contains the customer website at `/`, Restaurant Owner Portal at `/owner`, and Developer Portal at `/developer`. These use the same API and persistent storage. The deployed pilot uses private Vercel Blob documents with conditional writes; PostgreSQL is also supported. No ChatGPT Sites account, Cloudflare D1 binding, or private Site token is needed.

## Live application

- Customer: https://localbite-theta.vercel.app
- Restaurant Owner Portal: https://localbite-theta.vercel.app/owner
- Developer Portal: https://localbite-theta.vercel.app/developer

The production build is deployed on Vercel. Vercel sign-in protection is currently enabled. Staff portal credentials are provided privately and are not stored in this repository.

## Run on your Mac

Install Node.js 22.13 or newer. In Terminal, open this folder and run:

```sh
npm ci
npm run dev
```

Open the localhost URL printed in Terminal. Development uses an embedded PostgreSQL database in `.local-data/postgres`, which survives restarts. Local-only developer login: `developer` / `localbite-demo`. Restaurant owners: `owner-1` through `owner-4`, using `localbite-demo`. These defaults are disabled in production and on Vercel.

## Deploy to Vercel

1. Import this folder into a Vercel project using the Next.js preset. The included `vercel.json` specifies the build command. This folder is the project root; do not deploy the old three Cloudflare projects as static sites.
2. Connect a **private Vercel Blob store** to the project. Vercel supplies the server-only `BLOB_READ_WRITE_TOKEN`. Alternatively, connect PostgreSQL and provide `DATABASE_URL`; PostgreSQL takes precedence if both are set.
3. Run `npm run setup` locally to set a developer username/password and one owner password per restaurant. The script saves only password hashes and a random session secret to `.env.local`. Add `SESSION_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, and `OWNER_ACCOUNTS_JSON` from that file to Vercel's environment variables. Never use the `NEXT_PUBLIC_` prefix for these values.
4. Set `APP_ORIGIN` to the production URL after the initial deployment, then redeploy before printing restaurant QR codes. Generate table QR codes on that same production URL. Preview-domain QR codes must not be used in restaurants.
5. Build/deploy. Private Blob does not require a SQL migration. When `DATABASE_URL` is configured instead, the build runs the checked-in, additive SQL migration before building Next.js. `/api/health` confirms that the runtime database is reachable.

CLI deployment is also supported after signing into your own account:

```sh
npx vercel login
npx vercel link
# Add the required environment variables and attach private Blob or Postgres before publishing.
npx vercel --prod
```

This repository does not contain Vercel tokens, storage credentials, production password hashes, session secrets, or staff passwords. The live pilot is already deployed at the links above. A build with missing storage environment variables is not a working data deployment: APIs fail closed until configured.

## Shared workflows

- An owner can publish actual prices, stock, menu availability, preparation ranges and seating estimates only for their assigned restaurant. No prices or stock are fabricated.
- A developer can inspect and update all four restaurant kitchens and publish customer spotlights and regulate which supplied reels appear in the customer feed.
- Customers send dine-in or scheduled/immediate takeaway pilot requests from the owner-published menu. Stock reservation and order creation use a version comparison on one durable restaurant record (PostgreSQL) or a private document with an ETag condition (Blob), preventing overselling during concurrent requests. Tracking keys prevent duplicate retries.
- Owners accept, prepare, mark ready and complete orders; customer status refreshes every 15 seconds. Before preparation starts, customers can reschedule pickup or cancel. Cancellation restores portions, and the owner decides whether an item is offered again.
- Table QR setup supports LocalBite table URLs and external providers. LocalBite table requests appear in the kitchen. Orders placed with an external provider do not sync automatically.
- Staff sign-in uses scrypt password hashes, signed HttpOnly cookies and server checks on every management request. An owner cannot read another restaurant's kitchen or publish platform spotlights. Browser storage and hidden buttons are not authorization.

## Product boundaries

This remains a pilot for the four restaurants identified by the supplied clips. They have not been onboarded as real fulfillment partners. Menus start paused with no prices and zero portions. Enter owner-approved values before enabling orders.

Payment is **Pay at restaurant**; no online payment, Zomato checkout/cart API, delivery rider system, funded cashback or verified-review payout is connected. Customer Google/email/SMS sign-in requires the optional Supabase environment and provider configuration. Influencer aliases, review examples, messages, views and likes remain clearly labelled sample data; reel approval and rejection sync to the customer feed through the shared database, while influencer messaging and view/like counts remain sample features rather than a live social-network integration. These limitations are not removed by hosting on Vercel. The default Vercel deployment sign-in protection has been retained; publishing general customer access requires the account owner’s explicit approval.

The PS1 core is restaurant visibility, a current digital menu, direct table and takeaway requests, clear queues and simpler kitchen operations. Reels support discovery; Zomato remains an optional external delivery link.

## Validation

`npm test` runs the API against embedded PostgreSQL, including staff isolation, public-data privacy, simultaneous last-portion requests, duplicate retries, order transitions, cancellation and customer tracking. `npm run build` checks TypeScript and builds all three route interfaces. No browser visual check is claimed when a browser tool is unavailable.

This repository contains the unified Vercel edition. Earlier Cloudflare prototypes are not required; the customer, owner and developer pages use this application’s shared backend.
