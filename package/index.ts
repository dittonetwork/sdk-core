import { InitOptions } from "./types"
import { DittoSDK } from "./modules/main"

export default async function createDittoSDK(options: InitOptions): Promise<DittoSDK> {
  const signerAddress = await options.signer?.getAddress()
  const address = signerAddress ?? options.account

  if (!address) throw new Error("Can not found account address")

  return new DittoSDK({
    ...options,
    account: address
  })
}
