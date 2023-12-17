import type {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  ICredentialDataDecryptedObject,
} from "n8n-workflow";
import axios from "axios";

export type SectionArray = Array<{
  sectionTitle: string;
  buttonInSection: MidButtonArray;
}>;

export type MidButtonArray = {
  buttons: ButtonArray;
};

export type ButtonArray = Array<{
  buttonTitle: string;
  buttonDescription: string;
}>;

export class WhatsAppButtons implements INodeType {
  description: INodeTypeDescription = {
    displayName: "WhatsApp Buttons",
    name: 'whatsAppButtons',
    icon: "file:whatsappbuttons.svg",
    group: ["transform"],
    version: 1,
    subtitle: "0.1.4",
    description: "Send Message With Buttons",
    defaults: {
      name: "WhatsApp Buttons",
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
            name: "In-Message Buttons",
            value: "interactive",
          },
          {
            name: "List Buttons",
            value: "listButtons",
          },
        ],
        default: "interactive",
      },
      {
        displayName: "List Title",
        name: "listTitle",
        type: "string",
        default: "",
        required: true,
        displayOptions: {
          show: {
            action: ["listButtons"],
          },
        },
        description: "Enter the title of the list button",
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
        displayName: "Max 3 Buttons",
        name: "plainButton",
        placeholder: "Add Button",
        type: "fixedCollection",
        description:
            "Field must be defined in the collection, otherwise it will be ignored. If field defined in the collection is not set here, it will be set to null.",
        typeOptions: {
          multipleValues: true,
          maxValue: 3,
        },
        displayOptions: {
          show: {
            action: ["interactive"],
          },
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
      {
        displayName: "Button List",
        name: "buttonWithDescription",
        placeholder: "Add Section",
        type: "fixedCollection",
        description:
            "Field must be defined in the collection, otherwise it will be ignored. If field defined in the collection is not set here, it will be set to null.",
        typeOptions: {
          multipleValues: true,
        },
        displayOptions: {
          show: {
            action: ["listButtons"],
          },
        },
        default: {},
        options: [
          {
            name: "section",
            displayName: "Section",
            default: {},
            type: "fixedCollection",
            placeholder: "Add Button",
            description: "",
            typeOptions: {
              multipleValues: true,
            },
            values: [
              {
                displayName: "Section Title",
                name: "sectionTitle",
                type: "string",
                default: "",
              },
              {
                displayName: "Buttons In Section",
                name: "buttonInSection",
                placeholder: "Add Button",
                type: "fixedCollection",
                description: "",
                typeOptions: {
                  multipleValues: true,
                },
                default: {},
                options: [
                  {
                    name: "buttons",
                    displayName: "Button",
                    default: {},
                    type: "fixedCollection",
                    placeholder: "Add Button",
                    description: "",
                    values: [
                      {
                        displayName: "Title",
                        name: "buttonTitle",
                        type: "string",
                        default: "",
                      },
                      {
                        displayName: "Description",
                        name: "buttonDescription",
                        type: "string",
                        default: "",
                      },
                    ],
                  },
                ],
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


    let responseData: any;
    let request: any;

    try {
      switch (action) {
        case "interactive":
          console.log("interactive tapped")
          const buttonFields = this.getNodeParameter(
              "plainButton.fieldValues",
              0,
              ""
          ) as ButtonArray;

          request = handleInteractiveButtonsRequest(
              `${baseURL}/${credentials.phoneNumberID}/messages`,
              message,
              phoneNumber,
              headerAction,
              headerImageURL,
              footer,
              buttonFields,
              credentials
          );
          responseData = (await request).data;
          break;

        case "listButtons":
          console.log("listButtons tapped")
          const buttonFieldsWithDescription = this.getNodeParameter(
              "buttonWithDescription.section",
              0,
              ""
          ) as SectionArray;
          const listTitle = this.getNodeParameter("listTitle", 0) as string;

          request = handleListButtonsRequest(
              `${baseURL}/${credentials.phoneNumberID}/messages`,
              message,
              phoneNumber,
              headerAction,
              headerImageURL,
              footer,
              listTitle,
              buttonFieldsWithDescription,
              credentials
          );
          responseData = (await request).data;
          break;
      }

      const outputData = [{json: responseData}];
      return this.prepareOutputData(outputData);
    } catch (error) {
      console.error(
          `Error making ${action} request to WhatsAppButtons API:`,
          error.message
      );
      throw error;
    }

    function buildBaseJSON(phoneNumber: string, message: string, headerImageURL: string, footer: string): { [key: string]: any } {
      const json: { [key: string]: any } = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: "",
        type: "interactive",
        interactive: {
          type: "",
          body: {
            text: "",
          },
          action: {},
        },
      };
      json.to = phoneNumber;
      json.interactive.body.text = message

      if (headerAction === "image") {
        json.interactive.header = {
          type: "image",
          image: {
            link: headerImageURL,
          },
        };
      }

      if (footer.length > 0) {
        json.interactive.footer = {
          text: footer,
        };
      }

      return json
    }

    function handleInteractiveButtonsRequest(
        url: string,
        message: string,
        phoneNumber: string,
        headerAction: string,
        headerImageURL: string,
        footer: string,
        queryParameters: ButtonArray,
        credentials: ICredentialDataDecryptedObject
    ) {
      const json: { [key: string]: any } = buildBaseJSON(phoneNumber, message, headerImageURL, footer)
      json.interactive.type = 'button'

      if (queryParameters.length > 0) {
        let buttons: { [key: string]: any }[] = [];
        queryParameters.forEach((button, index) => {
          buttons.push({
            type: "reply",
            reply: {
              id: `button_${index.toString()}`,
              title: button.buttonTitle,
            },
          });
        });
        json.interactive.action.buttons = buttons;
      }
      console.log(JSON.stringify(json))
      return axios.post(url, JSON.stringify(json), {
        headers: {
          Authorization: `Bearer ${credentials.apiKey}`,
          "Content-Type": "application/json"
        },
      });
    }

    function handleListButtonsRequest(
        url: string,
        message: string,
        phoneNumber: string,
        headerAction: string,
        headerImageURL: string,
        footer: string,
        listTitle: string,
        sections: SectionArray,
        credentials: ICredentialDataDecryptedObject
    ) {
      const json: { [key: string]: any } = buildBaseJSON(phoneNumber, message, headerImageURL, footer)
      json.interactive.type = 'list'
      let sectionsDict: { [key: string]: any }[] = [];

      sections.forEach((section) => {
        const buttons = section.buttonInSection.buttons.map((button,index) => {
          return {
            id: `button_${index.toString()}`,
            title: button.buttonTitle,
            description: button.buttonDescription
          }
        })
        sectionsDict.push({
          title: section.sectionTitle,
          rows: buttons
        })
      });

      json.interactive.action = {
        button: listTitle,
        sections: sectionsDict
      }

      console.log(JSON.stringify(json))
      return axios.post(url, JSON.stringify(json), {
        headers: {
          Authorization: `Bearer ${credentials.apiKey}`,
          "Content-Type": "application/json"
        },
      });
    }
  }
}
