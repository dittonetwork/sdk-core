import { Ditto } from "../types"
import TimeScale = Ditto.TimeScale
import BigNumber from "bignumber.js"

export default function formatSeconds(value: number, frequency: TimeScale) {
  const _value = new BigNumber(value)

  if (_value.isNaN() || _value.lte(0)) return 0

  let multiplier

  switch (frequency) {
    case TimeScale.Minutes:
      multiplier = 60
      break
    case TimeScale.Hours:
      multiplier = 3600
      break
    case TimeScale.Days:
      multiplier = 86400
      break
    case TimeScale.Weeks:
      multiplier = 604800
      break
    case TimeScale.Months:
      multiplier = 2629800
      break
    default:
      multiplier = 0
      break
  }

  return _value.multipliedBy(multiplier).toNumber()
}
