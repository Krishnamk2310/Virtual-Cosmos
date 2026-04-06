# 🌌 Virtual Cosmos

A real-time, 2D proximity-based social space where users move freely through a shared virtual world. When two users get close enough, a chat channel automatically opens between them. When they move apart, it closes — mirroring the natural dynamics of physical proximity.

---

## Demo

> Reference: [cosmos.video](https://cosmos.video/v/5dvm-syhq-p15w/office)

---

## Features

- **2D Canvas World** rendered with PixiJS — a tiled floor with named zones (Lobby, Rooms, Lounge, Meeting Hall)
- **Keyboard Movement** — WASD or Arrow Keys to move your avatar smoothly through the world
- **Real-time Multiplayer** — all users visible simultaneously, positions synced at ~20 updates/second via Socket.IO
- **Proximity Detection** — a 150px proximity radius is drawn around each user; entering another user's radius triggers an automatic connection
- **Auto Chat Connect / Disconnect** — the chat panel appears when users are nearby and disappears when they move apart, with zero manual action needed
- **Multi-connection Chat** — if you're near multiple users, a tab strip lets you switch between active conversations
- **Persistent Chat History** — messages are saved to MongoDB; history survives page refreshes within a session
- **Smooth Camera** — the viewport follows your avatar with a lerped (smoothed) camera
- **Interpolated Movement** — other users' positions are interpolated client-side for smooth rendering between server updates
- **Clean Dark UI** — dark-themed, space-inspired design with Tailwind CSS

---

## Tech Stack

| Layer | Technology | Justification |
|---|---|---|
| Frontend framework | React 18 + Vite | Fast HMR, modern JSX, ecosystem maturity |
| 2D rendering | PixiJS v7 | WebGL-accelerated canvas, best-in-class for 2D game-like scenes in the browser |
| Styling | Tailwind CSS | Utility-first, no context switching, consistent spacing |
| Real-time transport | Socket.IO | Reliable WebSocket abstraction with automatic fallback, rooms, and namespaces |
| Backend runtime | Node.js + Express | Non-blocking I/O ideal for many concurrent socket connections |
| Database | MongoDB + Mongoose | Flexible document model suits variable message shapes; easy local dev with no schema migration |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Browser                          │
│                                                         │
│   ┌──────────────┐    ┌──────────────────────────────┐  │
│   │  LoginScreen │    │          App.jsx             │  │
│   └──────┬───────┘    │  (socket event orchestration)│  │
│          │ onJoin     └──────┬──────────────┬─────────┘  │
│          │                  │              │            │
│   ┌──────▼───────────────┐  │   ┌──────────▼─────────┐ │
│   │    CosmosCanvas      │  │   │     ChatPanel      │ │
│   │  (PixiJS + movement) │  │   │ (messages + input) │ │
│   └──────────────────────┘  │   └────────────────────┘ │
│                             │                          │
│            socket.js (singleton IO client)             │
└─────────────────────────────────────────────────────────┘
                          │ WebSocket
┌─────────────────────────▼───────────────────────────────┐
│                   Node.js Server                        │
│                                                         │
│   Express HTTP          Socket.IO                       │
│   ┌──────────┐     ┌─────────────────────────────────┐  │
│   │ /health  │     │  join → broadcast user-joined   │  │
│   └──────────┘     │  move → broadcast + proximity   │  │
│                    │  chat-message → room emit        │  │
│                    │  disconnect → cleanup + notify   │  │
│                    └─────────────────────────────────┘  │
│                                                         │
│   In-memory users Map (positions, nearbyUsers Set)      │
│   MongoDB (message persistence)                         │
└─────────────────────────────────────────────────────────┘
```

### Proximity Detection (Core Logic)

Proximity is evaluated server-side every time a user emits a `move` event. The server computes the Euclidean distance between the moving user and every other connected user:

```
distance = √((x₁ - x₂)² + (y₁ - y₂)²)
```

- If `distance < PROXIMITY_RADIUS (150)` and they were not already connected → emit `proximity-connect` to both sockets and join them to a shared Socket.IO room named `"socketIdA::socketIdB"` (IDs sorted for idempotency).
- If `distance ≥ PROXIMITY_RADIUS` and they were previously connected → emit `proximity-disconnect` to both and remove them from the shared room.

Each user's `nearbyUsers` is a `Set<socketId>` stored in the server's in-memory `users` Map, making connect/disconnect checks O(1).

### Data Flow — Message Lifecycle

```
User types → onSendMessage(roomId, content)
          → socket.emit('chat-message', { roomId, content })
          → server validates sender, trims content
          → Message.create() to MongoDB (async, non-blocking)
          → io.to(roomId).emit('new-message', message)
          → Both clients receive → React state update → re-render
```

---

## Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- **MongoDB** ≥ 6.x (local install or [MongoDB Atlas](https://www.mongodb.com/atlas) free tier)

---

## Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/your-username/virtual-cosmos.git
cd virtual-cosmos
```

### 2. Set up the server

```bash
cd server
npm install
cp .env.example .env
```

Edit `server/.env` with your values:

```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/virtual-cosmos
CLIENT_URL=http://localhost:5173
```

> MongoDB is optional for running the app. If unavailable, the server logs a warning and continues — only chat history persistence is disabled.

### 3. Set up the client

```bash
cd ../client
npm install
cp .env.example .env
```

Edit `client/.env`:

```env
VITE_SERVER_URL=http://localhost:3001
```

---

## Running the Project

### Development (two terminals)

**Terminal 1 — Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd client
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in two or more browser tabs/windows to test multiplayer behavior.

### Production

**Build the client:**
```bash
cd client
npm run build
```

**Serve static files from Express** (optional — add this to `server/src/index.js`):
```js
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, '../../client/dist')));
```

**Start the server:**
```bash
cd server
npm start
```

---

## Project Structure

```
virtual-cosmos/
├── README.md
├── .gitignore
│
├── server/
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── index.js              # Express + Socket.IO server, all game logic
│       └── models/
│           └── Message.js        # Mongoose schema for chat messages
│
└── client/
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    ├── .env.example
    └── src/
        ├── main.jsx              # React DOM root
        ├── App.jsx               # Socket event orchestration, top-level state
        ├── index.css             # Tailwind base + global resets
        ├── socket.js             # Socket.IO singleton (auto-connect disabled)
        └── components/
            ├── LoginScreen.jsx   # Username entry UI
            ├── CosmosCanvas.jsx  # PixiJS 2D world, movement, camera
            └── ChatPanel.jsx     # Proximity chat UI with multi-connection tabs
```

---

## Environment Variables

### Server (`server/.env`)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | HTTP server port |
| `MONGODB_URI` | `mongodb://localhost:27017/virtual-cosmos` | MongoDB connection string |
| `CLIENT_URL` | `http://localhost:5173` | Allowed CORS origin |

### Client (`client/.env`)

| Variable | Default | Description |
|---|---|---|
| `VITE_SERVER_URL` | `http://localhost:3001` | Backend server URL |

---

## Socket.IO Event Reference

### Client → Server

| Event | Payload | Description |
|---|---|---|
| `join` | `{ username }` | Register user, receive initial world state |
| `move` | `{ x, y }` | Update position (throttled to ~20/s client-side) |
| `chat-message` | `{ roomId, content }` | Send message to proximity room |

### Server → Client

| Event | Payload | Description |
|---|---|---|
| `self-joined` | `{ socketId, username, color, position }` | Confirms registration, provides spawn position |
| `existing-users` | `User[]` | Snapshot of all users already in the world |
| `user-joined` | `User` | New user entered the world |
| `user-moved` | `{ socketId, position }` | Another user's updated position |
| `user-left` | `{ socketId }` | User disconnected |
| `proximity-connect` | `{ userId, username, color, roomId }` | Two users entered proximity range |
| `proximity-disconnect` | `{ userId, roomId }` | Two users left proximity range |
| `new-message` | `{ roomId, senderId, senderName, content, timestamp }` | Message from the proximity room |

---

## Controls

| Key | Action |
|---|---|
| `W` / `↑` | Move up |
| `S` / `↓` | Move down |
| `A` / `←` | Move left |
| `D` / `→` | Move right |
| `Enter` | Send chat message (when input is focused) |

> Movement keys are automatically disabled when the chat input is focused.

---

## Design Decisions

**Why PixiJS over a plain `<canvas>` API?**
PixiJS provides WebGL acceleration, a retained-mode scene graph, and built-in sprite/text/graphics primitives. This means smooth 60 fps rendering with many objects and clean code over raw canvas 2D.

**Why server-side proximity detection?**
Authoritative server-side detection prevents cheating and ensures both clients agree on whether a connection exists. The client only receives `proximity-connect` / `proximity-disconnect` events — it never self-determines who it can talk to.

**Why in-memory `Map` for user state instead of MongoDB?**
Positions update at up to 20 times per second per user. Writing those to a database would be wasteful and slow. MongoDB is used only for persistent data (message history) that changes at human typing speed.

**Why Socket.IO over raw WebSockets?**
Socket.IO's built-in rooms make the proximity chat architecture trivial — each pair of nearby users shares a named room. Broadcasting to a room with `io.to(roomId).emit(...)` handles fanout automatically.

---


