import { DittoSDK } from "./main"
import { ethers } from "ethers"
import VaultFactoryABI from "../abis/VaultFactoryABI.json"
import VaultABI from "../abis/VaultABI.json"
import { Vault } from "../types"
import { zeroAddress } from "../addresses"

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

  public getTokenWithdrawTransaction(vault: Vault, recipient: string, tokenAddress: string, amount: string) {
    const vaultInterface = new ethers.utils.Interface(VaultABI)

    const callData = tokenAddress === zeroAddress
      ? vaultInterface.encodeFunctionData("withdrawNative", [
        recipient,
        amount
      ])
      : vaultInterface.encodeFunctionData("withdrawERC20", [
        tokenAddress,
        recipient,
        amount
      ])

    return {
      form: this.parent._accountAddress,
      to: vault.address,
      data: callData
    }
  }

  public deployVault(chainId: number, version: number, key?: number) {
    const exec = async (overrideIndex = 0) => {
      const factoryAddress = this.parent._factoryAddresses.get(chainId)

      if (!factoryAddress) throw new Error("Factory address not found for specified chain")

      const contract = new ethers.Contract(factoryAddress, VaultFactoryABI, this.parent._options.provider)

      const vaults = this.getVaults() ?? []

      const nextIndex = key !== undefined ? key : vaults.length + 1 + overrideIndex
      const predictedAddress = await contract.predictDeterministicVaultAddress(this.parent._accountAddress, nextIndex)

      const estimate = await this.canEstimateVaultCreation(version, chainId, nextIndex)

      if (estimate) {
        const deployTx = await contract.deploy(version, nextIndex)

        const receipt = await deployTx.wait()

        const vaultId = receipt.events[1].args[1]

        if (!vaultId) return false
        await this.parent.backend.linkVault(chainId, this.parent._accountAddress, vaultId, this.parent.authentication._apiKeyPair?.accessToken ?? "")
      } else {
        if (!vaults.find(v => v.address.toLowerCase() === predictedAddress)) {
          await this.parent.backend.linkVault(chainId, this.parent._accountAddress, predictedAddress, this.parent.authentication._apiKeyPair?.accessToken ?? "")
        } else {
          await exec(overrideIndex + 1)
        }
      }

      return true
    }
  }

  private async canEstimateVaultCreation(version: number, chainId: number, id: number) {
    const factoryAddress = this.parent._factoryAddresses.get(chainId)

    if (!factoryAddress) throw new Error("Factory address not found for specified chain")

    const contract = new ethers.Contract(factoryAddress, VaultFactoryABI, this.parent._options.provider)

    const isCanBeEstimated = () => {
      return new Promise<boolean>(resolve => {
        contract.estimateGas.deploy(version, id)
          .then(() => resolve(true))
          .catch(() => resolve(false))
      }).catch(() => false)
    }

    return isCanBeEstimated()
  }
}
