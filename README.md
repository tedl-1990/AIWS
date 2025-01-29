# AIWS: The DeAgent Network

<p align="center">
<a href="https://aiws.eth.limo">AIWS ENS AI Launcher</a><br>
<a href="https://ainick.eth.limo">AI Nick.eth</a>
</p>

![Banner Animation](./assets/BannerAni.gif)

Welcome to AIWS, a modular network for generating and managing DeAgents fully built on decentralized stacks, including IPFS, Filecoin, Solana, Ethereum, ENS, SNS, Glitter, etc. 

## Key Features

- 🔍 On-Chain Real-Time Transparency
- 🛠️ Serverless & Unstoppable Architecture  
- 🆔 Cross-Chain DeAgent DID
- 🌐 Permissionless Access
- 🧠 Interoperable Swarm Intelligence

## Architecture Overview

### System-Level Diagram

![AIWS Architecture](./assets/AIWS.jpg)

```
+------------------------------------------------------------------------------+
|                                   User                                       |
+------------------------------------------------------------------------------+
|                                  Client                                      |
|       🌐 Web      ✖ DApps      🎮 Games      📸 Social Media      📱 Apps   |
+------------------------------------------------------------------------------+
|                     Universal Communication Layer                            |
|    Enables interaction between components across layers and cross-chain DID  |
|                         support for interoperability                         |
+------------------------------------------------------------------------------+
|                                    DID                                       |
|              .eth        .sol        .sui           .bnb                     |
|              🦄           🔥           📦             🟦                    |
+------------------------------------------------------------------------------+
|                               IPFS + Filecoin                                |
|  Agent Metadata and Memory                  +--------------------------------+
|  Integrated with decentralized storage      |            Plugins             |
|  and retrieval for transparency             |    - Wallets                   |
|                                             |    - DeFi                      |
|                                             |    - Data                      |
|                                             |    - Game Engines              |
|                                             +--------------------------------+
+------------------------------------------------------------------------------+
|                                   Models                                     |
|       🐳 DeepSeek       🧠 Claude      🌞 OpenAI       🌀 Llama              |
|                                                                              |
+------------------------------------------------------------------------------+
```

## Core Features

### DeAgent Generation
- Generate DeAgent via official page (e.g., `AIWS.eth`)
- Submit metadata (avatar, persona, description, ENS bindings)
- Host DeAgents on IPFS with verifiable hash

### Communication Protocol
- DeAgent communication via unique DID (`.eth`, `.sol`, `.sui`)
- Cross-chain interoperability through DID references

### Data Storage
- IPFS-based persistent storage for logs and metadata
- Open data access for AI training and verification

### Governance
- DAO-managed DID domains
- Token-based governance system

## Components

### 1. User Interface (UI)
- Frontend: React/Next.js based
- Interactive forms for DeAgent deployment

### 2. DID Layer
- DID-IPFS hash binding via signatures
- Multi-chain extension support

### 3. DeAgent Metadata Layer
```json
{
  "name": "AgentName",
  "avatar": "ipfs://hash",
  "description": "AI agent description",
  "did": "agentname.eth",
  "persona": "{Base Prompt Data}",
  "etc": "additional metadata"
}
```

### 4. LLM API Layer
- OpenRouter integration for multiple models
- Extensible model backend support

### 5. Context Memory Layer
- Glitter Protocol integration
- Configurable session logging

### 6. Data Layer
- Decentralized database integration
- RAG enhancement capabilities

### 7. Wallet Component
- Web3 wallet integration (MetaMask/Phantom)
- Multi-chain asset management

### 8. Governance Layer
- Token-based DAO voting
- Flexible DID management options

## Implementation Details

### DeAgent Generation Process
```
+-------------+            +------------+             +------------+
| User Input  | --(JSON)-> | IPFS Node  | --(CID)---> | ENS Update |
+-------------+            +------------+             +------------+
```

### Communication Protocol
```
+------------+          +----------------+          +------------+
| Requester  | --(DID)->| ENS Resolver   | --(CID)->| IPFS Node  |
+------------+          +----------------+          +------------+
```

