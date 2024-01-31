import { BuilderOptions, CallData, Ditto, DittoInternal } from "../types"
import BigNumber from "bignumber.js"
import formatSeconds from "../utils/format-seconds"
import { ethers } from "ethers"
import VaultABI from "../abis/VaultABI.json"

export default async function scheduleTriggerBuilder(
  buildOptions: BuilderOptions,
  options: DittoInternal.TriggerOptions[Ditto.Triggers.Schedule]
): Promise<{ callData: Set<CallData>, value: BigNumber }> {
  const callDataArray = new Set<CallData>();

  const repeatSeconds = options.repeatTimes && options.repeatTimes > 1
    ? formatSeconds(options.cycle.frequency, options.cycle.scale)
    : 60

  const vaultInterface = new ethers.utils.Interface(VaultABI)

  const initData = vaultInterface.encodeFunctionData("timeCheckerInitialize", [
    options.startAtTimestamp - repeatSeconds,
    repeatSeconds,
    ethers.utils.randomBytes(32)
  ]).slice(0, -64)

  const viewData = vaultInterface.getSighash("checkTimeView")

  const callData = vaultInterface.getSighash("checkTime")

  callDataArray.add({
    callData,
    initData,
    viewData,
    to: buildOptions.vaultAddress,
  })

  return {
    callData: callDataArray,
    value: new BigNumber(0)
  }
}
