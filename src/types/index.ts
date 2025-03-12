export enum PublishStep {
  CONTRACT = 'CONTRACT', 
  IPFS = 'IPFS',
  ENS = 'ENS',
  COMPLETED = 'COMPLETED'
}

export interface FormValues {
  name: string;
  functionDesc: string;
  behaviorDesc: string;
  did: string;
  chatConfig: boolean;
  dataset: string;
  blogConfig: boolean;
  blogPrompt: string;
  blog_dataset: string;
  website: string;
  website1: string;
  website2: string;
}

export interface StepData {
  step: PublishStep;
  formData?: FormValues;
  fileList?: File[];
  contractData?: {
    txHash: string;
  };
  ipfsData?: {
    avatarHash: string;
    contentHash: string;
    agentId?: string;
    ipfsUploaded?: boolean;
  };
} 