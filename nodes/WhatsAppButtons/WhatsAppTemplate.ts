export enum WhatsAppComponentType {
  header = "HEADER",
  body = "BODY",
  footer = "FOOTER",
  buttons = "BUTTONS",
}

export class WhatsAppTemplateParameter {
  constructor(
    public index: number,
    public text: string,
  ) {}
}

export class WhatsAppButton {
  constructor(
    readonly type: string,
    readonly text: string,
    readonly url: string,
  ) {}
}

export class WhatsAppComponent {
  constructor(
    readonly type: WhatsAppComponentType,
    readonly text: string,
    readonly buttons?: [WhatsAppButton],
  ) {}
}

export class WhatsAppTemplate {
  constructor(
    readonly name: string,
    readonly components: WhatsAppComponent[],
    readonly language: string,
    readonly status: string,
    readonly category: string,
    readonly id: string,
    public parameters: WhatsAppTemplateParameter[] = [],
  ) {}
}
