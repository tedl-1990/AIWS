/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * AI Agent Publication Component
 * Allows users to create and publish new AI agents
 */

import React, { useState } from "react";
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
} from "antd";
import { UploadOutlined } from "@ant-design/icons";
import type { RcFile } from "antd/es/upload/interface";
import "./index.less";
import { uploadToIPFS } from "@/services/upload";
import { ENetwork } from "@/services/network";
import { PublishStep, StepData, FormValues } from "@/types";
import { WalletService } from "@/services/wallet";
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
}

/**
 * Publish component for creating new AI agents
 */
const Publish: React.FC<PublishProps> = ({ onSuccess }) => {
  // Form and state management
  const [form] = Form.useForm<FormValues>();
  const chatConfigValue = Form.useWatch("chatConfig", form);
  const blogConfigValue = Form.useWatch("blogConfig", form);
  const [avatarFile, setAvatarFile] = useState<RcFile>();
  const [submitting, setSubmitting] = React.useState(false);
  const [currentStep, setCurrentStep] = useState<PublishStep>(
    PublishStep.CONTRACT
  );
  const [stepMessage, setStepMessage] = useState("");

  const [domains, setDomains] = React.useState<string[]>([]);
  const [loadingDomains, setLoadingDomains] = React.useState(false);
  const [imageUrl, setImageUrl] = useState<string>();
  const [stepData, setStepData] = useState<StepData>({
    step: PublishStep.CONTRACT,
  });
  const walletService = WalletService.getInstance();
  const address = walletService.getWalletInfo()?.address;
  const network = walletService.getCurrentNetwork();
  const [errorStep, setErrorStep] = useState<PublishStep | null>(null);

  const isFormDisabled = currentStep !== PublishStep.CONTRACT;

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
        dataset: values.dataset,
        blog_dataset: values.blog_dataset,
        blogPrompt: values.blogPrompt,
        hasBlog: values.blogPrompt ? true : false,
        hasRAG: values.chatConfig,
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
      const result = await uploadToIPFS(stepData, chainId, (percent: any) => {
        setStepMessage(`Uploading... ${percent}%`);
      });

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
    switch (currentStep) {
      case PublishStep.CONTRACT:
        await handleContractStep(values);
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

  return (
    <div className="publish-container">
      <Steps
        current={Object.values(PublishStep).indexOf(currentStep)}
        items={[
          { title: "Generate Agent" },
          { title: "Upload IPFS" },
          { title: "Bind Domain" },
        ]}
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
              {/* <Select.Option value={EDataset.DAILYFEEDS}>
                {EDataset.DAILYFEEDS}
              </Select.Option> */}
            </Select>
          </Form.Item>
        )}

        <Form.Item
          label={
            <div className="prompt-label">
              <span>Chat Prompt</span>{" "}
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
          label="Blog Configuration (Optional)"
          name="blogConfig"
          rules={[
            {
              required: blogConfigValue,
              message: "Please input Blog Prompt!",
            },
          ]}
        >
          <Checkbox onChange={handleBlogConfigChange}>
            Blog Generation with RAG
          </Checkbox>
          <p className="config-desc">
            Automatically generate blog summarizing key trends and highlights
            from selected datasets.
          </p>
        </Form.Item>

        {blogConfigValue && (
          <Form.Item
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
              {/* <Select.Option value={EDataset.DAILYFEEDS}>
                {EDataset.DAILYFEEDS}
              </Select.Option> */}
            </Select>
          </Form.Item>
        )}

        <Form.Item
          label={
            <div className="prompt-label">
              <div>
                <span>Blog Prompt</span>
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
            disabled={isFormDisabled || !address}
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
              </Select.Option>
            ))}
          </Select>
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
            style={{ marginTop: 24 }}
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
    </div>
  );
};

export default Publish;
