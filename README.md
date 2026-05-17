# SyncCanvas

A real-time collaborative whiteboard with AI-powered shape recognition — built with Next.js, Fabric.js, WebRTC, and TensorFlow.js.

---

## Overview

SyncCanvas lets multiple users draw together on a shared canvas in real time, with no server required. Every stroke, shape, and edit is synchronized peer-to-peer using WebRTC. An AI panel analyzes selected objects and predicts their shape using a rule-based recognizer, with a TensorFlow.js pipeline ready to plug in a trained model.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS 4, Lucide React |
| Canvas | Fabric.js 7 |
| P2P Networking | PeerJS (WebRTC) |
| State Management | Zustand 5 |
| AI / ML | TensorFlow.js (pipeline ready, no trained model yet) |
| Language | TypeScript 5 |

---

## Features

### Collaborative Drawing
- Freehand pen and eraser tools
- Rectangle and circle shape tools
- Select, move, scale, and rotate objects
- Adjustable stroke width and color picker

### Real-Time P2P Sync
- Host a room and share a Room ID with collaborators
- Join a room by entering the host's Room ID
- Every draw action broadcasts instantly to all connected peers
- Canvas snapshot sent automatically to new peers on join
- CRDT-based conflict resolution with Lamport clocks for consistency

### AI Shape Recognition
- Select any drawn object and click **AI Recognize Shape**
- Rule-based recognizer classifies shapes from bounding box geometry
- Supports single objects and multi-stroke selections
- TensorFlow.js pipeline is connected and ready for a trained model

---

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm 9 or later

### Install dependencies

```bash
npm install
```

### Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for production

```bash
npm run build
npm start
```

---

## How to Test P2P Collaboration

1. Open [http://localhost:3000](http://localhost:3000) in **Browser A**.
2. Click **Create Room (Host)**. A Room ID appears — copy it.
3. Open [http://localhost:3000](http://localhost:3000) in **Browser B** (or a different device on the same network or internet).
4. Paste the Room ID into the **Join Room** field and click **Join**.
5. Draw on either canvas — strokes appear on both screens in real time.

> PeerJS uses a public signalling server by default. Both browsers must have internet access for the initial handshake, after which data flows directly peer-to-peer.

---

## AI Shape Recognition

The AI panel (bottom-left of the canvas) uses a **hybrid recognition architecture**.

### Rule-Based Recognizer (active now)

Analyzes the selected object's bounding box aspect ratio and Fabric.js type to predict the shape:

| Object | Prediction | Confidence |
|---|---|---|
| Fabric `Rect` | rectangle | 100% |
| Fabric `Ellipse` | circle | 100% |
| Freehand path, ratio 1.35 – 4.5 | rectangle | 70% |
| Freehand path, ratio 0.65 – 1.35 | circle or oval | 70% |
| Freehand path, ratio 0.22 – 0.65 | vertical rectangle | 70% |
| Freehand path, ratio > 4.5 | line or freehand stroke | 65% |
| Multi-stroke selection, ratio 1.2 – 4.5 | rectangle | 70% |
| Multi-stroke selection, ratio ~1 | square or circle/oval | 70% |

Multi-object selections (hand-drawn rectangles made from separate strokes) are handled by analyzing the **combined bounding box** of all selected paths.

### TensorFlow.js Pipeline (ready, no model loaded yet)

TensorFlow.js is installed and initialized on the client. The pipeline includes:

- `initTF()` — lazy-loads TensorFlow.js in the browser
- `loadModel(url)` — loads a `LayersModel` from any hosted URL
- `objectToTensor(object, canvas)` — rasterizes the selected object to a 28×28 grayscale tensor
- `predictWithModel(tensor)` — runs inference and returns the top predicted class

The AI panel displays the current TensorFlow.js status on every page load:

> **TensorFlow.js is connected, but no trained model is loaded yet.**

When a trained model (e.g. a Quick Draw-style sketch classifier) is available, connecting it requires only calling `loadModel(url)` — no other changes needed.

---

## Project Structure

```
synccanvas/
├── app/                         # Next.js App Router (layout, page)
├── components/
│   └── whiteboard/
│       ├── Whiteboard.tsx        # Main canvas + P2P orchestration
│       ├── Toolbar.tsx           # Drawing tools UI
│       ├── ConnectionPanel.tsx   # Host / join room UI
│       ├── PeerStatus.tsx        # Live connection status
│       └── AIPanel.tsx           # AI shape recognition panel
├── lib/
│   ├── canvas/
│   │   ├── aiBridge.ts           # Rule-based + TF.js recognition pipeline
│   │   ├── fabricFactory.ts      # Fabric canvas initialization
│   │   ├── canvasSerializer.ts   # Object serialization for sync
│   │   └── canvasReconciler.ts   # CRDT conflict resolution
│   ├── peer/
│   │   ├── PeerService.ts        # WebRTC peer management
│   │   └── protocol.ts           # Message types and sync envelope
│   └── utils/
│       └── ids.ts                # UUID generation
├── store/
│   └── whiteboardStore.ts        # Zustand global state
└── types/
    └── fabric.d.ts               # Fabric type augmentations
```

---

## Future Improvements

- **Trained ML model** — plug in a Quick Draw or custom sketch classifier via `loadModel()` to replace rule-based heuristics with real inference
- **Cursor presence** — show each peer's live cursor position (the protocol already defines `CURSOR_UPDATE` messages)
- **Undo / redo** — per-user history stack synchronized across peers
- **Sticky notes and text** — Fabric `IText` objects with full P2P sync
- **Room persistence** — save and restore canvas state via a lightweight backend or localStorage
- **Private rooms** — end-to-end encryption on the WebRTC data channel
- **Export** — download the canvas as PNG or SVG

---

## Portfolio Notes

SyncCanvas demonstrates:

- **Real-time distributed systems** — custom CRDT protocol with Lamport clocks resolves concurrent edits without a central server
- **WebRTC networking** — mesh topology where every peer broadcasts to all others; new peers receive a full canvas snapshot on join
- **AI integration architecture** — clean separation between rule-based logic (works today) and a model inference pipeline (ready for tomorrow), following a progressive enhancement pattern
- **Modern React patterns** — `useRef` for imperative Fabric.js integration, Zustand for shared UI state, dynamic imports to keep TensorFlow.js out of the SSR bundle
- **TypeScript throughout** — custom type augmentations for Fabric objects, typed message envelopes, strict build with no suppressions

---

## License

MIT
