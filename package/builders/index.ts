import { BuilderOptions, CallData, Ditto } from "../types"
import uniswapSwapBuilder from "./uniswap-swap-builder"
import BigNumber from "bignumber.js"
import scheduleTriggerBuilder from "./schedule-trigger-builder"
import priceTriggerBuilder from "./price-trigger-builder"

type BuilderFunction = (buildOptions: BuilderOptions, options: object) => Promise<{ callData: Set<CallData>, value: BigNumber }>

const builders = {
  [Ditto.Actions.SwapWithUniswap]: uniswapSwapBuilder,
  [Ditto.Triggers.Schedule]: scheduleTriggerBuilder,
  [Ditto.Triggers.Price]: priceTriggerBuilder
} as { [key: string]: BuilderFunction }

export default builders
