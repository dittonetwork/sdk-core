import { BuilderOptions, CallData, Ditto, DittoInternal } from "../types"
import BigNumber from "bignumber.js"
import { ethers } from "ethers"
import VaultABI from "../abis/VaultABI.json"
import DittoOracleABI from "../abis/DittoOracleABI.json"
import computeUniswapPoolAddress from "../utils/compute-uniswap-pool-address"
import { dittoOracleAddresses, uniswapPoolFactoryAddresses, usdtAddresses, zeroAddress } from "../addresses"

export default async function priceTriggerBuilder(
  buildOptions: BuilderOptions,
  options: DittoInternal.TriggerOptions[Ditto.Triggers.Price]
): Promise<{ callData: Set<CallData>, value: BigNumber }> {
  const callDataArray = new Set<CallData>()
  const vaultInterface = new ethers.utils.Interface(VaultABI)

  const baseToken = options.baseTokenAddress ?? usdtAddresses.get(buildOptions.chainId)

  if (!baseToken) throw new Error("No base token found")

  const { poolAddress } = computeUniswapPoolAddress(buildOptions.chainId, options.tokenAddress, baseToken, options.uniswapPoolFeeTier)

  if (poolAddress === zeroAddress) throw new Error("Uniswap pool not found for price-based trigger")

  const isBaseFirstToken = parseInt(baseToken) > parseInt(options.tokenAddress)

  let targetRate = ""

  if (isBaseFirstToken) {
    targetRate = options.triggerAtPrice.toString()
  } else {

    const oracleAddress = dittoOracleAddresses.get(buildOptions.chainId)

    if (!oracleAddress) throw new Error("No ditto oracle address found")

    const uniswapFactoryAddress = uniswapPoolFactoryAddresses.get(buildOptions.chainId)

    if (!uniswapFactoryAddress) throw new Error("No uniswap pool factory address found")

    const oracleContract = new ethers.Contract(oracleAddress, DittoOracleABI, buildOptions.provider)

    const _targetRate = (await oracleContract.consult(
      baseToken,
      options.triggerAtPrice,
      options.tokenAddress,
      options.uniswapPoolFeeTier,
      uniswapFactoryAddress
    ))?.toString()

    if (!_targetRate) throw new Error("Target rate not calculated for price-based trigger")

    const rateBN = new BigNumber(_targetRate)
    const priceBN = new BigNumber(options.triggerAtPrice)

    targetRate = priceBN.gte(1)
      ? rateBN.div(priceBN).toFixed(0)
      : rateBN.multipliedBy(new BigNumber(1).div(priceBN)).toFixed(0)
  }

  const gtSigHash = vaultInterface.getSighash("uniswapCheckGTTargetRate")
  const ltSigHash = vaultInterface.getSighash("uniswapCheckLTTargetRate")



  const direction = !options.priceMustBeHigherThan
  const sigHash = isBaseFirstToken
    ? direction ? ltSigHash : gtSigHash
    : !direction ? gtSigHash : ltSigHash

  const initData = vaultInterface.encodeFunctionData("priceCheckerUniswapInitialize", [
    poolAddress,
    targetRate,
    ethers.utils.randomBytes(32)
  ]).slice(0, -64)

  callDataArray.add({
    to: buildOptions.vaultAddress,
    initData,
    callData: sigHash,
    viewData: sigHash
  })

  return {
    callData: callDataArray,
    value: new BigNumber(0)
  }
}
