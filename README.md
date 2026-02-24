# Roo-Code: Governed AI-Native IDE

![Build](https://img.shields.io/badge/build-passing-brightgreen) ![License](https://img.shields.io/badge/license-MIT-blue) ![Node](https://img.shields.io/badge/node-20.19.2-brightgreen) ![pnpm](https://img.shields.io/badge/package-manager-pnpm-blue)

> **Deterministic AI Orchestration**: From probabilistic assistants to governed, intent-driven workflows.

---

## **The Why**

### **Problem vs. Solution**

| **Probabilistic Assistants (Standard AI)** | **Governed Orchestration (Roo-Code)** |
|-------------------------------------------|---------------------------------------|
| Unpredictable outputs and "vibe coding." | Deterministic workflows with intent validation. |
| No traceability for AI-generated changes. | Immutable audit trails with SHA-256 hashes. |
| Context rot due to unstructured prompts.  | Curated context injection via `active_intents.yaml`. |

---

## **Key Features: The Governance Suite**

### **Middleware Hooks (The Interceptor Pattern)**
Wraps all tool executions with PreHooks and PostHooks, ensuring deterministic governance without invasive modifications.

### **Intent Handshake (The Two-Stage State Machine)**
Blocks execution until a valid `intent_id` is selected, enforcing scope validation and curated context injection.

### **Mathematical Traceability (SHA-256 Content Hashing)**
Ensures spatial independence by hashing normalized content, making identity stable across reformatting.

### **The Sidecar Ledger (`.orchestration/`)**
An append-only, machine-readable history of every mutating action, linking intents to code changes.

---

## **Technical Deep Dive**

### **Visual Workflow**

sequenceDiagram
    participant U as User
    participant W as Webview (React)
    participant E as Extension Host
    participant H as HookEngine (PreHook/PostHook)
    participant L as LLM (Reasoning only)
    participant T as Tool (Deterministic PONR)
    participant D as Ledger (agent_trace.jsonl)

    U->>W: Types request (goal/intent)
    W->>E: postMessage({ type: "ask", payload })
    E->>H: executeWithHooks(payload)

    H->>H: PreHook: validate intent_id & scope

    alt Intent missing or invalid
        H-->>E: Block execution (error)
        E-->>W: Notify (select/confirm intent)
    else Intent valid
        H->>L: Invoke with enriched context (intent, sidecar constraints)
        L-->>H: Reasoning output (planned tool calls, reasoning trace)
        H->>T: Execute Tool (deterministic, based on LLM plan)
        T-->>H: Result (outputs, affected files)
        H->>H: PostHook: compute SHA-256 content_hash, extract AST
        H->>D: Append trace entry (intent_id, reasoning_id, content_hash, AST, git_revision)
        H-->>E: Success (trace id)
        E-->>W: Update UI (status, artifacts, trace link)
    end


### **Point of No Return (PONR)**
- **Definition:** Critical operations like file writes or shell commands that mutate the workspace.
- **Governance:** PreHooks validate intent and scope before execution; PostHooks ensure traceability and auditability.



## **Quick Start**

### **Installation**
```bash
# Use Node.js 20.19.2
nvm use 20.19.2

# Install dependencies
pnpm install

# Build the project
pnpm build
```

### **Trigger Your First Governed Intent**
1. Define an intent in `.orchestration/active_intents.yaml`.
2. Use the IDE to make a change linked to the intent.
3. Observe the trace in `.orchestration/agent_trace.jsonl`.



## **Directory Map**

```plaintext
src/hooks
├── engines
│   ├── HookEngine.ts        # Deterministic IoC wrapper
│   ├── PreHook.ts           # Validates intent and scope
│   ├── PostHook.ts          # Computes hashes and appends traces
│   └── IntentLockManager.ts # Optimistic locking for parallel agents
├── models
│   └── AgentTrace.ts        # Trace schema definitions
└── utilities
    └── astCapture.ts        # AST node detection for semantic linkage
```



## **Why Roo-Code Wins**

> **Cognitive Debt Repaid:** By enforcing a formal intent-to-code contract, Roo-Code eliminates "vibe coding" and ensures every change is purposeful and traceable.

> **Enterprise-Ready:** Modular hooks, robust governance, and auditability make this fork scalable for large teams and complex projects.





