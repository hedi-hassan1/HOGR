# HOGR CO. — website and workshop system

One app with two parts:

- **Public website** in Kurdish Sorani (`/ckb`, the default), Arabic (`/ar`) and English (`/en`): home, our work (gallery), about, and contact with a booking form.
- **Management system** at `/ckb/admin` (also in all three languages): dashboard, clients, bookings, measurement sheets, orders and quotes, payments, expenses, inventory, website requests, portfolio photos and settings. Quotes, invoices and measurement sheets can be printed or saved as PDF.

All data is stored in one SQLite file: `data/hogr.db`. Uploaded photos go to `data/uploads/`.

## Open it (Windows, easiest)

Double-click **`Start HOGR.bat`** in this folder. The first time it installs and prepares everything (a few minutes). Then the browser opens the login page by itself.

- Website: http://localhost:3000
- Management system (login): http://localhost:3000/admin

Keep the black window open while using it; close it to stop.

## Measuring on site (phone + laser)

The fastest way to measure: a **Bluetooth laser meter** and the phone.

1. In **Bookings**, tap **Start measuring** on the client's measurement visit. Or, on a measurement sheet, tap **Measure on site**.
2. Tap **Connect laser meter** once and pick the laser.
3. Choose what you are measuring (door, window, kitchen…) and the room.
4. Press the button **on the laser**. The reading goes straight into the highlighted box (width, then height, then depth). With **3 readings, use the smallest** switched on (default for doors and windows), measure top, middle and bottom; the system keeps the smallest, because openings are rarely square.
5. Optional: pick material and colour, and take a photo of the opening.
6. Tap **Save and measure next**. Each item is saved immediately; nothing is lost if the phone dies.

Every item gets an automatic drawing with its dimensions. You can see it on the sheet and in the printout, so a wrong number is easy to spot.

**No laser at hand?** Type the numbers, or tap the camera button next to a size to measure with the phone camera (AR, Android + Chrome; about ±1 cm, so not for glass).

**Lasers that work** (Bluetooth LE):
- Bosch GLM 50-27 C / CG, GLM 100-25 C, GLM 120 C, GLM 150 C, GLM 165-27 C. The 50-27 CG is the one other developers tested this protocol on.
- Leica DISTO D1, D2, D110, D510, D810 (set "Unencrypted App Mode"), X3, X4.
- Older classic-Bluetooth models (Bosch GLM 50 C / 100 C, Leica D3a BT, D330i) do **not** work in browsers.

These protocols come from open-source projects, because Bosch and Leica don't publish them. They were not tested on a real device here, so check with your laser on the first visit. To practise without a laser, open a sheet with `?measure=1&laser=demo` in the address.

**Bluetooth, camera and photos only work over https.** On this computer `localhost` is fine. For the phone, start the system with **`Start HOGR with phone link.bat`** instead. It creates a temporary secure address through Cloudflare and shows a QR code (in its own window and on every measurement sheet). Scan it with the phone. The link changes every time and stops when the window closes. **Change the admin password before using the phone link**, because the address is reachable from the internet while it runs. Once the site is hosted online with https, the phone link isn't needed.

## Phone notifications and the app badge

The system is an installable app (PWA). On the phone: open it, then **Install app** (Android Chrome ⋮ menu) or **Share → Add to Home Screen** (iPhone Safari). Open it from the home screen, go to **Settings → Phone notifications** and tap **Turn on notifications on this device**. Do this on every phone that should get alerts.

You get a normal phone notification for:
- **A new request from the website**, immediately.
- **A forgotten measurement**: a client was measured and no order has been made after 5 days. After 3 days it already turns red in Measurements, on the dashboard and in the sidebar.
- **An unpaid installed order**: installed but not fully paid after 7 days, and again every 7 days until paid or reminded.
- **The monthly report**, on the 1st at 9:00.

The app icon shows a number: new website requests + red measurements + debts due. iPhone, Windows and Mac show the number; Android shows a dot.

Day counts, message language and the monthly report switch are in Settings. Notifications only go out between 8:00 and 21:00, and only while the system is running.

**Requirements:** notifications need https and a fixed address. That means the system hosted online, or the phone link. The phone link's address changes every time it starts, so phones have to turn notifications on again after each start. iPhones need iOS 16.4+ and the app added to the home screen first.

## Calendar and workers

