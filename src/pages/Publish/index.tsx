/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * AI Agent Publication Component
 * Allows users to create and publish new AI agents
 */

import React, { useEffect, useState } from "react";
import {
  Form,
  Input,
  Upload,
  Button,
  message,
  Select,
  Spin,
  Steps,
  Checkbox,
  CheckboxChangeEvent,
  Modal,
  Tooltip,
} from "antd";
import { UploadOutlined } from "@ant-design/icons";
import type { RcFile } from "antd/es/upload/interface";
import "./index.less";
import { uploadToIPFS } from "@/services/upload";
import { ENetwork } from "@/services/network";
import { PublishStep, StepData, FormValues } from "@/types";
import { WalletService } from "@/services/wallet";
import x from "@/assets/images/x.png";
import tg from "@/assets/images/tg.png";
import farcaster from "@/assets/images/farcaster.png";
import discord from "@/assets/images/discord.png";
import { useRecoilState } from "recoil";
import { drawerOpenState, isWalletConnectedState } from "@/store/network";
import { getWhiteList } from "@/services/aiChatFeed";
const { TextArea } = Input;

/**
 * Props interface for Publish component
 */
interface PublishProps {
  onSuccess: () => void;
}

// Define step messages
const STEPS = {
  PREPARING: "Preparing files...",
  CREATING_AGENT: "Creating Agent...",
  UPLOADING_FILES: "Uploading files...",
  CONFIRMING: "Binding Domain...",
  COMPLETED: "Completed!",
};

const enum EDataset {
  INDEX3 = "Index3",
  FARCASTER = "Farcaster",
  WEB3NEWS = "Web3 News",
  DAILYFEEDS = "Dailyfeeds",
  COINGECKO = "Coingecko",
  KNOWLEDGEBASE = "KnowledgeBase",
  NOUNS = "Nouns",
}

// add social media type definition
interface SocialMediaConfig {
  [ESocialMedia.TWITTER]?: {
    apiKey: string;
    apiSecret: string;
    accessToken: string;
    accessTokenSecret: string;
    userId: string;
  };
  [ESocialMedia.TELEGRAM]?: {
    botToken: string;
    chatId: string;
  };
  [ESocialMedia.FARCASER]?: {
    apiKey: string;
    username: string;
  };
  [ESocialMedia.DISCORD]?: {
    webhookUrl: string;
    botName: string;
  };
}

enum ESocialMedia {
  TWITTER = "twitter",
  TELEGRAM = "telegram",
  FARCASER = "farcaster",
  DISCORD = "discord",
}

enum EAgentType {
  normal = 2,
  nouns = 3,
}

/**
 * Publish component for creating new AI agents
 */
