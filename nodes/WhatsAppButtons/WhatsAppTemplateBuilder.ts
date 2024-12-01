import { ButtonArray, SectionArray } from './WhatsAppButtons.node'

type ReplyButton = {
  id: string;
  title: string;
};

export type Row = {
  id: string;
  title: string;
  description: string;
};

export type Section = {
  title: string;
  rows: Row[];
};

type Button = {
  type: "reply";
  reply: ReplyButton;
};

type Header = {
  type: "text" | "image";
  text?: string;
  image?: {
    link: string;
  };
};

type Footer = {
  text: string;
};

type Action = {
  button: string;
  sections: Section[];
};

type InteractiveList = {
  type: "list";
  header?: Header;
  body: {
    text: string;
  };
  footer?: Footer;
  action: Action;
};

type InteractiveButton = {
  type: "button";
  body: {
    text: string;
  };
  action: {
    buttons: Button[];
  },
  footer?: Footer
  header?: Header
};

type InteractiveMessage = {
  type: "interactive";
  interactive: InteractiveList | InteractiveButton;
};

type TemplateComponent = {
  type: "header" | "body" | "footer" | "buttons" | "text";
  format?: string;
  text?: string;
  example?: any;
  buttons?: Button[];
  image?: {
    link: string;
  };
  sections?: Section[];
  parameters?: Array<any | undefined>;
};

type WhatsAppMessage = {
  messaging_product: string;
  recipient_type?: "individual";
  type?: string;
  to?: string;
  from?: string;
  template?: {
    name: string;
    language: {
      code: string;
    };
    components?: TemplateComponent[];
  };
  components?: TemplateComponent[];
  interactive?: InteractiveMessage["interactive"];
  text?: { body: string };
};

export const enum WhatsAppComponentButtonType {
  reply = "reply",
  url = "url",
  phone_number = "phone_number",
  quick_reply = 'quick_reply',
  copy_code = 'copy_code'
}

export const enum WhatsAppHeaderComponentType {
  none = 'none',
  text = 'text',
  image = 'image',
  video = 'video',
  document = 'document',
  location = 'location',
}

export interface TemplateData {
  header?: {
    type: WhatsAppHeaderComponentType
    url?: string
    parameters?: string[]
  },
  body: {
    parameters?: string[]
  },
  buttons?: {
    type: WhatsAppComponentButtonType,
    text: string
  }[]
}

export interface InteractiveButtonData {
  body: {
    text: string
  }
  buttons?: ButtonArray
}

export interface InteractiveListData {
  title: string
  header?: {
    type: WhatsAppHeaderComponentType
    url?: string
    parameters?: string[]
  },
  body: {
    text: string
  }
  footer?: string
  sections?: SectionArray
}

export class WhatsAppTemplateBuilder {
  private readonly body: WhatsAppMessage;

  constructor() {
    this.body = {
      messaging_product: "whatsapp",
      components: []
    };
  }

  setRecipient(to: string): WhatsAppTemplateBuilder {
    this.body.recipient_type = "individual";
    this.body.to = to;
    return this;
  }

  setSender(from: string): WhatsAppTemplateBuilder {
    this.body.from = from;
    return this;
  }

  setPlainMessage(message: string): WhatsAppTemplateBuilder {
    this.body.type = "text";
    this.body.text = {
      body: message
    };
    return this;
  }

  setTemplateName(name: string, languageCode: string): WhatsAppTemplateBuilder {
    this.body.type = "template";
    this.body.template = {
      name: name,
      language: {
        code: languageCode
      },
      components: []
    };
    return this;
  }

  // Add a text component to the body
  addTemplateBodyParameter(): WhatsAppTemplateBuilder {
    this.body.template!.components!.push({
      type: "body",
      parameters: []
    });
    return this;
  }

  addTemplateBodyTextParameter(text: string): WhatsAppTemplateBuilder {
    this.body
      .template!.components!.find((component) => component.type === "body")
      ?.parameters?.push({
      type: "text",
      text: text
    });
    return this;
  }

  // Add a text component to the header
  addTemplateHeaderParameter(): WhatsAppTemplateBuilder {
    this.body.template!.components!.push({
      type: "header",
      parameters: []
    });
    return this;
  }

  addTemplateHeaderImageParameter(imageUrl: string): WhatsAppTemplateBuilder {
    this.body
      .template!.components!.find((component) => component.type === "header")
      ?.parameters?.push({
      type: "image",
      image: {
        link: imageUrl
      }
    });
    return this;
  }

  addTemplateFooter(text: string): WhatsAppTemplateBuilder {
    this.body.components!.push({
      type: "footer",
      text: text
    });
    return this;
  }

  addInteractiveFooter(text: string): WhatsAppTemplateBuilder {
    if (text === '') {
      return this
    }

    this.body.interactive!.footer = {
      text: text
    };
    return this;
  }

  addInteractiveHeaderText(text: string): WhatsAppTemplateBuilder {
    this.body.interactive!.header = {
      type: 'text',
      text: text
    };
    return this;
  }

  addInteractiveHeaderImage(link: string): WhatsAppTemplateBuilder {
    if (link === '') {
      return this
    }

    this.body.interactive!.header = {
      type: 'image',
      image: {
        link: link
      }
    };
    return this;
  }

  addButtonPhoneNumber(
    text: string,
    phoneNumber: string
  ): WhatsAppTemplateBuilder {
    this.body.components!.push({
      type: "buttons",
      buttons: [
        {
          type: "reply",
          reply: {
            id: phoneNumber,
            title: text
          }
        }
      ]
    });
    return this;
  }

  addButtonURL(
    text: string,
    url: string,
    exampleValue: string | null = null
  ): WhatsAppTemplateBuilder {
    const button: Button = {
      type: "reply",
      reply: {
        id: url,
        title: text
      }
    };

    if (exampleValue) {
      button.reply.title = exampleValue;
    }

    this.body.components!.push({
      type: "buttons",
      buttons: [ button ]
    });
    return this;
  }

  addQuickReplyButton(text: string): WhatsAppTemplateBuilder {
    this.body.components!.push({
      type: "buttons",
      buttons: [
        {
          type: "reply",
          reply: {
            id: text,
            title: text
          }
        }
      ]
    });
    return this;
  }

  // Interactive - Button
  addInteractiveButton(
    bodyText: string,
    buttons: ReplyButton[]
  ): WhatsAppTemplateBuilder {
    this.body.type = "interactive";
    this.body.interactive = {
      type: "button",
      body: {text: bodyText},
      action: {
        buttons: buttons.map((button) => ({
          type: "reply",
          reply: {
            id: button.id,
            title: button.title
          }
        }))
      }
    };
    return this;
  }

  // Interactive - List (header can be text or image)
  addInteractiveList(
    bodyText: string,
    buttonText: string,
    sections: Section[],
  ): WhatsAppTemplateBuilder {
    this.body.type = "interactive";
    this.body.interactive = {
      type: "list",
      body: {
        text: bodyText
      },
      action: {
        button: buttonText,
        sections: sections.map((section) => ({
          title: section.title,
          rows: section.rows.map((row) => ({
            id: row.id,
            title: row.title,
            description: row.description
          }))
        }))
      }
    };

    return this;
  }

  build(): WhatsAppMessage {
    return this.body;
  }
}
