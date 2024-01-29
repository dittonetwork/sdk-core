import { BuilderOptions, Ditto } from "../types"
import uniswapSwapBuilder from "./uniswap-swap-builder"
import BigNumber from "bignumber.js"

type BuilderFunction = (buildOptions: BuilderOptions, options: object) => Promise<{ callData: Set<{ to: string, callData: string }>, value: BigNumber }>

const builders = {
  [Ditto.Actions.SwapWithUniswap]: uniswapSwapBuilder
} as { [key: string]: BuilderFunction }

export default builders
