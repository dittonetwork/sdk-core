import { BuilderOptions, Ditto, DittoInternal } from "../types"
import BigNumber from "bignumber.js"
import { wrappedTokenAddresses, zeroAddress } from "../addresses"
import { ethers } from "ethers"
import VaultABI from "../abis/VaultABI.json"
import Erc20TokenABI from "../abis/Erc20TokenABI.json"
import { AlphaRouter, SwapType } from "@uniswap/smart-order-router"
import { CurrencyAmount, Percent, Token, TradeType } from "@uniswap/sdk-core"
import parseUniswapRouterCallData from "../utils/parse-uniswap-router-call-data"

export default async function uniswapSwapBuilder(
  buildOptions: BuilderOptions,
  options: DittoInternal.ActionOptions[Ditto.Actions.SwapWithUniswap]
) {
  const callData = new Set<{ to: string, callData: string }>()
  let value = new BigNumber(0)

  if (options.fromToken === zeroAddress) value = new BigNumber(options.fromAmount)

  const vaultInterface = new ethers.utils.Interface(VaultABI)

  if (value.gt(0)) {
    callData.add({
      to: buildOptions.vaultAddress,
      callData: vaultInterface.encodeFunctionData("wrapNativeFromVaultBalance", [
        value.toFixed(0)
      ])
    })
  } else if (buildOptions.vaultAddress.toLowerCase() !== buildOptions.recipient.toLowerCase()) {
    const tokenInterface = new ethers.utils.Interface(Erc20TokenABI)

    const transferCallData = tokenInterface.encodeFunctionData("transfer", [
      buildOptions.recipient,
      options.fromAmount
    ])

    callData.add({
      to: options.fromToken,
      callData: transferCallData
    })
  }

  const wrappedAddress = wrappedTokenAddresses.get(buildOptions.chainId)

  if (!wrappedAddress) throw new Error("Unsupported network")

  if (value.gt(0) && options.toToken.toLowerCase() === wrappedAddress.toLowerCase()) {
    return {
      callData,
      value
    }
  }

  if (options.toToken === zeroAddress && options.fromToken.toLowerCase() === wrappedAddress.toLowerCase()) {
    vaultInterface.encodeFunctionData("unwrapNative", [options.fromAmount])

    return {
      callData,
      value
    }
  }

  const uniswapRouterData = await createUniswapRoute(
    options.fromAmount,
    options.fromToken,
    options.toToken,
    buildOptions.chainId,
    buildOptions.provider,
    buildOptions.recipient,
    options.slippagePercent !== undefined ? options.slippagePercent * 100 : undefined
  )

  if (!uniswapRouterData?.tx) throw new Error("Uniswap route not build")

  generateCallDataFromUniswapRoute(
    uniswapRouterData.tx.calldata,
    options.fromToken,
    options.toToken,
    options.slippagePercent ?? 0.5,
    vaultInterface
  ).forEach(item => callData.add({
    to: buildOptions.vaultAddress,
    callData: item
  }))

  return {
    callData,
    value
  }
}

async function createUniswapRoute(
  amountIn: string,
  fromTokenAddress: string,
  toTokenAddress: string,
  chainId: number,
  provider: ethers.providers.JsonRpcProvider,
  recipient: string,
  slippage = 50
) {
  const router = new AlphaRouter({
    chainId,
    provider
  })

  const fromToken = new Token(chainId, fromTokenAddress, 0)
  const toToken = new Token(chainId, toTokenAddress, 0)

  const route = await router.route(
    CurrencyAmount.fromRawAmount(fromToken, amountIn),
    toToken,
    TradeType.EXACT_INPUT,
    {
      recipient: recipient,
      slippageTolerance: new Percent(slippage, 10_000),
      deadline: Math.floor(Date.now() / 1000 + 1800),
      type: SwapType.SWAP_ROUTER_02
    },
    {
      maxSwapsPerPath: 4,
      v3PoolSelection: {
        topN: 1,
        topNDirectSwaps: 1,
        topNTokenInOut: 1,
        topNSecondHop: 1,
        topNWithEachBaseToken: 1,
        topNWithBaseToken: 1,
      }
    }
  )

  return {
    tx: route?.methodParameters,
    data: route,
  }
}

function generateCallDataFromUniswapRoute(
  initialCallData: string,
  fromAddress: string | undefined,
  toAddress: string | undefined,
  slippage: string | number,
  vaultInterface: ethers.utils.Interface
) {
  const parsedDataArray = parseUniswapRouterCallData(initialCallData)

  const callData = new Set<string>()

  parsedDataArray.forEach((parsedDataPiece, index) => {
    if (!fromAddress) return

    callData.add(
      vaultInterface.encodeFunctionData("uniswapSwapExactInput", [
        parsedDataPiece.tokens,
        parsedDataPiece.poolFees,
        parsedDataPiece.amountIn,
        false,
        index === parsedDataArray.length - 1 && toAddress === zeroAddress,
        new BigNumber(slippage).multipliedBy(1e16).toFixed(0)
      ])
    )
  })

  return callData
}