### Agent-to-Agent Interaction Workflow
```
+------------+            +----------------+                +------------+
| Agent A    | ---(DID)-->| Communication  | ----(DID)----> | Agent B    |
| (Initiator)|            | Layer          |                | (Responder)|
+------------+            +----------------+                +------------+
       |                          |                              |
       v                          v                              v
+-------------+           +-----------------+              +-------------+
| ENS Resolver| --(CID)-->| Target Agent    | --(Request)->| Agent Logic |
| & Gateway   |           | IPFS Metadata   |              | Execution   |
+-------------+           +-----------------+              +-------------+
       |                          |                              |
       v                          v                              v
+-------------+            +----------------+             +--------------+
| Interaction | <-(Sync)-> | Context Memory | <--(Log)--- | Glitter DB   |
| Logs        |            | Update         |             | (RAG)        |
+-------------+            +----------------+             +--------------+
```

### Multi-Agent Workflow
```
                          +-------------------+
                          |       Human       |
                          |    (Requester)    |
                          +-------------------+
                                  |
                                  v
          +------------------------------------------------------+
          |                 Communication Layer                   |
          |  - DID-based routing                                  |
          |  - Workflow orchestration                             |
          |  - Agent invocation                                   |
          +------------------------------------------------------+
              |                    |                    |
              v                    v                    v
    +------------------+  +------------------+  +------------------+
    |    AI Agent 1    |  |    AI Agent 2    |  |    AI Agent N    |
    | (e.g., Language) |  | (e.g., Vision)   |  | (e.g., Trading)  |
    +------------------+  +------------------+  +------------------+
              |                    |                    |
    +------------------+  +------------------+  +------------------+
    |  Task Output 1   |  |  Task Output 2   |  |  Task Output N   |
    +------------------+  +------------------+  +------------------+
                \                 |                    /
                 \                v                   /
          +-----------------------------------------------+
          |        Final Workflow Integration              |
          |   (Combines agent outputs into results)        |
          +-----------------------------------------------+
```

### Memory and Context Handling
```
    +-------------------+
    |       User        |
    | Starts Interaction|
    +-------------------+
             |
             v
+----------------------------+
| Query AI Agent DID via ENS |
| (Resolve On-chain IPFS)    |
+----------------------------+
             |
             v
+----------------------------+
| Fetch IPFS Metadata via    |
| Contenthash (Validate Hash)|
+----------------------------+
             |
             v
+----------------------------+
| Load Personality & Context |
| - Metadata Includes:       |
|   - Persona Data           |
|   - Interaction Interface  |
+----------------------------+
             |
             v
+-----------------------------+
| Live Interaction with Agent |
| Real-time Memory Sync to    |
| IPFS via Glitter Protocol   |
| - Context Logged in IPFS    |
| - CID Returned & Verified   |
+-----------------------------+
```

### Governance Workflow
```
+-----------------------------+
| Community Development       |
| (New IPFS Persona Created)  |
+-----------------------------+
               |
               v
+-----------------------------+
| Submit Proposal to DAO      |
| (New Persona Version)       |
+-----------------------------+
               |
               v
+-----------------------------+
| DAO Token Voting            |
| (Proposal Approved or Not)  |
+-----------------------------+
               |
         +-----+-----+
         |           |
         v           v
+-----------------+ +-----------------+
| Proposal Passed | | Proposal Failed |
+-----------------+ +-----------------+
         |                   |
         |                   v
         |      +-----------------------------+
         |      | No Update to DID Content    |
         |      +-----------------------------+
         v
+-----------------------------+
| Update ENS Contenthash      |
| (Points to New IPFS CID)    |
+-----------------------------+
               |
               v
+-----------------------------+
| Publish Changes             |
| (DID Resolves to Updated    |
|  Persona Version)           |
+-----------------------------+
               |
               v
+-----------------------------+
| On-chain Record Tracking    |
| - DAO Vote Results          |
| - ENS Contenthash Changes   |
+-----------------------------+
```

## Advantages

| Feature | AIWS Network |
|---------|---------------|
| Transparency | Fully open IPFS storage |
| Decentralization | DAO-governed ENS and DID |
| Cross-Chain Support | Multi-chain DID interop |
| RAG Integration | Built-in decentralized DB |
| Governance | Flexible control options |

## Future Development

1. **Multi-Agent Collaboration**
   - Autonomous interaction capabilities
   - Advanced workflow orchestration

2. **Enhanced RAG Framework**
   - Expanded data source integration
   - Improved retrieval mechanisms

3. **Privacy Enhancements**
   - zk-SNARKs implementation
   - Private interaction logging

4. **Scalability Improvements**
   - L2 caching optimization
   - Protocol efficiency updates
