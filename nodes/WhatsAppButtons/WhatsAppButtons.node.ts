import type {
  ICredentialDataDecryptedObject,
  ILoadOptionsFunctions,
  INodeExecutionData,
  INodePropertyOptions,
  INodeType,
  INodeTypeDescription
} from "n8n-workflow";
import { IExecuteFunctions, NodeApiError } from "n8n-workflow";
import axios from "axios";
import {
  InteractiveButtonData,
  InteractiveListData,
  Row,
  Section,
  TemplateData,
  WhatsAppHeaderComponentType,
  WhatsAppTemplateBuilder
} from "./WhatsAppTemplateBuilder";
import { WhatsAppComponentType, WhatsAppTemplate } from "./WhatsAppTemplate";

export type ParameterArray = Array<{
  parameterValue: string;
}>;

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

type WhatsAppPhoneNumber = {
  verified_name: string;
  code_verification_status: string;
  display_phone_number: string;
  id: string;
};

const baseURL = "https://graph.facebook.com/v20.0";

export class WhatsAppButtons implements INodeType {
  // @ts-ignore
  description: INodeTypeDescription = {
    displayName: "WhatsApp Buttons",
    name: "whatsAppButtons",
    icon: "file:whatsappbuttons.svg",
    group: [ "transform" ],
    version: 1,
    subtitle: "1.0.1",
    description: "Send Message With Buttons",
    defaults: {
      name: "WhatsApp Buttons"
    },
    inputs: [ "main" ],
    outputs: [ "main" ],
    credentials: [
      {
        name: "whatsAppButtonsApi",
        required: true
      }
    ],
    properties: [
      {
        displayName: "Action",
        name: "action",
        type: "options",
        options: [
          {
            name: "In-Message Buttons",
            value: "interactiveButtons"
          },
          {
            name: "List Buttons",
            value: "interactiveList"
          },
          {
            name: "Template",
            value: "template"
          },
          {
            name: "Message",
            value: "message"
          }
        ],
        default: "interactiveButtons"
      },
      {
        displayName: "List Title",
        name: "listTitle",
        type: "string",
        default: "",
        required: true,
        displayOptions: {
          show: {
            action: [ "interactiveList" ]
          }
        },
        description: "Enter the title of the list button"
      },
      {
        displayName: "Message",
        name: "message",
        type: "string",
        default: "",
        required: true,
        displayOptions: {
          show: {
            action: [ "interactiveButtons", "interactiveList", "message" ]
          }
        },
        description: "Enter the message to be sent"
      },
      {
        /* eslint-disable n8n-nodes-base/node-param-description-wrong-for-dynamic-options */
        /* eslint-disable n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options */
        displayName: "Sender Phone Number (or ID)",
        name: "senderPhoneDynamicOption",
        type: "options",
        required: true,
        default: "",
        description:
          "The ID of the business account's phone number from which the message will be sent from",
        typeOptions: {
          loadOptionsMethod: "getPhoneNumbers"
        }
      },
      {
        /* eslint-disable n8n-nodes-base/node-param-description-wrong-for-dynamic-options */
        displayName: "Templates",
        name: "templates",
        type: "options",
        default: "",
        placeholder: "Select Template To Send",
        description: "Pull and Select a template to send",
        typeOptions: {
          loadOptionsMethod: "getTemplates"
        },
        displayOptions: {
          show: {
            action: [ "template" ]
          }
        }
      },
      {
        displayName: "Recipient Phone Number",
        name: "phoneNumber",
        type: "string",
        default: "",
        description: "The number to send to"
      },
      {
        displayName: "Header Type",
        name: "headerAction",
        type: "options",
        options: [
          {
            name: "None",
            value: "none"
          },
          {
            name: "Image",
            value: "image"
          }
        ],
        default: "none"
      },
      {
        displayName: "Header Image URL",
        name: "headerImageURL",
        type: "string",
        required: true,
        default: "",
        displayOptions: {
          show: {
            headerAction: [ "image" ]
          }
        },
        description: "Enter the image URL"
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
          maxValue: 3
        },
        displayOptions: {
          show: {
            action: [ "interactiveButtons" ]
          }
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
                default: ""
              }
            ]
          }
        ]
      },
      {
        displayName: "Button List",
        name: "buttonWithDescription",
        placeholder: "Add Section",
        type: "fixedCollection",
        description:
          "Field must be defined in the collection, otherwise it will be ignored. If field defined in the collection is not set here, it will be set to null.",
        typeOptions: {
          multipleValues: true
        },
        displayOptions: {
          show: {
            action: [ "interactiveList" ]
          }
        },
        default: {},
        options: [
          {
            displayName: "Section",
            name: "section",
            default: {},
            type: "fixedCollection",
            placeholder: "Add Button",
            typeOptions: {
              multipleValues: true
            },
            values: [
              {
                displayName: "Section Title",
                name: "sectionTitle",
                type: "string",
                default: ""
              },
              {
                displayName: "Buttons In Section",
                name: "buttonInSection",
                placeholder: "Add Button",
                type: "fixedCollection",
                typeOptions: {
                  multipleValues: true
                },
                default: {},
                options: [
                  {
                    displayName: "Button",
                    name: "buttons",
                    default: {},
                    type: "fixedCollection",
                    placeholder: "Add Button",
                    values: [
                      {
                        displayName: "Title",
                        name: "buttonTitle",
                        type: "string",
                        default: ""
                      },
                      {
                        displayName: "Description",
                        name: "buttonDescription",
                        type: "string",
                        default: ""
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        displayName: "Template Parameter List",
        name: "templateParameterList",
        placeholder: "Add Parameter",
        type: "fixedCollection",
        description:
          "Each template has a number of parameters shown as {{1}}, for every parameter add a text to replace it with",
        typeOptions: {
          multipleValues: true
        },
        displayOptions: {
          show: {
            action: [ "template" ]
          }
        },
        default: {},
        options: [
          {
            name: "parameters",
            displayName: "Parameters",
            values: [
              {
                displayName: "Parameter Value",
                name: "parameterValue",
                type: "string",
                default: "",
                description:
                  "Value to replace the template parameter (e.g., {{1}}, {{2}})"
              }
            ]
          }
        ]
      },
      {
        displayName: "Should Use Footer",
        name: "footerToggle",
        type: "boolean",
        default: false,
        description: "Whether to add a footer message"
      },
      {
        displayName: "Footer",
        name: "footer",
        type: "string",
        default: "",
        description: "Will be presented at the bottom of the message",
        displayOptions: {
          show: {
            footerToggle: [ true ]
          }
        }
      },
      {
        displayName: "Should Use Proxy URL",
        name: "proxyUrlToggle",
        type: "boolean",
        default: false,
        description:
          "Whether to add a proxy URL that send the request to it instead of whatsapp servers"
      },
      {
        displayName: "Proxy URL",
        name: "proxyUrl",
        type: "string",
        default: "",
        description:
          "Use this proxy to send the message to this URL instead of sending it to WhatsApp servers, meaning by using this value the you will be responsible for delivering the message",
        displayOptions: {
          show: {
            proxyUrlToggle: [ true ]
          }
        }
      }
    ]
  };

  methods = {
    loadOptions: {
      // This method will be triggered when the dropdown is opened in the UI
      async getPhoneNumbers(
        this: ILoadOptionsFunctions,
      ): Promise<INodePropertyOptions[]> {
        // Fetch credentials needed for API access (if required)
        const credentials = await this.getCredentials("whatsAppButtonsApi");

        // Make the API request to get the available phone numbers
        const response = await axios.get(
          `${ baseURL }/${ credentials.businessAccountID }/phone_numbers`,
          {
            headers: {
              Authorization: `Bearer ${ credentials.apiKey }`,
              "Content-Type": "application/json"
            }
          }
        );

        // Extract phone numbers from the API response
        const phoneNumbers = response.data.data as WhatsAppPhoneNumber[];

        if (phoneNumbers.length === 0) {
          return [
            {
              name: "No Phone Numbers Available",
              value: ""
            }
          ];
        }

        // Map the phone numbers into a format n8n can display in a dropdown
        return phoneNumbers.map((option) => ({
          name: `${ option.display_phone_number } - ${ option.verified_name }`, // This is the label shown in the dropdown
          value: JSON.stringify(option) // This is the value returned when the user selects an option
        }));
      },

      async getTemplates(
        this: ILoadOptionsFunctions,
      ): Promise<INodePropertyOptions[]> {
        // Fetch credentials needed for API access (if required)
        const credentials = await this.getCredentials("whatsAppButtonsApi");

        // Make the API request to get the available phone numbers
        const response = await axios.get(
          `${ baseURL }/${ credentials.businessAccountID }/message_templates`,
          {
            headers: {
              Authorization: `Bearer ${ credentials.apiKey }`,
              "Content-Type": "application/json"
            }
          }
        );

        // Extract phone numbers from the API response
        const templates = response.data.data as WhatsAppTemplate[];

        if (templates.length === 0) {
          return [
            {
              name: "No Templates Available",
              value: ""
            }
          ];
        }

        // Map the phone numbers into a format n8n can display in a dropdown
        return templates.map((option) => ({
          name: option.name,
          value: JSON.stringify(option)
        }));
      }
    }
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const action = this.getNodeParameter("action", 0) as string;
    const phoneNumber = this.getNodeParameter("phoneNumber", 0) as string;
    const whatsappPhoneNumberIdString = this.getNodeParameter(
      "senderPhoneDynamicOption",
      0
    ) as string;
    const whatsappPhoneNumber = JSON.parse(
      whatsappPhoneNumberIdString
    ) as WhatsAppPhoneNumber;
    const proxyUrl = this.getNodeParameter("proxyUrl", 0, "") as string;
    const proxyUrlToggle = this.getNodeParameter(
      "proxyUrlToggle",
      0,
      false
    ) as boolean;
    const credentials = await this.getCredentials("whatsAppButtonsApi");
    const headerAction = this.getNodeParameter("headerAction", 0) as string;
    const footer = this.getNodeParameter("footer", 0, "") as string;
    const headerImageURL = this.getNodeParameter(
      "headerImageURL",
      0,
      ""
    ) as string;
    let responseData: any;

    let message: string = "";
    const builder = new WhatsAppTemplateBuilder();
    const url =
      proxyUrl !== ""
        ? proxyUrl
        : `${ baseURL }/${ whatsappPhoneNumber.id }/messages`;
    const shouldUseProxyURL = proxyUrl !== "" && proxyUrlToggle;

    try {
      switch (action) {
        case "message":
          message = this.getNodeParameter("message", 0) as string;

          const handleSendingMessageRequest = async (
            url: string,
            phoneNumber: string,
            fromPhoneId: string,
            headerAction: string,
            headerImageURL: string,
            footer: string,
            messageText: string,
            credentials: ICredentialDataDecryptedObject
          ) => {
            const templateBuilder = builder
              .setRecipient(phoneNumber)
              .setSender(fromPhoneId)
              .setPlainMessage(messageText);

            let json = {};

            if (shouldUseProxyURL) {
              json = {
                from: fromPhoneId,
                to: phoneNumber,
                type: 'text',
                messageBody: messageText
              };
            } else {
              json = templateBuilder.build();
            }

            return axios.post(url, JSON.stringify(json), {
              headers: {
                Authorization: `Bearer ${ credentials.apiKey }`,
                "Content-Type": "application/json"
              }
            });
          };

          responseData = (
            await handleSendingMessageRequest(
              url,
              phoneNumber,
              whatsappPhoneNumber.id,
              headerAction,
              headerImageURL,
              footer,
              message,
              credentials
            )
          ).data;
          break;

        case "interactiveButtons":
          message = this.getNodeParameter("message", 0) as string;
          const buttonFields = this.getNodeParameter(
            "plainButton.fieldValues",
            0,
            ""
          ) as ButtonArray;

          // Arrow function used to preserve `this` context
          const handleInteractiveButtonsRequest = async (
            url: string,
            message: string,
            phoneNumber: string,
            fromPhoneId: string,
            headerAction: string,
            headerImageURL: string,
            footer: string,
            queryParameters: ButtonArray,
            credentials: ICredentialDataDecryptedObject
          ) => {
            const templateBuilder = builder
              .setRecipient(phoneNumber)
              .setSender(fromPhoneId)
              .addInteractiveButton(
                message,
                queryParameters.map((parameter, index) => {
                  return {
                    id: `button_${ index.toString() }`,
                    title: parameter.buttonTitle
                  };
                })
              ).addInteractiveFooter(footer)
              .addInteractiveHeaderImage(headerImageURL);

            let json = {};

            if (shouldUseProxyURL) {
              const interactiveButtonData: InteractiveButtonData = {
                body: {
                  text: message
                },
                buttons: queryParameters
              }
              json = {
                from: fromPhoneId,
                to: phoneNumber,
                type: 'interactive',
                messageBody: message,
                interactiveButtonData: interactiveButtonData
              };
            } else {
              json = templateBuilder.build();
            }

            return axios.post(url, JSON.stringify(json), {
              headers: {
                Authorization: `Bearer ${ credentials.apiKey }`,
                "Content-Type": "application/json"
              }
            });
          };

          responseData = (
            await handleInteractiveButtonsRequest(
              url,
              message,
              phoneNumber,
              whatsappPhoneNumber.id,
              headerAction,
              headerImageURL,
              footer,
              buttonFields,
              credentials
            )
          ).data;
          break;

        case "interactiveList":
          message = this.getNodeParameter("message", 0) as string;
          const buttonFieldsWithDescription = this.getNodeParameter(
            "buttonWithDescription.section",
            0,
            ""
          ) as SectionArray;
          const listTitle = this.getNodeParameter("listTitle", 0) as string;

          // Arrow function used to preserve `this` context
          const handleListButtonsRequest = async (
            url: string,
            message: string,
            phoneNumber: string,
            fromPhoneId: string,
            headerAction: string,
            headerImageURL: string,
            footer: string,
            listTitle: string,
            sections: SectionArray,
            credentials: ICredentialDataDecryptedObject
          ) => {
            let sectionsDict: Section[] = [];

            sections.forEach((section) => {
              const buttons: Row[] = section.buttonInSection.buttons.map(
                (button, index) => {
                  return {
                    id: `button_${ index.toString() }`,
                    title: button.buttonTitle,
                    description: button.buttonDescription
                  };
                }
              );
              sectionsDict.push({
                title: section.sectionTitle,
                rows: buttons
              });
            });

            const templateBuilder = builder
              .setRecipient(phoneNumber)
              .setSender(fromPhoneId)
              .addInteractiveList(
                message,
                listTitle,
                sectionsDict
              ).addInteractiveFooter(footer)
              .addInteractiveHeaderImage(headerImageURL);

            let json = {};

            if (shouldUseProxyURL) {
              const interactiveListData: InteractiveListData = {
                title: listTitle,
                body: {
                  text: message
                },
                sections: sections
              }
              if (footer !== '') {
                interactiveListData.footer = footer
              }
              if (headerImageURL !== '') {
                interactiveListData.header = {
                  type: WhatsAppHeaderComponentType.image,
                  url: headerImageURL
                }
              }
              json = {
                from: fromPhoneId,
                to: phoneNumber,
                type: 'interactive',
                messageBody: message,
                interactiveListData: interactiveListData
              }
            } else {
              json = templateBuilder.build();
            }

            return axios.post(url, JSON.stringify(json), {
              headers: {
                Authorization: `Bearer ${ credentials.apiKey }`,
                "Content-Type": "application/json"
              }
            });
          };

          responseData = (
            await handleListButtonsRequest(
              url,
              message,
              phoneNumber,
              whatsappPhoneNumber.id,
              headerAction,
              headerImageURL,
              footer,
              listTitle,
              buttonFieldsWithDescription,
              credentials
            )
          ).data;

          break;

        case "template":
          const selectedTemplateNode = this.getNodeParameter("templates", 0) as string;
          const selectedTemplate = JSON.parse(selectedTemplateNode) as WhatsAppTemplate;
          const parameters = this.getNodeParameter(
            "templateParameterList.parameters",
            0,
            ""
          ) as ParameterArray | undefined;

          const handleSendingTemplateRequest = async (
            url: string,
            phoneNumber: string,
            fromPhoneId: string,
            headerAction: string,
            headerImageURL: string,
            footer: string,
            template: WhatsAppTemplate,
            credentials: ICredentialDataDecryptedObject,
            parameters?: ParameterArray
          ) => {
            let templateData: TemplateData = {body: {}};
            const templateBuilder = builder
              .setRecipient(phoneNumber)
              .setSender(fromPhoneId)
              .setTemplateName(template.name, template.language);

            if (parameters && Array.isArray(parameters)) {
              templateBuilder.addTemplateBodyParameter();
              parameters.forEach((parameter) => {
                templateBuilder.addTemplateBodyTextParameter(
                  parameter.parameterValue
                );
              });
            }

            if (headerAction === "image" && headerImageURL !== "") {
              templateBuilder.addTemplateHeaderParameter();
              templateBuilder.addTemplateHeaderImageParameter(headerImageURL);
            }

            let json = {};

            if (shouldUseProxyURL) {
              let messageBody = template.components.find(component => component.type === WhatsAppComponentType.body)?.text

              if (messageBody && parameters) {
                templateData.body = {
                  parameters: parameters.map(param => param.parameterValue)
                }

                messageBody = parameters.reduce((result, param, index) => {
                  const placeholder = new RegExp(`{{(${index + 1})}}`, 'g')
                  return result.replace(placeholder, param.parameterValue)
                }, messageBody)
              }

              if (headerAction === "image" && headerImageURL !== "") {
                templateData.header = {
                  type: WhatsAppHeaderComponentType.image,
                  url: headerImageURL
                }
              }

              json = {
                from: fromPhoneId,
                to: phoneNumber,
                type: 'template',
                messageBody: messageBody,
                templateData: templateData,
                templateInformation: template
              }
            } else {
              json = templateBuilder.build();
            }

            return axios.post(url, JSON.stringify(json), {
              headers: {
                Authorization: `Bearer ${ credentials.apiKey }`,
                "Content-Type": "application/json"
              }
            });
          };

          responseData = (
            await handleSendingTemplateRequest(
              url,
              phoneNumber,
              whatsappPhoneNumber.id,
              headerAction,
              headerImageURL,
              footer,
              selectedTemplate,
              credentials,
              parameters
            )
          ).data;
          break;
      }

      return this.prepareOutputData([ {json: responseData} ]);
    } catch (error) {
      console.error(
        `Error making ${ action } request to WhatsAppButtons API:`,
        error.message
      );
      throw new NodeApiError(this.getNode(), error);
    }
  }
}