- **Calendar**: a week from Saturday to Friday, one row per worker. Bookings that overlap for the same worker turn red. Tap **+** in any cell to book that worker on that day.
- **Workers**: each worker is paid per day or per month. Tap days on the grid (worked → half day → absent). Record advances, salaries and bonuses; they are added to Expenses automatically. The table shows days, earned, paid and still to pay for the month.

## Debts after installation

**Payments → Unpaid** lists every installed order that isn't fully paid. **Remind on WhatsApp** opens WhatsApp with a polite message (Kurdish, Arabic or English) to that client; press send. The system records the reminder date. Sending WhatsApp messages fully automatically would need WhatsApp's paid Business API, so you press send yourself.

## Reports

**Reports** shows any month: received, expenses, net, money owed, new orders and clients, sales by product, where clients came from, and expenses by category. **Send to my phone** sends the summary as a notification.

## Quotes, client links and reviews

- **Price list** (sidebar): standard prices per m², per metre or per piece. An order made from a measurement sheet is priced automatically, using the price with a matching material or else the product's default. On any order line, **From price list** fills the price in one tap.
- **Send quote on WhatsApp**: the client gets a private link to their quote with an **Accept** button. Accepting turns the order to Confirmed and sends you a phone notification.
- **Send tracking link**: the same page shows the client the order's progress (quote → confirmed → production → ready → installed → completed), their next visit, and what's paid and remaining.
- **Ask for a review**: after installation, the client rates the work (1–5 stars + text). New reviews wait in **Website → Reviews** until you tap **Approve**; then they appear on the home page with their stars.
- These links only work for clients once the system is online. Set the address in **Settings → Website address**.

## Materials

On an order, **Materials** estimates aluminium/UPVC bars (6 m), glass m², boards (244×122), hinges, handles and drawer rails from the sizes. **Take from stock** subtracts them from Inventory once. These are workshop rules of thumb, so check them before cutting.

## Website extras

- **Price estimate** page: visitors pick a product and size and see a rough range (price list × 0.9 to 1.2, rounded). Only prices marked "Use in website price estimate" are used. **Book a measurement visit** carries their choice into the booking form.
- **Before / after**: in Portfolio, add a "before" photo to any project and it becomes a drag slider on Our work.

## Automatic backups

A copy of the database is saved every day to `data/backups/` (last 30 kept). Set an **extra backup folder** in Settings (for example a USB drive) to keep a second copy there. **Back up now** and downloads are in Settings. The project folder is inside OneDrive, so backups also sync to the cloud.

## Follow-up reminders (forgotten measurements)

A measurement is "waiting" when it has measured items, no order exists for that client since that day, and it wasn't marked **No order needed**. The sheet shows **Create order from this sheet** and **No order needed**; **Reopen** undoes it.

## Run it (command line)

Requires Node.js 20 or newer.

```bash
npm install
npm run build
npm start            # http://localhost:3000
```

For development: `npm run dev`.

### First login

- Go to `/admin`
- Username: `admin`
- Password: created randomly on the very first start. It's shown in the black window and saved in **`data/admin-password.txt`**. To choose it yourself, set `HOGR_ADMIN_PASSWORD` before the first start.

**Change the password right away** in Settings → Change my password, then delete `data/admin-password.txt`.

### Demo data

`npm run demo` adds sample clients, orders, payments and stock so you can try everything. Before going live, stop the app and delete the `data` folder. It is recreated empty (with the portfolio photos) on the next start.

## Managing the website (no code needed)

Log in, then open **Website** in the sidebar:

| Tab | What you can do |
| --- | --- |
| Texts | Change every heading, paragraph, button and menu name, in Kurdish, Arabic and English side by side. "Restore original text" undoes your edits for a section. |
| Images | Replace the home page photo, About photo, owner photo, login photo and the product photos, by uploading or picking from the gallery. |
| Gallery | Add (several at once), edit, reorder, feature on the home page, or delete project photos. |
| Reviews | Add, edit, hide or delete client reviews. |
| Questions | Add, edit, hide or delete the FAQ on the About page. |
| Sections | Show or hide parts of the site (process steps, recent work, reviews, booking form, FAQ, owner section, map). |
| Contact info | Phones, WhatsApp, address, social links and logo files (in Settings). |

Changes appear on the website immediately.

## How the pieces connect

