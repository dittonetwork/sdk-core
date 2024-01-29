import { ethers } from "ethers"

export interface InitOptions {
  backendUrl?: string
  account?: string
  signer?: ethers.providers.JsonRpcSigner
  vaultFactoryAddresses?: Map<number, string>
  provider: ethers.providers.JsonRpcProvider
}

export interface AutomationInitOptions {
  trigger: Ditto.Triggers
  actions: Ditto.Actions[]
  chainId: number
}

export interface AutomationBuildOptions {
  vault: Vault | Ditto.AutomaticVaultResolve
  transferFrom: Ditto.Holder
  chainId: number
}

export interface BuilderOptions {
  chainId: number
  recipient: string
  accountAddress: string
  vaultAddress: string
  provider: ethers.providers.JsonRpcProvider
}

export interface TransactionRequest {
  from: string
  to: string
  data: string
  value?: string
}

export interface Vault {
  accountId: string
  address: string
  chainId: number
  createdAt: string
  id: string
}

export interface VirtualAccount {
  address: string
  createdAt: string
  id: string
  userId: string
  vaults: Vault[]
}

export interface RootAccountData {
  id: string
  accounts: VirtualAccount[]
}

export namespace Ditto {
  export type AutomaticVaultResolve = "automatic"

  export enum Holder {
    Vault,
    Signer
  }

  export enum Actions {
    SwapWithUniswap = "swapWithUniswap"
  }

  export enum Triggers {
    // Schedule = "schedule",
    Instant = "instant",
    // Price = "price"
  }

  export type Trigger<T extends Ditto.Triggers> = DittoInternal.TriggerOptions[T]

  export type Action<A extends Ditto.Actions> = DittoInternal.ActionOptions[A]

}

export namespace DittoInternal {
  export interface ActionOptions {
    [Ditto.Actions.SwapWithUniswap]: {
      fromToken: string
      toToken: string
      fromAmount: string
      slippagePercent?: number
    }
  }

  export interface TriggerOptions {
    // [Ditto.Triggers.Schedule]: {
    //   startAtTimestamp: number
    //   repeatTimes?: number
    // }

    [Ditto.Triggers.Instant]: {}

    // [Ditto.Triggers.Price]: {
    //   uniswapPoolFeeTier: number
    //   triggerAtPrice: number
    //
    //   tokenAddress: string
    //   baseTokenAddress?: string
    // }
  }
}