const Publish: React.FC<PublishProps> = ({ onSuccess }) => {
  // Form and state management
  const [form] = Form.useForm<FormValues>();
  const chatConfigValue = Form.useWatch("chatConfig", form);
  const blogConfigValue = Form.useWatch("blogConfig", form);
  const agentTypeValue = Form.useWatch("agent_type", form);
  const [avatarFile, setAvatarFile] = useState<RcFile>();
  const [submitting, setSubmitting] = React.useState(false);
  const [currentStep, setCurrentStep] = useState<PublishStep>(
    PublishStep.CONTRACT
  );
  const [stepMessage, setStepMessage] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const [domains, setDomains] = React.useState<string[]>([]);
  const [loadingDomains, setLoadingDomains] = React.useState(false);
  const [imageUrl, setImageUrl] = useState<string>();
  const [stepData, setStepData] = useState<StepData>({
    step: PublishStep.CONTRACT,
  });
  const walletService = WalletService.getInstance();
  const address = walletService.getWalletInfo()?.address;
  const [isWalletConnected] = useRecoilState(isWalletConnectedState);
  const [drawerOpen] = useRecoilState(drawerOpenState);
  const network = walletService.getCurrentNetwork();
  const [errorStep, setErrorStep] = useState<PublishStep | null>(null);

  const isFormDisabled = currentStep !== PublishStep.CONTRACT;

  // add social media config
  const [socialMediaConfig, setSocialMediaConfig] = useState<SocialMediaConfig>(
    {}
  );
  const [currentMedia, setCurrentMedia] = useState<string | null>(null);
  const [mediaModalVisible, setMediaModalVisible] = useState(false);
  const [mediaForm] = Form.useForm();

  // add dataset Form.useWatch
  const datasetValue = Form.useWatch("dataset", form);

  /**
   * Validate and upload avatar before adding to form
   */
  const beforeUpload = (file: RcFile): boolean => {
    const isJpgOrPng = file.type === "image/jpeg" || file.type === "image/png";
    if (!isJpgOrPng) {
      message.error("You can only upload JPG/PNG files!");
      return false;
    }

    const isLt1M = file.size / 1024 / 1024 < 1;
    if (!isLt1M) {
      message.error("Image must be smaller than 1MB!");
      return false;
    }

    setAvatarFile(file);
    getBase64(file, setImageUrl);
    return false;
  };

  const getErrorMessage = (step: PublishStep) => {
    switch (step) {
      case PublishStep.CONTRACT:
        return "Contract creation failed. Please try this step again.";
      case PublishStep.IPFS:
        return "IPFS upload failed. Please try this step again.";
      case PublishStep.ENS:
        return "Domain record update failed. Please try this step again.";
      default:
        return "An error occurred. Please try again.";
    }
  };

  // Handle contract step
  const handleContractStep = async (values: FormValues) => {
    try {
      setErrorStep(null);
      setSubmitting(true);
      setStepMessage(STEPS.PREPARING);

      if (!avatarFile) {
        message.error("Please upload an avatar!");
        return;
      }
      const data = {
        name: values.name,
        avatar: avatarFile,
        functionDesc: values.functionDesc,
        behaviorDesc: values.behaviorDesc,
        did: values.did,
        agent_type: values.agent_type,
        dataset: values.dataset,
        blog_dataset: values.blog_dataset,
        blogPrompt: values.blogPrompt,
        hasBlog: values.blogPrompt ? true : false,
        hasRAG: values.chatConfig,
        website: values.website,
        website1: values.website1,
        website2: values.website2,
      };

      setStepMessage(STEPS.CREATING_AGENT);
      const { txHash, ipfsInfo, fileList } = await walletService.createRecord(
        data
      );

      // Save data
      const newStepData = {
        step: PublishStep.IPFS,
        formData: values,
        fileList,
        contractData: {
          txHash,
        },
        ipfsData: {
          ...ipfsInfo,
          ipfsUploaded: false,
        },
      };
      setStepData(newStepData);

      // Go to next step
      updateStep(PublishStep.IPFS, newStepData);
    } catch (error) {
      console.error("Contract step failed:", error);
      message.error("Contract step failed");
      setErrorStep(PublishStep.CONTRACT);
      setSubmitting(false);
      setStepMessage("");
    }
  };

  const handleIpfsStep = async (stepData: StepData) => {
    try {
      setErrorStep(null);
      setSubmitting(true);
      setStepMessage(STEPS.UPLOADING_FILES);

      const { formData, contractData, ipfsData } = stepData;
      if (!formData || !contractData || !ipfsData) {
        throw new Error("Missing required data");
      }

      if (!avatarFile) {
        throw new Error("Avatar file not found");
      }

      let chainId = "1";
      if (network === ENetwork.Solana) {
        chainId = "101";
      }

      const socialMediaData = socialMediaConfig[ESocialMedia.TWITTER]
        ? {
            twitter_user_id:
              socialMediaConfig[ESocialMedia.TWITTER].userId || "",
            twitter_client_secret:
              socialMediaConfig[ESocialMedia.TWITTER].apiSecret || "",
            twitter_api_key:
              socialMediaConfig[ESocialMedia.TWITTER].apiKey || "",
            twitter_api_secret:
              socialMediaConfig[ESocialMedia.TWITTER].apiSecret || "",
            twitter_access_token:
              socialMediaConfig[ESocialMedia.TWITTER].accessToken || "",
            twitter_access_secret:
              socialMediaConfig[ESocialMedia.TWITTER].accessTokenSecret || "",
          }
        : undefined;

      const result = await uploadToIPFS(
        stepData,
        chainId,
        socialMediaData,
        (percent: any) => {
          setStepMessage(`Uploading... ${percent}%`);
        }
      );

      if (!result || !result.contentHash) {
        throw new Error("Upload failed");
      }

      const newStepData = {
        ...stepData,
        ipfsData: {
          ...ipfsData,
          contentHash: result.contentHash,
          ipfsUploaded: true,
        },
      };

      setStepData(newStepData);
      updateStep(PublishStep.ENS, newStepData);
    } catch (error) {
      console.error("IPFS step failed:", error);
      message.error("IPFS upload failed");
      setErrorStep(PublishStep.IPFS);
      setSubmitting(false);
      setStepMessage("");
    }
  };

  const handleEnsStep = async (stepData: StepData) => {
    try {
      setErrorStep(null);
      setSubmitting(true);
      setStepMessage(STEPS.CONFIRMING);

      const { formData, ipfsData } = stepData;
      if (!formData || !ipfsData || !ipfsData.ipfsUploaded) {
        throw new Error("Missing required data");
      }

      // Set records
      try {
        await walletService.setRecord({
          did: formData.did,
          contenthash: ipfsData.contentHash,
        });
        message.success("Records updated successfully");
      } catch (error) {
        console.error("Failed to set records:", error);
        if (error instanceof Error) {
          message.error(`Failed to update records: ${error.message}`);
        } else {
          message.error("Failed to update records");
        }
        return;
      }

      updateStep(PublishStep.COMPLETED);
      setStepMessage(STEPS.COMPLETED);

      onSuccess();
      message.success("Agent created successfully");
      form.resetFields();
      setAvatarFile(undefined);
      setImageUrl(undefined);
      setStepData({ step: PublishStep.CONTRACT });
      setCurrentStep(PublishStep.CONTRACT);
    } catch (error) {
      console.error("failed:", error);
      message.error("Domain update failed");
      setErrorStep(PublishStep.ENS);
    } finally {
      setSubmitting(false);
      setStepMessage("");
    }
  };

  const onFinish = async (values: FormValues) => {
    // add social media config to values
    const formValuesWithSocial = {
      ...values,
      dataset:
        isAdmin && agentTypeValue === EAgentType.nouns
          ? "Nouns"
          : values.dataset,
      socialMediaConfig,
    };

    switch (currentStep) {
      case PublishStep.CONTRACT:
        await handleContractStep(formValuesWithSocial);
        break;
      case PublishStep.IPFS:
        await handleIpfsStep(stepData);
        break;
      case PublishStep.ENS:
        await handleEnsStep(stepData);
        break;
      default:
        break;
    }
  };

  /**
   * Fetch ENS domains on component mount
   */
  React.useEffect(() => {
    const fetchENSDomains = async () => {
      if (!address) return;

      try {
        setLoadingDomains(true);
        const ownedNames = await walletService.getAllOwnedDomains();
        if (ownedNames.length > 0) {
          setDomains(ownedNames);
        }
      } catch (error) {
        console.error("Failed to fetch domains:", error);
        message.error("Failed to load domains. Please try again later.");
      } finally {
        setLoadingDomains(false);
      }
    };

    fetchENSDomains();
  }, [address, walletService]);

  useEffect(() => {
    if (!address || !drawerOpen) return;
    getWhiteList(address)
      .then((res) => {
        setIsAdmin(res);
      })
      .catch((error) => {
        console.error(error);
      });
  }, [address, drawerOpen]);

  const handleReset = () => {
    form.resetFields();
    setAvatarFile(undefined);
    setImageUrl(undefined);
    setLoadingDomains(false);
    setStepData({ step: PublishStep.CONTRACT });
    setCurrentStep(PublishStep.CONTRACT);
    setStepMessage("");
  };

  const uploadButton = (
    <div>
      <UploadOutlined />
      <div style={{ marginTop: 8 }}>Upload</div>
    </div>
  );

  const getBase64 = (img: RcFile, callback: (url: string) => void) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => callback(reader.result as string));
    reader.readAsDataURL(img);
  };

  // Execute step logic
  const executeStep = async (step: PublishStep, stepData: StepData) => {
    switch (step) {
      case PublishStep.CONTRACT:
        await form.validateFields();
        await handleContractStep(form.getFieldsValue());
        break;
      case PublishStep.IPFS:
        await handleIpfsStep(stepData);
        break;
      case PublishStep.ENS:
        await handleEnsStep(stepData);
        break;
      default:
        break;
    }
  };

  // Update current step
  const updateStep = (newStep: PublishStep, stepData?: StepData) => {
    setCurrentStep(newStep);
    if (newStep !== PublishStep.COMPLETED && stepData) {
      executeStep(newStep, stepData);
    }
  };

  const handleChatConfigChange = (e: CheckboxChangeEvent) => {
    if (e.target.checked) {
      form.setFieldsValue({
        chatConfig: true,
        dataset: undefined,
        blog_dataset: undefined,
      });
    } else {
      form.setFieldsValue({
        chatConfig: false,
        dataset: undefined,
        blog_dataset: undefined,
      });
    }
  };

  const handleBlogConfigChange = (e: CheckboxChangeEvent) => {
    if (e.target.checked) {
      form.setFieldsValue({
        blogConfig: true,
        blogPrompt: undefined,
      });
    } else {
      form.setFieldsValue({
        blogConfig: false,
        blogPrompt: undefined,
        blog_dataset: undefined,
      });
    }
  };

  const initialValues = {
    chatConfig: false,
    blogConfig: false,
    dataset: undefined,
    blogPrompt: undefined,
  };

  // add media icon component
  const SocialMediaIcon = ({
    type,
    onClick,
    active,
  }: {
    type: ESocialMedia;
    onClick: () => void;
    active: boolean;
  }) => {
    const getIcon = () => {
      switch (type) {
        case ESocialMedia.TWITTER:
          return (
            <>
              <img width={18} height={18} src={x} alt="twitter" />
              <p className="social-media-title">Twitter</p>
              <Button className="connect-button">
                {active ? "Reconnect" : "Connect"}
              </Button>
            </>
          );
        case ESocialMedia.TELEGRAM:
          return (
            <>
              <img width={18} height={18} src={tg} alt="telegram" />
              <p className="social-media-title">Telegram</p>
              <Button className="connect-button">
                {active ? "Reconnect" : "Connect"}
              </Button>
            </>
          );
        case ESocialMedia.FARCASER:
          return (
            <>
              <img width={18} height={18} src={farcaster} alt="farcaster" />
              <p className="social-media-title">Farcaster</p>
              <Button className="connect-button">
                {active ? "Reconnect" : "Connect"}
              </Button>
            </>
          );
        case ESocialMedia.DISCORD:
          return (
            <>
              <img width={18} height={18} src={discord} alt="discord" />
              <p className="social-media-title">Discord</p>
              <Button className="connect-button">
                {active ? "Reconnect" : "Connect"}
              </Button>
            </>
          );
        default:
          return null;
      }
    };

    const getTooltipTitle = () => {
      switch (type) {
        case ESocialMedia.TWITTER:
          return "Twitter";
        case ESocialMedia.TELEGRAM:
          return "Telegram";
        case ESocialMedia.FARCASER:
          return "Farcaster";
        case ESocialMedia.DISCORD:
          return "Discord";
        default:
          return "";
      }
    };

    return (
      <Tooltip title={getTooltipTitle()}>
        <div
          className={`social-media-icon ${active ? "active" : ""}`}
          onClick={onClick}
        >
          {getIcon()}
        </div>
      </Tooltip>
    );
  };

  // add media form fields config
  const getMediaFormFields = (type: string) => {
    switch (type) {
      case ESocialMedia.TWITTER:
        return (
          <>
            <Form.Item
              label="API Key"
              name="apiKey"
              rules={[{ required: true, message: "Please input API Key!" }]}
            >
              <Input placeholder="Enter Twitter API Key" />
            </Form.Item>
            <Form.Item
              label="API Secret"
              name="apiSecret"
              rules={[{ required: true, message: "Please input API Secret!" }]}
            >
              <Input.Password placeholder="Enter Twitter API Secret" />
            </Form.Item>
            <Form.Item
              label="Access Token"
              name="accessToken"
              rules={[
                { required: true, message: "Please input Access Token!" },
              ]}
            >
              <Input placeholder="Enter Twitter Access Token" />
            </Form.Item>
            <Form.Item
              label="Access Token Secret"
              name="accessTokenSecret"
              rules={[
                {
                  required: true,
                  message: "Please input Access Token Secret!",
                },
              ]}
            >
              <Input.Password placeholder="Enter Twitter Access Token Secret" />
            </Form.Item>
            <Form.Item
              label="User ID"
              name="userId"
              rules={[
                {
                  required: true,
                  message: "Please input User ID !",
                },
              ]}
            >
              <Input placeholder="Enter Twitter User ID" />
            </Form.Item>
          </>
        );
      case ESocialMedia.TELEGRAM:
        return (
          <>
            <Form.Item
              label="Token"
              name="token"
              rules={[{ required: true, message: "Please input Token!" }]}
            >
              <Input placeholder="Enter Telegram Token" />
            </Form.Item>
            <Form.Item
              label="User ID"
              name="userId"
              rules={[{ required: true, message: "Please input User ID!" }]}
            >
              <Input placeholder="Enter Telegram User ID" />
            </Form.Item>
          </>
        );
      case ESocialMedia.FARCASER:
        return (
          <>
            <Form.Item
              label="Neynar_api_key"
              name="neynar_api_key"
              rules={[{ required: true, message: "Please input API Key!" }]}
            >
              <Input placeholder="Enter Neynar API Key" />
            </Form.Item>
            <Form.Item
              label="Signer UUID"
              name="neynar_signer_uuid"
              rules={[{ required: true, message: "Please input Signer UUID!" }]}
            >
              <Input placeholder="Enter Neynar Signer UUID" />
            </Form.Item>
            <Form.Item
              label="User FID"
              name="user_fid"
              rules={[{ required: true, message: "Please input User FID!" }]}
            >
              <Input placeholder="Enter Farcaster User FID" />
            </Form.Item>
          </>
        );
      case ESocialMedia.DISCORD:
        return (
          <>
            <Form.Item
              label="Token"
              name="token"
              rules={[{ required: true, message: "Please input Token!" }]}
            >
              <Input placeholder="Enter Discord Token" />
            </Form.Item>
          </>
        );
      default:
        return null;
    }
  };

  // add handle function
  const handleMediaIconClick = (type: ESocialMedia) => {
    setCurrentMedia(type);
    mediaForm.resetFields();

    // if has config, fill form
    if (socialMediaConfig[type]) {
      mediaForm.setFieldsValue(socialMediaConfig[type]);
    }

    setMediaModalVisible(true);
  };

  const handleMediaFormSubmit = () => {
    mediaForm.validateFields().then((values) => {
      setSocialMediaConfig((prev) => ({
        ...prev,
        [currentMedia as string]: values,
      }));
      setMediaModalVisible(false);
      message.success(`${currentMedia} configuration saved`);
    });
  };

  return (
    <div className="publish-container">
      <Steps
        current={Object.values(PublishStep).indexOf(currentStep)}
        items={[
          { title: "Generate Agent" },
          { title: "Upload IPFS" },
          { title: "Bind Domain" },
        ]}
        className="publish-steps"
        style={{ marginBottom: 24 }}
      />

      <Form<FormValues>
        form={form}
        layout="vertical"
        onFinish={onFinish}
        requiredMark={false}
        onReset={handleReset}
        initialValues={initialValues}
      >
        <Form.Item
          label="Agent Name"
          name="name"
          rules={[
            { required: true, message: "Please input Agent Name!" },
            { max: 50, message: "Agent Name cannot exceed 50 characters!" },
          ]}
        >
          <Input
            disabled={isFormDisabled}
            autoComplete="off"
            placeholder="Enter Agent Name"
            maxLength={50}
            showCount
          />
        </Form.Item>

        {isAdmin && (
          <Form.Item
            className="sub-label"
            label="Agent Type"
            name="agent_type"
            rules={[
              {
                required: isAdmin,
                message: "Please select a agent type!",
              },
            ]}
          >
            <Select placeholder="Please select a agent type">
              <Select.Option value={EAgentType.normal}>Normal</Select.Option>
              <Select.Option value={EAgentType.nouns}>Nouns</Select.Option>
            </Select>
          </Form.Item>
        )}

        <Form.Item
          label="Avatar"
          name="avatar"
          rules={[{ required: true, message: "Please upload avatar!" }]}
        >
          <Upload
            disabled={isFormDisabled}
            listType="picture-card"
            showUploadList={false}
            beforeUpload={beforeUpload}
          >
            {imageUrl ? (
              <img src={imageUrl} alt="avatar" style={{ width: "100%" }} />
            ) : (
              uploadButton
            )}
          </Upload>
        </Form.Item>

        <Form.Item
          label="Agent Intro"
          name="functionDesc"
          rules={[
            { required: true, message: "Please input Agent Intro!" },
            { max: 150, message: "Agent Intro cannot exceed 150 characters!" },
          ]}
        >
          <TextArea
            disabled={isFormDisabled}
            placeholder="Provide a brief introduction for the AI agent here"
            autoSize={{ minRows: 3, maxRows: 6 }}
            maxLength={150}
            showCount
          />
        </Form.Item>

        <Form.Item label="Chat Configuration" name="chatConfig">
          <Checkbox onChange={handleChatConfigChange}>Chat with RAG</Checkbox>
          <p className="config-desc">
            Enhance chat responses by retrieving and integrating external data
            from selected datasets.
          </p>
        </Form.Item>

        {chatConfigValue && (
          <Form.Item
            className="sub-label"
            label="Dataset"
            name="dataset"
            rules={[
              {
                required: chatConfigValue,
                message: "Please select a dataset!",
              },
            ]}
          >
            <Select placeholder="Please select a dataset">
              <Select.Option value={EDataset.INDEX3}>
                {EDataset.INDEX3} (Mirror, Farcaster, ENS Websites, Web3 News)
              </Select.Option>
              <Select.Option value={EDataset.FARCASTER}>
                {EDataset.FARCASTER}
              </Select.Option>
              <Select.Option value={EDataset.WEB3NEWS}>
                {EDataset.WEB3NEWS}
              </Select.Option>
              <Select.Option value={EDataset.COINGECKO}>
                {EDataset.COINGECKO}
              </Select.Option>
              <Select.Option value={EDataset.KNOWLEDGEBASE}>
                {EDataset.KNOWLEDGEBASE}
              </Select.Option>
              <Select.Option value={EDataset.NOUNS}>
                {EDataset.NOUNS}
              </Select.Option>
            </Select>
          </Form.Item>
        )}

        {datasetValue === EDataset.KNOWLEDGEBASE && (
          <div style={{ marginLeft: "24px" }}>
            <Form.Item
              label={null}
              name="website"
              rules={[
                {
                  required: datasetValue === EDataset.KNOWLEDGEBASE,
                  message: "Please enter the website address!",
                },
              ]}
            >
              <Input
                autoComplete="off"
                placeholder="Enter the website address"
              />
            </Form.Item>
            <Form.Item
              label={null}
              name="website1"
              rules={[
                {
                  required: false,
                  message: "Please enter the website address!",
                },
              ]}
            >
              <Input
                autoComplete="off"
                placeholder="Enter the website address"
              />
            </Form.Item>
            <Form.Item
              label={null}
              name="website2"
              rules={[
                {
                  required: false,
                  message: "Please enter the website address!",
                },
              ]}
            >
              <Input
                autoComplete="off"
                placeholder="Enter the website address"
              />
            </Form.Item>
          </div>
        )}

        <Form.Item
          label={
            <div className="prompt-label">
              <span style={{ fontSize: "14px" }}>Chat Prompt</span>{" "}
              <a
                target="_blank"
                href="https://ipfs.glitterprotocol.dev/ipfs/QmcY138nyXn9PEf26STTPeWHUBNUwbF43tih7avvJvsedt"
              >
                Prompt Template
              </a>
            </div>
          }
          name="behaviorDesc"
          rules={[
            {
              required: true,
              message: "Please input Chat Prompt!",
            },
          ]}
        >
          <TextArea
            disabled={isFormDisabled}
            placeholder="Define how the Agent should interact with users during chats. Include the tone, knowledge focus, and expected behavior."
            autoSize={{ minRows: 3, maxRows: 6 }}
          />
        </Form.Item>

        <Form.Item
          label={
            <>
              <span>Blog Configuration</span>
              <span
                style={{ color: "rgba(255, 255, 255, 0.5)", marginLeft: "2px" }}
                className="optional-label"
              >
                (Optional)
              </span>
            </>
          }
          name="blogConfig"
          rules={[
            {
              required: blogConfigValue,
              message: "Please input Blog Prompt!",
            },
          ]}
        >
          <>
            <Checkbox onChange={handleBlogConfigChange}>
              Blog Generation with RAG
            </Checkbox>
            <p className="config-desc">
              Automatically generate blog summarizing key trends and highlights
              from selected datasets.
            </p>
          </>
        </Form.Item>

        {blogConfigValue && (
          <Form.Item
            className="sub-label"
            label="Blog Dataset"
            name="blog_dataset"
            rules={[
              {
                required: blogConfigValue,
                message: "Please select a dataset!",
              },
            ]}
          >
            <Select placeholder="Please select a dataset">
              <Select.Option value={EDataset.WEB3NEWS}>
                {EDataset.WEB3NEWS}
              </Select.Option>
            </Select>
          </Form.Item>
        )}

        <Form.Item
          label={
            <div className="prompt-label">
              <div>
                <span style={{ fontSize: "14px" }}>Blog Prompt</span>
              </div>
              <a
                target="_blank"
                href="https://ipfs.glitterprotocol.dev/ipfs/QmeTrPTkDbEKBchPiQm85SAvbZ5NxEh8GDbW6fvGGnWggP"
              >
                Prompt Template
              </a>
            </div>
          }
          name="blogPrompt"
          rules={[
            {
              required: blogConfigValue,
              message: "Please input Blog Prompt!",
            },
          ]}
        >
          <TextArea
            disabled={isFormDisabled}
            placeholder="Describe how the Agent should generate blog posts. Include the focus topics, writing style and target audience."
            autoSize={{ minRows: 3, maxRows: 6 }}
          />
        </Form.Item>

        <Form.Item
          label="DID"
          name="did"
          rules={[{ required: true, message: "Please select a domain!" }]}
        >
          <Select
            disabled={isFormDisabled || !isWalletConnected}
            placeholder={
              address ? "Select your domain" : "Please connect wallet first"
            }
            loading={loadingDomains}
            notFoundContent={
              loadingDomains ? (
                <Spin size="small" />
              ) : !address ? (
                "Please connect wallet first"
              ) : domains.length === 0 ? (
                "No domains found for this address"
              ) : null
            }
            onDropdownVisibleChange={async (open) => {
              if (open && address) {
                try {
                  setLoadingDomains(true);
                  const domains = await walletService.getAllOwnedDomains();
                  if (domains.length > 0) {
                    setDomains(domains);
                  }
                } catch (error) {
                  console.error("Failed to fetch domains:", error);
                  message.error("Failed to load domains");
                } finally {
                  setLoadingDomains(false);
                }
              }
            }}
          >
            {domains.map((domain) => (
              <Select.Option key={domain} value={domain}>
                {domain}
                {network === ENetwork.Solana ? ".sol" : ""}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          label={
            <>
              <span>Connect Your Accounts</span>
              <span
                style={{ color: "rgba(255, 255, 255, 0.5)", marginLeft: "2px" }}
                className="optional-label"
              >
                (Optional)
              </span>
            </>
          }
        >
          <>
            <p className="social-media-desc">
              Connect your social media to use Agent on it.
            </p>
            <div className="social-media-container">
              <SocialMediaIcon
                type={ESocialMedia.TWITTER}
                onClick={() => handleMediaIconClick(ESocialMedia.TWITTER)}
                active={!!socialMediaConfig[ESocialMedia.TWITTER]}
              />
            </div>
          </>
        </Form.Item>

        {errorStep && (
          <div
            style={{
              color: "#ff4d4f",
              marginBottom: 16,
              textAlign: "center",
            }}
          >
            {getErrorMessage(errorStep)}
          </div>
        )}

        <Form.Item>
          <Button
            style={{ marginTop: "24px", color: "#141414" }}
            type="primary"
            htmlType="submit"
            block
            loading={submitting}
          >
            {submitting
              ? stepMessage || "Creating..."
              : errorStep
              ? "Retry this step"
              : "Create"}
          </Button>
        </Form.Item>
      </Form>

      {/* add social media form modal */}
      <Modal
        centered
        className="media-modal"
        title={
          currentMedia
            ? `Connect ${
                currentMedia.charAt(0).toUpperCase() + currentMedia.slice(1)
              }`
            : ""
        }
        open={mediaModalVisible}
        onCancel={() => setMediaModalVisible(false)}
        footer={[
          <div
            key="buttons"
            style={{
              display: "flex",
              gap: "16px",
              justifyContent: "center",
              width: "100%",
            }}
          >
            <Button key="cancel" onClick={() => setMediaModalVisible(false)}>
              Cancel
            </Button>
            <Button
              style={{ color: "#141414" }}
              key="submit"
              type="primary"
              onClick={handleMediaFormSubmit}
            >
              Confirm
            </Button>
          </div>,
        ]}
      >
        <Form id="media-form" form={mediaForm} layout="vertical">
          {currentMedia && getMediaFormFields(currentMedia)}
        </Form>
      </Modal>
    </div>
  );
};

export default Publish;
