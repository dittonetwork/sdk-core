import { InitOptions } from "./types"
import { DittoSDK } from "./modules/main"
import { FeeAmount } from "@uniswap/v3-sdk"

export default async function createDittoSDK(options: InitOptions): Promise<DittoSDK> {
  const signerAddress = await options.signer?.getAddress()
  const address = signerAddress ?? options.account

  if (!address) throw new Error("Can not found account address")

  return new DittoSDK({
    ...options,
    account: address
  })
}

export { FeeAmount } from "@uniswap/v3-sdk"
