# Ditto SDK core

## Compatibility

This section describes the SDK's current transaction creation and network support capabilities

### Networks

List of networks that the SDK already supports or will support after a few updates

| Network name      | ID    | Supported from    |
|-------------------|-------|-------------------|
| Polygon Mainnet   | 137   | v0.0.1            |
| Arbitrum One      | 42161 | v0.0.2            |
| BNB chain         | 56    | — (planned)       |

### Actions
List of actions currently supported by the SDK

| Action                   | Supported from    |
|--------------------------|-------------------|
| Swap with uniswap        | v0.0.1            |
| Swap with dex aggregator | — (planned)       |

### Triggers
List of triggers currently supported by the SDK

| Trigger     | Supported from    |
|-------------|-------------------|
| Instant     | v0.0.1            |
| Schedule    | v0.0.2            |
| Price based | v0.0.2            |
| AAVE        | — (not supported) |



## SDK basics

This section provides examples of how to use the SDK and various instructions

### 1. Install SDK core
```shell
npm add @dittoproject/sdk-core
```

### 2. Initialize SDK

You can install the package in any way you like, including using `yarn`, `bun`, `pnpm`, `npm`, etc.

```js
import createDittoSDK from "@dittoproject/sdk-core"

const sdk = await createDittoSDK({
    signer: "Your signer here (optional, but recommended for front-ends)",
    provider: new ethers.providers.JsonRpcProvider("Your RPC provider URL")
})
```

### 3. Authentication

Authentication is primarily needed so that users can interact with their smart wallets or create new ones. Without authorization, any actions with smart wallets will be rejected

#### 3.1. Authenticate using existing signer

```js
await sdk.authentication.authenticateWithSigner(/*
    place signer here if not provided in sdk init object 
*/)
```

This will trigger user's wallet and show prompt to sign message, retrieved from Ditto backend

#### 3.2. Get authentication data for manual authentication

```js
// Get nonce from Ditto backend
const nonce = await sdk.authentication.getAuthenticationNonce()

// Sign nonce with your account manually
const signature = ""

// Verify signature
const result = await sdk.authentication.verifySignature(signature) // => boolean
```

### 4. Create and configure automation

Automation is an object in which user-defined parameters are stored. There can be an unlimited number of these objects. Configured automations can be deployed with the help of SDK

```js
import { Ditto } from "@dittoproject/sdk-core"

const automation = sdk.createAutomation({
    chainId: 137,
    trigger: Ditto.Triggers.Instant,
    actions: [
      Ditto.Actions.SwapWithUniswap
    ]
})


// Use .configureTrigger for trigger 
// confgiration, we skip it here
// because instant trigger does not 
// require configuration

// In this example we will swap 
// 0.1 USDT to USDC using uniswap
// with automatic route building
automation.configureAction(Actions.SwapWithUniswap, {
    fromToken: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    toToken: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    fromAmount: "100000"
})
```

### 5. Build or deploy automation

```js
const result = await sdk.buildAutomation(automation, {
    // Where to take assets from, 
    // Signer = from user, Vault = from vault balance
    
    // If signer specified, then transfers will 
    // be added to pre call data
    transferFrom: Holder.Signer,
    chainId: 137,
    // Specify vault or let SDK choose
    vault: "automatic"
})
```

To deploy your automation instead of just getting data, replace `buildAutomation` method to
`deployAutomation` with same arguments

## Working with vaults

Actions with vaults can be done only after authentication

### Retrieve vaults
```js
// Get all account vaults list
sdk.vaults.getVaults()

// Get specific vault
// First argument is vault index in array
// Second is vault chain id, optional
sdk.vaults.getVault(0, 137)
```

### Deploy new vault
```js
// Deploy new vault
// First argument is chain id
// Second is vault version, currently latest 
// version on polygon is 3
await sdk.vaults.deployVault(137, 2)

// After vault deployed, update account data to 
// be able to get new vault
await sdk.updateCachedAccount()
```

### Withdraw ERC-20 tokens and native currency

In this example we will transfer 0.1 USDT from vault1 to vault2

```js
const vault1 = sdk.vaults.getVault(0, 137)
const vault2 = sdk.vaults.getVault(1, 137)

// To withdraw native currency, pass zero address 
// into token address argument
sdk.vaults.getTokenWithdrawTransaction(
    vault1, 
    vault2.address,
    "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", 
    "100000"
) // => TransactionRequest
```

This method returns you a transaction request that you can execute with your signer
