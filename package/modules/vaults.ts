import { DittoSDK } from "./main"

export default class VaultsModule {
  constructor(private readonly parent: DittoSDK) {
  }

  public getVaults() {
    return this.parent._rootAccountData?.accounts.map(account => account.vaults).flat()
  }

  public getVault(index = 0, chainId?: number) {
    return this.parent._rootAccountData?.accounts.map(account => account.vaults)
      .flat()
      .filter(vault => chainId !== undefined ? parseInt(String(vault.chainId)) === chainId : true)
      .at(index)
  }
}
