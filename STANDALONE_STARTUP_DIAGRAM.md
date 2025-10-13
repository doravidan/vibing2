# Vibing2 Desktop - Startup Sequence Diagram

## Complete Startup Flow

```mermaid
sequenceDiagram
    participant User
    participant OS as Operating System
    participant Tauri as Tauri Shell
    participant DB as SQLite Database
    participant Server as HTTP Server
    participant Static as Static Files
    participant WebView
    participant UI as React UI

    User->>OS: Launch Vibing2.app
    OS->>Tauri: Start Process

    rect rgb(240, 240, 255)
        Note over Tauri: Initialization Phase
        Tauri->>Tauri: Load Configuration
        Tauri->>Tauri: Initialize Plugins
        Tauri->>DB: Open/Create Database
        DB->>DB: Run Migrations
        DB-->>Tauri: Database Ready
    end

    rect rgb(255, 240, 240)
        Note over Server: Server Startup Phase
        Tauri->>Server: Start HTTP Server
        Server->>Server: Find Available Port (3000-9000)

        alt Port Found
            Server->>Server: Bind to 127.0.0.1:PORT
        else No Port Available
            Server-->>Tauri: Error: No ports available
            Tauri-->>User: Show Error Dialog
        end

        Server->>Static: Load Static Assets
        Static->>Static: Index HTML/CSS/JS
        Static-->>Server: Assets Ready
        Server->>Server: Setup API Routes
        Server->>Server: Initialize Middleware
        Server-->>Tauri: Server Ready (URL)
    end

    rect rgb(240, 255, 240)
        Note over WebView: UI Loading Phase
        Tauri->>WebView: Create Window
        WebView->>WebView: Set Window Properties
        Tauri->>WebView: Navigate to Server URL
        WebView->>Server: GET http://127.0.0.1:PORT/
        Server->>Static: Serve index.html
        Static-->>WebView: HTML Response

        WebView->>Server: GET /_next/static/css/*
        Server-->>WebView: CSS Files

        WebView->>Server: GET /_next/static/js/*
        Server-->>WebView: JavaScript Bundles

        WebView->>UI: Initialize React App
        UI->>UI: Render Components
        UI->>Server: GET /api/auth/session
        Server->>DB: Check Session
        DB-->>Server: Session Data
        Server-->>UI: User State
    end

    rect rgb(255, 255, 240)
        Note over UI: Ready State
        UI->>UI: Route to Dashboard/Login
        UI-->>WebView: Render Complete
        WebView-->>User: Show Application
    end
```

## Detailed Timing Breakdown

```mermaid
gantt
    title Vibing2 Desktop Startup Timeline
    dateFormat X
    axisFormat %L ms

    section System
    OS Launch           :0, 100
    Tauri Init          :100, 300

    section Database
    DB Connection       :400, 200
    Schema Migration    :600, 100

    section Server
    Port Detection      :700, 50
    Server Binding      :750, 50
    Route Setup         :800, 100
    Asset Loading       :900, 200

    section UI
    WebView Create      :1100, 200
    HTML Load           :1300, 100
    CSS Load            :1400, 100
    JS Load             :1500, 200
    React Init          :1700, 200
    First Render        :1900, 100
```

## Error Handling Flow

```mermaid
flowchart TD
    A[Start Application] --> B{Database OK?}
    B -->|Yes| C{Port Available?}
    B -->|No| B1[Create Database]
    B1 --> B2{Success?}
    B2 -->|Yes| C
    B2 -->|No| E1[Show DB Error]

    C -->|Yes| D{Server Start OK?}
    C -->|No| C1[Try Next Port]
    C1 --> C2{More Ports?}
    C2 -->|Yes| C
    C2 -->|No| E2[Show Port Error]

    D -->|Yes| F{Static Files OK?}
    D -->|No| E3[Show Server Error]

    F -->|Yes| G[Load UI]
    F -->|No| F1{Use Fallback?}
    F1 -->|Yes| G
    F1 -->|No| E4[Show Asset Error]

    G --> H{UI Loaded?}
    H -->|Yes| I[Application Ready]
    H -->|No| E5[Show UI Error]

    E1 --> X[Exit with Error]
    E2 --> X
    E3 --> X
    E4 --> X
    E5 --> X
```

