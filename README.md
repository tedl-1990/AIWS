# Governoun: A Decentralized Governance Agent

[GoverNoun.eth](https://governoun.eth.limo) governance AI agents for Nouns DAO, The AI agent allows users to lobby with it to influence its voting decisions.

All lobby history will be transparent and accessible via IPFS, and packed to ETH mainnet when voting.

Actively gathering community data from discord servers, farcaster channels and onchain feedbacks.

## Key Features

- On-Chain Real-Time Transparency
- Serverless & Unstoppable Architecture  
- Cross-Chain DID
- Permissionless Access


## Architecture Overview

### System-Level Diagram

```
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
|                                             +--------------------------------+
+------------------------------------------------------------------------------+
|                                  Aethir                                      |
|                🐳 DeepSeek                    🌀 Llama                       |
| (Compute powered by Aethir; data sourced from Nouns Discord, Farcaster,      |
| and on-chain information)                                                    |
+------------------------------------------------------------------------------+
```

## Implementation Details

### Governance Agent Generation Process
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

## Advantages

| Feature | Governoun.eth |
|---------|---------------|
| Transparency | Fully open IPFS storage |
| Decentralization | ENS and DID |
| Cross-Chain Support | Multi-chain DID interoperable |
| RAG Integration | Built-in decentralized DB |
| Governance | Flexible control options |
