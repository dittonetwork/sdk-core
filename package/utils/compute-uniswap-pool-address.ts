import { Token, V3_CORE_FACTORY_ADDRESSES } from "@uniswap/sdk-core"
import { computePoolAddress, FeeAmount } from "@uniswap/v3-sdk"

export default function computeUniswapPoolAddress(
  chainId: number,
  token0: string,
  token1: string,
  feeAmount: FeeAmount
) {
  const tokenA = new Token(
    chainId,
    token0,
    0
  )

  const tokenB = new Token(
    chainId,
    token1,
    0
  )

  return {
    poolAddress: computePoolAddress({
      factoryAddress: V3_CORE_FACTORY_ADDRESSES[chainId],
      tokenA: tokenA.sortsBefore(tokenB) ? tokenB : tokenA,
      tokenB: tokenA.sortsBefore(tokenB) ? tokenA : tokenB,
      fee: feeAmount
    }),
    tokenA,
    tokenB
  }
}
