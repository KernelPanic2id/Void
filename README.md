# Void

A cross-platform, high-performance voice & video client built with **Rust**, **WebAssembly**, **Tauri v2** and **React 19**.

## Architecture

```mermaid
graph TB
    subgraph "Desktop App — Tauri v2"
        direction TB
        REACT["React 19 + Vite<br/>(UI Layer)"]
        CTX["7 Contexts<br/>Auth · Voice · Stream<br/>Chat · Server · Toast · BentoLayout"]
        HOOKS["8 Hooks<br/>BentoDrag · BentoResize · Dashboard<br/>NetworkStats · PTT · VAD · Profile"]
        API["API Layer<br/>Protobuf Content Negotiation"]
        TAURI_CMD["Tauri Commands<br/>Identity · Bento Layout · TLS Pinning"]
    end

    subgraph "core-wasm — Rust → WASM"
        DSP["Audio DSP<br/>SmartGate · TransientSuppressor · RNNoise"]
        CODEC["Protobuf Codec<br/>prost + serde-wasm-bindgen"]
        VID["Video Analysis<br/>Frame detection · Histogram"]
        NET["Network Scoring<br/>Quality calculator"]
    end

    subgraph "Signaling Server — Rust"
        SFU["SFU Engine<br/>webrtc-rs · JitterBuffer"]
        AUTH["Auth Module<br/>JWT · Argon2id"]
        FRIENDS["Friends Module<br/>CRUD + pending requests"]
        STORE["Protobuf Store<br/>DashMap → .bin flush"]
        METRICS["Prometheus Metrics<br/>Peers · Channels · Bandwidth"]
    end

    REACT --> CTX --> HOOKS
    HOOKS --> API
    API -- "Protobuf / JSON" --> AUTH
    API -- "Protobuf / JSON" --> FRIENDS
    REACT -- "AudioWorklet" --> DSP
    REACT -- "Worker" --> VID
    HOOKS -- "WebSocket (TLS pinned)" --> SFU
    HOOKS --> NET
    API --> CODEC
    TAURI_CMD -- "IPC" --> REACT
    SFU --> STORE
    AUTH --> STORE
    FRIENDS --> STORE
```

## Tech Stack

| Layer | Technologies |
|---|---|
| **Desktop Shell** | Tauri v2, Rust, TLS Certificate Pinning |
| **Frontend** | React 19, TypeScript, TailwindCSS v4, Vite 7 |
| **Real-time Audio** | WebRTC, AudioWorklet, RNNoise, WASM DSP |
| **WASM Core** | Rust, wasm-bindgen, prost (protobuf) |
| **Signaling Server** | Axum, Tokio, webrtc-rs, DashMap |
| **Auth** | Ed25519 (local keypair), Argon2id, JWT HS256 |
| **Observability** | Prometheus, Grafana, Alertmanager |
| **Serialization** | Protobuf (prost) with JSON fallback |

## Monorepo Structure

```
void/
├── apps/desktop/              # Tauri + React + Vite desktop app
│   ├── src/                   # React frontend (contexts, hooks, components)
│   ├── src-tauri/             # Rust backend (identity, Bento layout, TLS)
│   └── public/worker/         # Compiled audio worklets
├── packages/
│   ├── core-wasm/             # Rust → WASM (DSP, codec, video, network)
│   └── signaling-server/      # Rust signaling + SFU + auth + friends
├── docker/                    # Prometheus, Grafana, Alertmanager configs
├── Cargo.toml                 # Rust workspace
└── pnpm-workspace.yaml        # pnpm workspace
```

## Key Flows

### Authentication

```mermaid
sequenceDiagram
    participant U as User
    participant T as Tauri (Rust)
    participant R as React
    participant W as core-wasm
    participant S as Signaling Server

    U->>R: Create identity (pseudo + password)
    R->>T: create_identity (IPC)
    T->>T: Ed25519 keypair + Argon2id hash
    T-->>R: Identity { publicKey, pseudo }
    R->>W: encodeRegisterBody(...)
    W-->>R: Uint8Array (protobuf)
    R->>S: POST /api/auth/register (protobuf)
    S->>S: Argon2id verify + store + JWT sign
    S-->>R: AuthResponse { token, user }
    R->>W: decodeAuthResponse(bytes)
    W-->>R: { token, user }
```