1. A visitor sends a request from the website → it appears under **Website requests** (with a counter in the sidebar).
2. **Add as client and booking** creates the client and a measurement booking.
3. After the visit, create a **measurement sheet** for that client (width / height / depth in cm, per room).
4. **Create order from this sheet** copies every item into a new order. Add prices: per piece, per m² (width × height) or per metre (width).
5. Print the **quote**, move the order through the stages (quote → confirmed → in production → ready → installed → completed), and record **payments** (cash, bank transfer, FIB, FastPay, ZainCash). Balances update everywhere.
6. Record **expenses** and keep **inventory** levels; the dashboard shows the month's income, expenses, net, money still owed, and low stock.

## Putting it online (Vercel)

The same code runs on this computer and on Vercel:

| | On this computer | On Vercel |
| --- | --- | --- |
| Database | `data/hogr.db` (SQLite file) | **Turso** (SQLite-compatible cloud database) |
| Photos you upload | `data/uploads/` | **Vercel Blob** |
| Reminders, debt alerts, monthly report, backup | every 15 minutes while running | once a day at 09:00 Kurdistan time (Vercel Cron, `vercel.json`) |

### One-time setup

1. **Import the project**: vercel.com → *Add New → Project* → import the GitHub repository `HOGR`. Framework: Next.js (detected automatically). Deploy.
2. **Database**: in the project, open **Storage → Create Database → Turso** and connect it to the project. This adds `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`.
   If Turso isn't listed, create a free database at turso.tech (region: Frankfurt) and add those two variables yourself under **Settings → Environment Variables**.
3. **Photos**: **Storage → Create → Blob** (public), connect it to the project. This adds `BLOB_READ_WRITE_TOKEN`.
4. **Environment variables** (Settings → Environment Variables):
   - `HOGR_ADMIN_PASSWORD`: the first admin password (only used when the database is new)
   - `CRON_SECRET`: any long random text (protects the daily job)
   - `HOGR_SITE_URL`: the address once you have a domain, e.g. `https://hogrco.com`
5. **Redeploy** (Deployments → ⋯ → Redeploy). Open the site, then `/admin` and log in as `admin`.

The tables, starter prices, FAQ and portfolio are created automatically on the first visit. Every push to GitHub deploys again.

**Optional, sample data online:** `TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... npm run demo`.

### Domain

Vercel → project → **Settings → Domains** → add your domain and follow the DNS steps (with Cloudflare DNS, set the record to *DNS only*). Then set `HOGR_SITE_URL` and `Settings → Website address` in the admin to the new address.

### Limits to know

- Photos are shrunk in the browser before upload (online uploads are limited to about 4 MB each).
- Online, backups are handled by Turso (automatic, with point-in-time restore). **Settings → Download backup** gives you a full JSON copy at any time.

### Other hosts

Any Node.js server also works (`npm run build && npm start`), with or without Turso. Without `TURSO_DATABASE_URL` it uses the local file in `HOGR_DATA_DIR` (default `./data`), so that folder must be kept between restarts.

| Variable | Purpose |
| --- | --- |
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | Cloud database (required on Vercel) |
| `BLOB_READ_WRITE_TOKEN` | Photo storage on Vercel (added by Vercel Blob) |
| `HOGR_ADMIN_PASSWORD` | Password for the first admin account (new database only) |
| `CRON_SECRET` | Protects `/api/cron` |
| `HOGR_SITE_URL` | Public address, used in links sent to clients and in link previews |
| `HOGR_DATA_DIR` | Local database and uploads folder (default `./data`) |
| `HOGR_TZ` | Business time zone (default `Asia/Baghdad`) |
| `HOGR_INSECURE_COOKIE=1` | Only for testing a production build over plain `http://` on a non-localhost address |

## Backups

Settings → Backup downloads a copy of the database. Download one regularly, or copy the `data` folder.

## Logo

The logo is an **H whose right leg is a door swinging open**, with a brass pull handle. It is drawn from vector shapes, so it stays sharp at any size and needs no fonts.

- Files: `public/brand/` (full logo dark/white, symbol dark/white, app icon). Also downloadable from Settings → Logo files.
- In code: `<Logo />` from `src/components/Logo.tsx` (`variant="full" | "latin" | "mark"`, `light`, `height`).
- Colours: graphite `#202427`, brass `#A07A3F`.

## Editing content

- Phone numbers, WhatsApp, email, address (in three languages), Facebook/Instagram and currency (IQD or USD): **Settings**.
- Gallery photos, their titles in three languages, category, order, and which appear on the home page: **Portfolio**.
- All other website and system text: `src/lib/i18n/ckb.ts`, `ar.ts`, `en.ts`.
