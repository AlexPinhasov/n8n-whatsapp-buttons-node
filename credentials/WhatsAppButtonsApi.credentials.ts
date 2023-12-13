import { ICredentialType, INodeProperties } from "n8n-workflow";

export class WhatsAppButtonsApi implements ICredentialType {
  name = "whatsAppButtonsApi";
  displayName = "WhatsAppButtons API";
  icon = "file:whatsappbuttons.svg";
  documentationUrl =
    "https://docs.n8n.io/integrations/creating-nodes/build/declarative-style-node/";
  properties: INodeProperties[] = [
    {
      displayName: "API Key",
      name: "apiKey",
      type: "string",
      typeOptions: { password: true },
      default: "",
    },
    {
      displayName: "Phone Number ID",
      name: "phoneNumberID",
      type: "string",
      typeOptions: { password: false },
      default: "",
    },
  ];
}
