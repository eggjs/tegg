
@InnerObjectProto()
export class Other {
}

@InnerObjectProto()
export class CrosscutAdviceFactory {
  @Inject()
  other: Other;
}

@LoadUnitLifecycle()
export class ControllerPlugin {
  @Inject()
  crosscutAdviceFactory: any;
}
