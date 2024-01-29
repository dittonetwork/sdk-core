import { AutomationInitOptions, Ditto, DittoInternal } from "../types"

export default class Automation {
  private triggerConfiguration: object = {}
  private actionConfigurations = new Map<string, object>()

  constructor(public readonly options: AutomationInitOptions) {
  }

  public configureTrigger<T extends Ditto.Triggers>(options: DittoInternal.TriggerOptions[T]) {
    this.triggerConfiguration = options

    return this
  }

  public configureAction<T extends Ditto.Actions>(action: T, options: DittoInternal.ActionOptions[T]) {
    if (!this.options.actions.some(a => a === action)) throw new Error("Invalid action")

    this.actionConfigurations.set(action, options)

    return this
  }

  public getTriggerConfiguration<T extends Ditto.Triggers>() {
    return this.triggerConfiguration as DittoInternal.TriggerOptions[T]
  }

  public getActionConfiguration<T extends Ditto.Actions>(action: T) {
    return this.actionConfigurations.get(action) as DittoInternal.ActionOptions[T]
  }

  public getAllActionConfigurations() {
    return this.actionConfigurations
  }
}