### Voice (SFU WebRTC)

```mermaid
sequenceDiagram
    participant C as Client
    participant WS as WebSocket (TLS)
    participant SFU as SFU Engine
    participant PC as PeerConnection (webrtc-rs)

    C->>WS: { type: "join", channelId, userId }
    SFU-->>C: { type: "joined", peers, startedAt }
    C->>C: getUserMedia() → AudioWorklet (WASM DSP)
    C->>WS: { type: "offer", sdp }
    SFU->>PC: create PeerConnection + set remote SDP
    PC-->>SFU: SDP answer
    SFU-->>C: { type: "answer", sdp }
    C->>WS: { type: "ice", candidate }
    SFU->>PC: add ICE candidate

    Note over SFU,PC: Tracks forwarded via ForwarderState + JitterBuffer (30ms)
    SFU-->>C: { type: "trackMap", userId, trackId, kind }
```

## Quick Start

```sh
pnpm install
cd apps/desktop
pnpm dev
```

### Build WASM Core

```sh
cd packages/core-wasm
wasm-pack build --target web --out-dir ../../apps/desktop/src/pkg
```

### Build Audio Worklet

```sh
cd apps/desktop
pnpm build:worklet
```

### Native Desktop Build

```sh
pnpm tauri build
```

## Observability (Docker)

```sh
docker compose up -d
```

Starts Prometheus (`:9090`), Grafana (`:3000`), Alertmanager (`:9093`), Node Exporter (`:9100`).

## License

**Business Source License 1.1 (BSL-1.1)** — See [LICENSE](./LICENSE).

---

# Void (FR)

Client vocal et vidéo multiplateforme haute performance construit avec **Rust**, **WebAssembly**, **Tauri v2** et **React 19**.

## Architecture

```mermaid
graph TB
    subgraph "Application Desktop — Tauri v2"
        direction TB
        REACT["React 19 + Vite<br/>(Couche UI)"]
        CTX["7 Contexts<br/>Auth · Voice · Stream<br/>Chat · Server · Toast · BentoLayout"]
        HOOKS["8 Hooks<br/>BentoDrag · BentoResize · Dashboard<br/>NetworkStats · PTT · VAD · Profile"]
        API["Couche API<br/>Négociation de contenu Protobuf"]
        TAURI_CMD["Commandes Tauri<br/>Identité · Bento Layout · TLS Pinning"]
    end

    subgraph "core-wasm — Rust → WASM"
        DSP["Audio DSP<br/>SmartGate · TransientSuppressor · RNNoise"]
        CODEC["Codec Protobuf<br/>prost + serde-wasm-bindgen"]
        VID["Analyse Vidéo<br/>Détection de frames · Histogramme"]
        NET["Scoring Réseau<br/>Calculateur de qualité"]
    end

    subgraph "Serveur de Signalisation — Rust"
        SFU["Moteur SFU<br/>webrtc-rs · JitterBuffer"]
        AUTH["Module Auth<br/>JWT · Argon2id"]
        FRIENDS["Module Amis<br/>CRUD + requêtes en attente"]
        STORE["Store Protobuf<br/>DashMap → flush .bin"]
        METRICS["Métriques Prometheus<br/>Pairs · Salons · Bande passante"]
    end

    REACT --> CTX --> HOOKS
    HOOKS --> API
    API -- "Protobuf / JSON" --> AUTH
    API -- "Protobuf / JSON" --> FRIENDS
    REACT -- "AudioWorklet" --> DSP
    REACT -- "Worker" --> VID
    HOOKS -- "WebSocket (TLS pinné)" --> SFU
    HOOKS --> NET
    API --> CODEC
    TAURI_CMD -- "IPC" --> REACT
    SFU --> STORE
    AUTH --> STORE
    FRIENDS --> STORE
```

