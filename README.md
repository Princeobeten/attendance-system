# Smart Attendance System using NFC

Implementation of the design in Chapter Four: an administrator console and an
attendance terminal. Each user is identified by an NFC card, and the server
decides whether a tap counts.

Built with Next.js (App Router), MongoDB and Mongoose.

## Features

| Design reference | Where it lives |
| --- | --- |
| Administrator sign-in (Fig. 4.3) | `/login` |
| Dashboard with recent taps, refusals included (Fig. 4.4) | `/` |
| User registration and card issue (Fig. 4.5, Algorithm 4.1) | `/users/new`, `/users/[id]` |
| Attendance terminal and its two outcomes (Fig. 4.6, Algorithm 4.2) | `/terminal`, `POST /api/tap` |
| Session management (Fig. 4.7) | `/sessions` |
| Attendance records and export (Fig. 4.8) | `/sessions/[id]`, `/reports`, `GET /api/export` |

Rules from Chapter Four and where each one is enforced:

- **One record per user per session.** A unique index on
  `attendancerecords(session, user)`. The tap handler attempts the insert and
  lets the database refuse a duplicate, so two simultaneous taps cannot both
  be stored (`src/models/AttendanceRecord.ts`, `src/lib/tap.ts`).
- **A card is bound to one user.** Partial unique indexes allow only one
  *active* card per UID and one *active* card per user (`src/models/Card.ts`).
  Lost or revoked cards are kept, so old records stay explicable.
- **A tap counts only at the session's terminal, inside its window.**
- **Every tap is logged**, refusals included (`taplogs` collection).
- **The four refusals:** no session open, card not recognised, account
  suspended, already marked.
- **Late marking:** taps more than *n* minutes after a session opens are
  marked late (optional per session).

## Collections

| Collection | Chapter Four table | Notes |
| --- | --- | --- |
| `users` | `users` | `identifier` is unique; only administrators have a password |
| `cards` | `nfc_cards` | status `active` / `revoked` / `lost` |
| `sessions` | `sessions` | `terminalId`, `opensAt`, `closesAt`, `lateAfterMinutes` |
| `attendancerecords` | `attendance_records` | stores the card UID actually presented |
| `taplogs` | (tap log) | every tap with its outcome |

## Getting started

Requirements: Node.js 20 or later, and a MongoDB database (Atlas or local).

```bash
npm install
cp .env.example .env.local   # then fill in MONGODB_URI and JWT_SECRET
npm run seed                 # creates the first administrator and prints the password
npm run dev
```

Open http://localhost:3000 and sign in with staff number `ADMIN001` and the
printed password. To choose the password yourself, set it before seeding:
`ADMIN_PASSWORD=... npm run seed`.

For a ready-made demonstration (eight users with cards, a past session with
records, and a session open now on terminal `LT-1`):

```bash
npm run seed -- --demo
```

Then open `/terminal`, enter terminal ID `LT-1`, and present a card, or in
demo mode type a UID such as `04A1B2C3D4E501` into the field at the bottom.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Signs the administrator's session cookie |
| `TERMINAL_KEY` | Optional. If set, a terminal must send this key with every tap |
| `NEXT_PUBLIC_DEMO_MODE` | `true` shows a manual UID field so the system can be shown without a reader |
| `APP_TIMEZONE` | Time zone for displayed times, e.g. `Africa/Lagos` |

## Reading cards

The terminal and the registration screen accept a card from either source:

1. **USB NFC reader in keyboard mode.** Most inexpensive USB readers type the
   card UID followed by Enter. The page accepts only keystrokes that arrive at
   reader speed (under 60 ms apart), so a UID cannot be typed by hand. This is
   the "read, not typed" rule in Section 4.6.
2. **Web NFC.** Chrome on Android reads the card's serial number through the
   phone's own NFC antenna.

UIDs are stored in one canonical form: uppercase hex with no separators.

## Setting up an attendance terminal

1. Open `/terminal` on the device at the venue (it does not require an
   administrator to be signed in).
2. Enter the terminal ID that sessions for that room will use, e.g. `LT-1`,
   and the terminal key if the server sets `TERMINAL_KEY`.
3. Press **Start terminal**. The device remembers its ID after a reload.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run seed` | First administrator (`-- --demo` adds demonstration data) |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |

## Known limitations

As stated in Section 4.7.1, a tap proves that a card was present, not who was
holding it. The second factor recommended in Section 5.3 (a short PIN for
nominated sessions) is not implemented. Without `TERMINAL_KEY`, any device
that can reach the server can submit taps.

"Absent" means every registered student or staff member without a record for
that session. There is no course enrolment, so a session's register covers
everyone.
