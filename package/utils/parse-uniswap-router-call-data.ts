type TParsedRouterData = {
  tokens: string[]
  poolFees: any[]
  amountIn: BigInt
}

export default function parseUniswapRouterCallData(callData: string) {
  const single = "04e45aaf" // ExactInputSingle selector
  const multi = "b858183f" // ExactInput selector

  const resultsArray: TParsedRouterData[] = []

  let singleOffset = callData.indexOf(single)
  let multiOffset = callData.indexOf(multi)

  while (singleOffset != -1 || multiOffset != -1) {
    const result: TParsedRouterData = {
      tokens: [],
      poolFees: [],
      amountIn: 0n
    }

    if (singleOffset != -1) {
      singleOffset += 32
      result.tokens.push(
        "0x" + callData.slice(singleOffset, singleOffset + 40)
      )

      singleOffset += 64
      result.tokens.push(
        "0x" + callData.slice(singleOffset, singleOffset + 40)
      )

      singleOffset += 98
      result.poolFees.push(
        +("0x" + callData.slice(singleOffset, singleOffset + 6))
      )

      singleOffset += 70
      result.amountIn = BigInt(
        "0x" + callData.slice(singleOffset, singleOffset + 64)
      )

      callData = callData.slice(singleOffset + 64)
    } else if (multiOffset != -1) {
      multiOffset += 200
      result.amountIn = BigInt(
        "0x" + callData.slice(multiOffset, multiOffset + 64)
      )

      multiOffset += 128
      let length =
        +("0x" + callData.slice(multiOffset, multiOffset + 64)) * 2

      multiOffset += 64

      result.tokens.push(
        "0x" + callData.slice(multiOffset, multiOffset + 40)
      )

      multiOffset += 40
      length -= 40

      while (length > 0) {
        result.poolFees.push(
          +("0x" + callData.slice(multiOffset, multiOffset + 6))
        )

        multiOffset += 6
        length -= 6

        result.tokens.push(
          "0x" + callData.slice(multiOffset, multiOffset + 40)
        )

        multiOffset += 40
        length -= 40
      }

      callData = callData.slice(multiOffset)
    }

    resultsArray.push(result)

    singleOffset = callData.indexOf(single)
    multiOffset = callData.indexOf(multi)
  }

  return resultsArray
}