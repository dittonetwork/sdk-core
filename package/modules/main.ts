import { AutomationBuildOptions, AutomationInitOptions, Ditto, InitOptions, RootAccountData } from "../types"
import useDittoBackend from "../hooks/use-backend"
import AuthenticationModule from "./authentication"
import Automation from "./automation"
import { vaultFactoryAddresses, zeroAddress } from "../addresses"
import VaultsModule from "./vaults"
import builders from "../builders"
import { ethers } from "ethers"
import VaultABI from "../abis/VaultABI.json"
import VaultFactoryABI from "../abis/VaultFactoryABI.json"
import BigNumber from "bignumber.js"
import safeReduceArray from "../utils/safe-reduce-array"
import Holder = Ditto.Holder
import Triggers = Ditto.Triggers

export class DittoSDK {
  public _accountAddress: string
  public _rootAccountData?: RootAccountData
  public _factoryAddresses: Map<number, string>

  public readonly backend = useDittoBackend("")
  public readonly authentication = new AuthenticationModule(this)
  public readonly vaults = new VaultsModule(this)

  private readonly backendUrl: string

  constructor(public readonly _options: InitOptions & { account: string }) {
    this.backendUrl = _options.backendUrl ?? "https://backend.dittonetwork.io"
    this._accountAddress = _options.account

    this._factoryAddresses = _options.vaultFactoryAddresses ?? vaultFactoryAddresses

    this.backend = useDittoBackend(this.backendUrl)
  }

  public resetAccountAddress(address: string) {
    this._accountAddress = address

    this.authentication._apiKeyPair = undefined
    this._rootAccountData = undefined

    return this
  }

  public createAutomation(options: AutomationInitOptions) {
    return new Automation(options)
  }

  public async buildAutomation(automation: Automation, options: AutomationBuildOptions) {
    const callData = new Set<{ to: string, callData: string }>()

    if (!this._rootAccountData) throw new Error("Account not initialized")

    const vault = options.vault === "automatic" ? this.vaults.getVault(0, options.chainId) : options.vault
    let vaultAddress = vault?.address

    if (!vaultAddress) {
      const factoryAddress = this._factoryAddresses.get(options.chainId)

      if (!factoryAddress) throw new Error("Factory address not found for specified chain")

      const factoryContract = new ethers.Contract(factoryAddress, VaultFactoryABI, this._options.provider)

      vaultAddress = await factoryContract.predictDeterministicVaultAddress(this._accountAddress, 1)

      callData.add({
        to: factoryAddress,
        callData: factoryContract.interface.encodeFunctionData("deploy", [3, 1])
      })
    }

    const actionsCallData = await Promise.all(
      automation.options.actions.map(action => (
        builders[action]({
          chainId: automation.options.chainId,
          provider: this._options.provider,
          accountAddress: this._accountAddress,
          vaultAddress: vaultAddress ?? zeroAddress,
          recipient: (options.transferFrom === Holder.Vault ? vaultAddress : this._accountAddress) ?? zeroAddress
        }, automation.getActionConfiguration(action))
      ))
    )

    const triggerCallData = builders[automation.options.trigger] ? await builders[automation.options.trigger]({
      chainId: automation.options.chainId,
      provider: this._options.provider,
      accountAddress: this._accountAddress,
      vaultAddress: vaultAddress ?? zeroAddress,
      recipient: (options.transferFrom === Holder.Vault ? vaultAddress : this._accountAddress) ?? zeroAddress
    }, automation.getTriggerConfiguration()) : { callData: new Set<any>(), value: new BigNumber(0) }

    const value = safeReduceArray([...actionsCallData.map(a => a.value), triggerCallData.value])
      .toFixed(0)

    const vaultInterface = new ethers.utils.Interface(VaultABI)

    let repeatCount = 1
    // if (automation.options.trigger === Triggers.Schedule) {
    //   repeatCount = automation.getTriggerConfiguration<Triggers.Schedule>().repeatTimes ?? 1
    // }

    const vaultRelativeActionsCallData = actionsCallData.map(a => a.callData)
      .map(a => Array.from(a).filter(i => i.to.toLowerCase() === vaultAddress?.toLowerCase()))
      .flat().map(a => a.callData)

    const vaultRelativeTriggerCallData = Array.from(triggerCallData.callData)
      .filter(i => i.to.toLowerCase() === vaultAddress?.toLowerCase())
      .map(i => i.callData)

    actionsCallData.map(a => a.callData)
      .map(a => Array.from(a).filter(i => i.to.toLowerCase() !== vaultAddress?.toLowerCase()))
      .flat().forEach(i => callData.add(i))

    Array.from(triggerCallData.callData)
      .filter(i => i.to.toLowerCase() !== vaultAddress?.toLowerCase())
      .forEach(i => callData.add(i))

    const encodedAddWorkflowCall = vaultInterface.encodeFunctionData("addWorkflowAndGelatoTask", [
      vaultRelativeTriggerCallData,
      vaultRelativeActionsCallData.map(i => [
        i,
        ethers.utils.toUtf8Bytes(""),
        ethers.utils.toUtf8Bytes("")
      ]),
      vaultAddress,
      repeatCount
    ])

    let encodedMultiCall = vaultInterface.encodeFunctionData("multicall", [[
      encodedAddWorkflowCall
    ]])

    if (automation.options.trigger === Triggers.Instant) {
      encodedMultiCall = vaultInterface.encodeFunctionData("multicall", [
        vaultRelativeActionsCallData
      ])
    }

    return {
      automationDeployValue: value,
      automationDeployCallData: encodedMultiCall,
      accountRelativeCallData: Array.from(callData),
      vaultAddress: vaultAddress ?? zeroAddress
    }
  }

  public async deployAutomation(automation: Automation, options: AutomationBuildOptions) {
    const automationDeployData = await this.buildAutomation(automation, options)

    if (automationDeployData.vaultAddress === zeroAddress) throw new Error("Invalid vault address")

    if (!this._options.signer) throw new Error("No signer found")

    for await (const callData of automationDeployData.accountRelativeCallData) {
      const tx = await this._options.signer?.sendTransaction({
        from: this._accountAddress,
        to: callData.to,
        data: callData.callData
      })

      if (tx) await tx.wait()
    }

    const tx = await this._options.signer?.sendTransaction({
      from: this._accountAddress,
      to: automationDeployData.vaultAddress,
      data: automationDeployData.automationDeployCallData,
      value: automationDeployData.automationDeployValue
    })

    if (!tx) throw new Error("Transaction not sent")

    return tx
  }
}
