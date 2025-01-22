import axios from 'axios'

const GLITTER_IPFS_API_URL = 'https://airag.glitterprotocol.tech'

interface IBlogListParams {
  page: number
  limit: number
  agent_id: string
}
interface IBlogItem {
  title: string
  content: string
  ens: string
  agent_id: string
  createTime: string
}
interface IBlogListRes {
  data: IBlogItem[]
}

export const getBlogList = async (params: IBlogListParams) => {
  const response = await axios.post<IBlogListRes>(`${GLITTER_IPFS_API_URL}/v1/post/list`, params)
  return response.data
}
