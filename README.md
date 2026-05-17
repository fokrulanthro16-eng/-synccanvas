SyncCanvas

A real-time collaborative whiteboard with AI-powered shape recognition — no server required.

Show Image
Show Image
Show Image
Show Image
Show Image
Live demo → synccanvas.vercel.app

What is SyncCanvas?
SyncCanvas is a fully peer-to-peer collaborative whiteboard. Multiple users can draw, annotate, and edit a shared canvas simultaneously — with zero backend infrastructure. Every stroke is synchronized via WebRTC, conflict-free ordering is guaranteed through CRDT + Lamport clocks, and an AI panel classifies drawn shapes in real time.

Features
✏️ Collaborative Drawing

Freehand pen and eraser tools
Rectangle and circle primitives
Select, move, scale, and rotate objects
Adjustable stroke width and color picker

🌐 Real-Time P2P Sync

Host a room and share a Room ID — no accounts, no servers
Join any room by entering the host's Room ID
Every draw action broadcasts instantly to all connected peers
New peers receive a full canvas snapshot on join
CRDT conflict resolution with Lamport clocks for consistent ordering

🤖 AI Shape Recognition

Select any object and click AI Recognize Shape
Rule-based recognizer classifies shapes from bounding box geometry
TensorFlow.js pipeline is fully wired and ready for a trained model
Supports single objects and multi-stroke group selections


Tech Stack
LayerTechnologyFrameworkNext.js 16 (App Router, Turbopack)UIReact 19 · Tailwind CSS 4 · Lucide ReactCanvasFabric.js 7P2P NetworkingPeerJS (WebRTC)State ManagementZustand 5AI / MLTensorFlow.js (pipeline ready)LanguageTypeScript 5 (strict, zero suppressions)

Getting Started
Prerequisites

Node.js 18+
npm 9+

Installation
bash# 1. Clone the repo
git clone https://github.com/your-username/synccanvas.git
cd synccanvas

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev
Open http://localhost:3000 in your browser.
Production Build
bashnpm run build
npm start

Testing P2P Collaboration

Open http://localhost:3000 in Browser A
Click Create Room (Host) — copy the Room ID that appears
Open http://localhost:3000 in Browser B (same network or internet)
Paste the Room ID into the Join Room field and click Join
Draw on either canvas — strokes appear on both screens instantly


PeerJS uses a public signalling server for the initial handshake only. After connection, all data flows directly peer-to-peer.


AI Shape Recognition
The AI panel uses a hybrid recognition architecture designed for progressive enhancement.
Rule-Based Recognizer (active)
Classifies drawn shapes from their bounding box aspect ratio and Fabric.js object type:
InputPredictionConfidenceFabric.RectRectangle100%Fabric.EllipseCircle100%Freehand path — ratio 1.35–4.5Rectangle70%Freehand path — ratio 0.65–1.35Circle / Oval70%Freehand path — ratio 0.22–0.65Vertical rectangle70%Freehand path — ratio > 4.5Line / Stroke65%Multi-stroke selection — ratio 1.2–4.5Rectangle70%Multi-stroke selection — ratio ~1Square / Circle70%
TensorFlow.js Pipeline (ready, no model loaded)
The full TF.js inference pipeline is wired and running:
FunctionDescriptioninitTF()Lazy-loads TensorFlow.js in the browserloadModel(url)Loads a LayersModel from any hosted URLobjectToTensor(obj, canvas)Rasterizes the selection to a 28×28 grayscale tensorpredictWithModel(tensor)Runs inference and returns the top predicted class
Connecting a trained model (e.g. a Quick Draw sketch classifier) requires a single call to loadModel(url) — no other code changes needed.

Project Structure
synccanvas/
├── app/                          # Next.js App Router
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── whiteboard/
│       ├── Whiteboard.tsx        # Main canvas + P2P orchestration
│       ├── Toolbar.tsx           # Drawing tools UI
│       ├── ConnectionPanel.tsx   # Host / join room UI
│       ├── PeerStatus.tsx        # Live connection status indicator
│       └── AIPanel.tsx           # AI shape recognition panel
├── lib/
│   ├── canvas/
│   │   ├── aiBridge.ts           # Rule-based + TF.js recognition pipeline
│   │   ├── fabricFactory.ts      # Fabric canvas initialization
│   │   ├── canvasSerializer.ts   # Object serialization for P2P sync
│   │   └── canvasReconciler.ts   # CRDT conflict resolution logic
│   ├── peer/
│   │   ├── PeerService.ts        # WebRTC peer connection management
│   │   └── protocol.ts           # Message types and sync envelope schema
│   └── utils/
│       └── ids.ts                # UUID generation helpers
├── store/
│   └── whiteboardStore.ts        # Zustand global state
└── types/
    └── fabric.d.ts               # Fabric.js type augmentations

Roadmap

 Trained ML model — plug in a Quick Draw or custom sketch classifier via loadModel()
 Cursor presence — live cursor positions per peer (protocol already defines CURSOR_UPDATE)
 Undo / redo — per-user history stack synchronized across peers
 Sticky notes and text — Fabric.IText objects with full P2P sync
 Room persistence — save and restore canvas state via localStorage or a lightweight backend
 Private rooms — end-to-end encryption on the WebRTC data channel
 Export — download canvas as PNG or SVG


Engineering Highlights
Real-time distributed systems — Custom CRDT protocol with Lamport clocks resolves concurrent edits deterministically without a central server. No central authority means no single point of failure.
WebRTC mesh topology — Every peer broadcasts to all others. New peers receive a full canvas snapshot on join, ensuring they always start with consistent state.
Progressive AI architecture — Clean separation between a rule-based classifier (works today) and a full TF.js model inference pipeline (ready for tomorrow). Swapping in a trained model requires no architectural changes.
Modern React patterns — useRef for imperative Fabric.js integration; Zustand for shared UI state; dynamic imports to keep TensorFlow.js out of the SSR bundle.
Strict TypeScript — Custom type augmentations for Fabric objects, typed message envelopes, strict compiler with zero suppressions.

License
MIT © 2025
