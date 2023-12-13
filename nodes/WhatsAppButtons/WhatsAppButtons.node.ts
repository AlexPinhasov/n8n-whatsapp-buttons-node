import type {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  ICredentialDataDecryptedObject,
} from "n8n-workflow";
import axios from "axios";

export type FieldsUiValues = Array<{
  buttonTitle: string;
}>;

export class WhatsAppButtons implements INodeType {
  description: INodeTypeDescription = {
    displayName: "WhatsAppButtons",
    name: 'whatsAppButtons',
    icon: "file:whatsappbuttons.svg",
    group: ["transform"],
    version: 1,
    subtitle: "0.1.4",
    description: "Send Message With Buttons",
    defaults: {
      name: "WhatsAppButtons",
    },
    inputs: ["main"],
    outputs: ["main"],
    credentials: [
      {
        name: "whatsAppButtonsApi",
        required: true,
      },
    ],
    properties: [
      {
        displayName: "Action",
        name: "action",
        type: "options",
        options: [
          {
            name: "Interactive",
            value: "interactive",
          },
        ],
        default: "interactive",
      },
      {
        displayName: "Message",
        name: "message",
        type: "string",
        default: "",
        required: true,
        description: "Enter the message to be sent",
      },
      {
        displayName: "Recipient Phone Number",
        name: "phoneNumber",
        type: "string",
        default: "",
        description: "The number to send to",
      },
      {
        displayName: "Header Type",
        name: "headerAction",
        type: "options",
        options: [
          {
            name: "None",
            value: "none",
          },
          {
            name: "Image",
            value: "image",
          },
        ],
        default: "none",
      },
      {
        displayName: "Header Image URL",
        name: "headerImageURL",
        type: "string",
        required: true,
        default: "",
        displayOptions: {
          show: {
            headerAction: ["image"],
          },
        },
        description: 'Enter the image URL',
      },
      {
        displayName: "Footer",
        name: "footer",
        type: "string",
        default: "",
        description: "Will be presented at the bottom of the message",
      },
      {
        displayName: "Query Parameters",
        name: "fieldsUi",
        placeholder: "Add Buttons",
        type: "fixedCollection",
        description:
          "Field must be defined in the collection, otherwise it will be ignored. If field defined in the collection is not set here, it will be set to null.",
        typeOptions: {
          multipleValueButtonText: "Add Buttons To Send",
          multipleValues: true,
        },
        default: {},
        options: [
          {
            displayName: "Field",
            name: "fieldValues",
            values: [
              {
                displayName: "Button Title",
                name: "buttonTitle",
                type: "string",
                default: "",
              },
            ],
          },
        ],
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const baseURL = "https://graph.facebook.com/v17.0";
    const action = this.getNodeParameter("action", 0) as string;
    const message = this.getNodeParameter("message", 0) as string;
    const phoneNumber = this.getNodeParameter("phoneNumber", 0) as string;
    const headerAction = this.getNodeParameter("headerAction", 0) as string;
    const footer = this.getNodeParameter("footer", 0, "") as string;
    const headerImageURL = this.getNodeParameter(
      "headerImageURL",
      0,
      ""
    ) as string;

    const credentials = await this.getCredentials("whatsAppButtonsApi");
    const queryParams = this.getNodeParameter(
      "fieldsUi.fieldValues",
      0,
      ""
    ) as FieldsUiValues;

    let responseData: any;
    let request: any;

    try {
      switch (action) {
        case "interactive":
          request = handleQuery(
            `${baseURL}/${credentials.phoneNumberID}/messages`,
            message,
            phoneNumber,
            headerAction,
            headerImageURL,
            footer,
            queryParams,
            credentials
          );
          responseData = (await request).data;
          break;
      }

      const outputData = [{ json: responseData }];
      return this.prepareOutputData(outputData);
    } catch (error) {
      console.error(
        `Error making ${action} request to WhatsAppButtons API:`,
        error.message
      );
      throw error;
    }

    function handleQuery(
      url: string,
      message: string,
      phoneNumber: string,
      headerAction: string,
      headerImageURL: string,
      footer: string,
      queryParameters: FieldsUiValues,
      credentials: ICredentialDataDecryptedObject
    ) {
      const jsonPayload: { [key: string]: any } = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phoneNumber,
        type: "interactive",
        interactive: {
          type: "button",
          body: {
            text: message,
          },
          action: {

          },
        },
      };

      if (headerAction == "image") {
        jsonPayload.interactive.header = {
          type: "image",
          image: {
            link: headerImageURL,
          },
        };
      }

      if (footer.length > 0) {
        jsonPayload.interactive.footer = {
          text: footer,
        };
      }

      if (queryParameters.length > 0) {
        const parametersArray = queryParameters.map((x) => {
          return x.buttonTitle;
        });
        let buttons: { [key: string]: any }[] = [];
        parametersArray.forEach((button, index) => {
          buttons.push({
            type: "reply",
            reply: {
              id: `button_${index}`,
              title: button,
            },
          });
        });
        jsonPayload.interactive.action.buttons = buttons;
      }
      console.log(jsonPayload)
      return axios.post(url, JSON.stringify(jsonPayload), {
        headers: { Authorization: `Bearer ${credentials.apiKey}` },
      });
    }
  }
}