## Component Communication

```mermaid
graph TB
    subgraph "Native Layer"
        T[Tauri Shell]
        D[SQLite DB]
        S[System Tray]
    end

    subgraph "Server Layer"
        H[HTTP Server<br/>Port: Dynamic]
        A[API Routes]
        ST[Static Files]
        M[Middleware]
    end

    subgraph "UI Layer"
        W[WebView]
        R[React App]
        C[Components]
    end

    T --> D
    T --> S
    T --> H
    H --> A
    H --> ST
    H --> M
    A --> D
    W --> H
    R --> W
    C --> R

    T -.->|IPC| W
    R -.->|HTTP/WS| A
```

## Port Selection Algorithm

```mermaid
flowchart LR
    A[Start] --> B[Port = 3000]
    B --> C{Is Port Free?}
    C -->|Yes| D[Bind to Port]
    C -->|No| E[Port++]
    E --> F{Port <= 9000?}
    F -->|Yes| C
    F -->|No| G[Error: No Ports]
    D --> H[Return Port]
    G --> I[Exit]
```

## State Management Flow

```mermaid
stateDiagram-v2
    [*] --> Initializing
    Initializing --> DatabaseSetup
    DatabaseSetup --> ServerStarting
    ServerStarting --> PortBinding

    PortBinding --> ServerReady: Port Found
    PortBinding --> Error: No Ports

    ServerReady --> UILoading
    UILoading --> AppReady

    AppReady --> Authenticated: Has Session
    AppReady --> Unauthenticated: No Session

    Unauthenticated --> Authenticating: Login
    Authenticating --> Authenticated: Success
    Authenticating --> Unauthenticated: Failed

    Authenticated --> Working: User Action
    Working --> Authenticated: Complete

    Authenticated --> Unauthenticated: Logout

    Error --> [*]
    AppReady --> [*]: Quit
```

## Performance Optimization Points

```mermaid
graph TD
    A[Startup] --> B{Optimize}
    B --> C[Parallel Init]
    B --> D[Lazy Loading]
    B --> E[Asset Caching]
    B --> F[DB Connection Pool]

    C --> C1[DB + Server<br/>Concurrent Start]
    D --> D1[Code Splitting<br/>Route-based Loading]
    E --> E1[Browser Cache<br/>Service Worker]
    F --> F1[Reuse Connections<br/>5 Max Pool]

    C1 --> G[Save 300ms]
    D1 --> H[Save 500ms]
    E1 --> I[Save 200ms]
    F1 --> J[Save 100ms]

    G --> K[Total: 1.1s Saved]
    H --> K
    I --> K
    J --> K
```

## Resource Usage Timeline

```mermaid
graph LR
    subgraph "Memory Usage"
        A[Launch: 20MB] --> B[DB Init: 25MB]
        B --> C[Server: 35MB]
        C --> D[WebView: 60MB]
        D --> E[UI Loaded: 80MB]
        E --> F[Idle: 60MB]
    end

    subgraph "CPU Usage"
        A1[Launch: 80%] --> B1[DB: 20%]
        B1 --> C1[Server: 30%]
        C1 --> D1[WebView: 60%]
        D1 --> E1[UI: 40%]
        E1 --> F1[Idle: 5%]
    end
```

## Key Metrics

| Phase | Duration | Memory | CPU |
|-------|----------|--------|-----|
| OS Launch | 100ms | 20MB | 80% |
| Tauri Init | 300ms | 5MB | 30% |
| Database Setup | 300ms | 5MB | 20% |
| Server Start | 400ms | 10MB | 30% |
| UI Loading | 800ms | 25MB | 60% |
| First Render | 100ms | 20MB | 40% |
| **Total** | **2000ms** | **85MB** | **Peak: 80%** |

## Optimization Opportunities

1. **Parallel Initialization**: Start DB and Server concurrently
2. **Asset Preloading**: Bundle critical CSS inline
3. **Lazy Routes**: Load pages on-demand
4. **Service Worker**: Cache static assets
5. **Connection Pooling**: Reuse DB connections