## Stack Technique

| Couche | Technologies |
|---|---|
| **Shell Desktop** | Tauri v2, Rust, Certificate Pinning TLS |
| **Frontend** | React 19, TypeScript, TailwindCSS v4, Vite 7 |
| **Audio Temps Réel** | WebRTC, AudioWorklet, RNNoise, DSP WASM |
| **Noyau WASM** | Rust, wasm-bindgen, prost (protobuf) |
| **Serveur de Signalisation** | Axum, Tokio, webrtc-rs, DashMap |
| **Auth** | Ed25519 (keypair local), Argon2id, JWT HS256 |
| **Observabilité** | Prometheus, Grafana, Alertmanager |
| **Sérialisation** | Protobuf (prost) avec fallback JSON |

## Structure du Monorepo

```
void/
├── apps/desktop/              # App desktop Tauri + React + Vite
│   ├── src/                   # Frontend React (contexts, hooks, composants)
│   ├── src-tauri/             # Backend Rust (identité, Bento layout, TLS)
│   └── public/worker/         # Worklets audio compilés
├── packages/
│   ├── core-wasm/             # Rust → WASM (DSP, codec, vidéo, réseau)
│   └── signaling-server/      # Signalisation Rust + SFU + auth + amis
├── docker/                    # Configs Prometheus, Grafana, Alertmanager
├── Cargo.toml                 # Workspace Rust
└── pnpm-workspace.yaml        # Workspace pnpm
```

## Flux Principaux

### Authentification

```mermaid
sequenceDiagram
    participant U as Utilisateur
    participant T as Tauri (Rust)
    participant R as React
    participant W as core-wasm
    participant S as Serveur de Signalisation

    U->>R: Créer identité (pseudo + mot de passe)
    R->>T: create_identity (IPC)
    T->>T: Keypair Ed25519 + hash Argon2id
    T-->>R: Identity { publicKey, pseudo }
    R->>W: encodeRegisterBody(...)
    W-->>R: Uint8Array (protobuf)
    R->>S: POST /api/auth/register (protobuf)
    S->>S: Vérification Argon2id + stockage + signature JWT
    S-->>R: AuthResponse { token, user }
    R->>W: decodeAuthResponse(bytes)
    W-->>R: { token, user }
```

### Voix (SFU WebRTC)

```mermaid
sequenceDiagram
    participant C as Client
    participant WS as WebSocket (TLS)
    participant SFU as Moteur SFU
    participant PC as PeerConnection (webrtc-rs)

    C->>WS: { type: "join", channelId, userId }
    SFU-->>C: { type: "joined", peers, startedAt }
    C->>C: getUserMedia() → AudioWorklet (DSP WASM)
    C->>WS: { type: "offer", sdp }
    SFU->>PC: Crée PeerConnection + set remote SDP
    PC-->>SFU: SDP answer
    SFU-->>C: { type: "answer", sdp }
    C->>WS: { type: "ice", candidate }
    SFU->>PC: Ajout candidat ICE

    Note over SFU,PC: Tracks relayés via ForwarderState + JitterBuffer (30ms)
    SFU-->>C: { type: "trackMap", userId, trackId, kind }
```

## Démarrage Rapide

```sh
pnpm install
cd apps/desktop
pnpm dev
```

### Compiler le Noyau WASM

```sh
cd packages/core-wasm
wasm-pack build --target web --out-dir ../../apps/desktop/src/pkg
```

### Compiler le Worklet Audio

```sh
cd apps/desktop
pnpm build:worklet
```

### Build Desktop Natif

```sh
pnpm tauri build
```

## Observabilité (Docker)

```sh
docker compose up -d
```

Lance Prometheus (`:9090`), Grafana (`:3000`), Alertmanager (`:9093`), Node Exporter (`:9100`).

## Licence

**Business Source License 1.1 (BSL-1.1)** — Voir [LICENSE](./LICENSE).
