import BigNumber from "bignumber.js"

export default function safeReduceArray(arr: number[] | BigNumber[]): BigNumber {
  if (arr.length === 0) return new BigNumber(0)
  if (arr.length === 1) return new BigNumber(arr[0])

  return arr.map(v => new BigNumber(v)).reduce((a, b) => a.plus(b))
}
