/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";

const GLITTER_IPFS_API_URL = "https://airag.glitterprotocol.tech/";
const url = GLITTER_IPFS_API_URL + "v1";

interface IBlogListParams {
  page: number;
  limit: number;
  agent_id: string;
}
export interface IBlogItem {
  title: string;
  content: string;
  ens: string;
  agent_id: string;
  createTime: string;
}

export async function getBlogList(
  params: IBlogListParams
): Promise<IBlogItem[]> {
  const response = await axios.post<{ data: IBlogItem[] }>(
    `${url}/post/list`,
    params
  );
  return response.data.data;
}

export const getWhiteList = async (address: string) => {
  const { data }: any = await axios.get<{
    valid: boolean;
  }>(`${url}/check_address/${address}`);
  return data.data.valid;
};

export const getGraphResult = async (page: number, pageSize: number) => {
  const response = await axios.post<any>(`${url}/nouns_proposal/query`, {
    query: `{
        proposals(
          first: ${pageSize}
          skip: ${(page - 1) * pageSize}
          orderBy: createdTimestamp
          orderDirection: desc
        ) {
          id
          status
          title
          description
          createdBlock
          createdTimestamp
          lastUpdatedTimestamp
          startBlock
          endBlock
          forVotes
          againstVotes
          abstainVotes
          quorumVotes
          adjustedTotalSupply
          proposer {
            id
          }
        }
      }`,
  });

  return response.data.data.proposals;
};

// Build query for a single proposal
const buildProposalQuery = (id: number | null) => {
  if (!id) return "";
  return `{
      proposal(id: "${id}") {
        id
        status
        title
        description
        createdBlock
        createdTimestamp
        lastUpdatedTimestamp
        startBlock
        endBlock
        updatePeriodEndBlock
        objectionPeriodEndBlock
        canceledBlock
        canceledTimestamp
        queuedBlock
        queuedTimestamp
        executedBlock
        executedTimestamp
        targets
        signatures
        calldatas
        values
        forVotes
        againstVotes
        abstainVotes
        executionETA
        quorumVotes
        adjustedTotalSupply
        proposer {
          id
        }
        signers {
          id
        }
        votes {
          id
          blockNumber
          blockTimestamp
          reason
          supportDetailed
          votes
          voter {
            id
          }
        }
        feedbackPosts {
          id
          reason
          supportDetailed
          createdBlock
          createdTimestamp
          votes
          voter {
            id
          }
        }
      }
    }`;
};

export const getProposalDetail = async (id: number) => {
  const query = buildProposalQuery(id);
  const response = await axios.post<any>(`${url}/nouns_proposal/query`, {
    query,
  });
  return response.data.data.proposal;
};

export const getProposalHistory = async (data: any) => {
  if (!data.nouns_proposal_id) return [];
  const response = await axios.post<any>(`${url}/chat/list`, {
    page: 1,
    limit: 100,
    did: data.did,
    nouns_proposal_id: Number(data.nouns_proposal_id),
  });
  return response.data.data.list;
};
