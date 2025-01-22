/* eslint-disable @typescript-eslint/no-explicit-any */
import { Bubble, useXAgent, useXChat } from '@ant-design/x'
import { Button, Input, Modal, Tooltip } from 'antd'
import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { v4 as uuidv4 } from 'uuid'
import './index.less'

import { sendMessage } from '@/services/ai'
import { getBlogList } from '@/services/aiChatFeed'
import { getEnsSocialAccounts } from '@/services/ens'

// Assets
import icSend from '@/assets/images/arrow-top.png'
import icJump from '@/assets/images/jump.png'
import imgDefaultAvatar from '@/assets/images/default-avatar.png'
import icEmpty from '@/assets/images/empty.png'
import icClose from '@/assets/images/close.png'
import icTwitter from '@/assets/images/ic-x.png'
import icTelegram from '@/assets/images/ic-telegram.png'
import icGithub from '@/assets/images/ic-github.png'

// Types
interface FeedItem {
  title: string
  content: string
}

const HAS_BLOG = false

// Constants
const DEFAULT_CONFIG = {
  avatar: imgDefaultAvatar,
  name: 'On-Chain Hacker - Nova',
  functionDesc:
    'A tech-savvy blockchain expert skilled in smart contracts and security. Nova is precise, logical, and always reliable.',
  model: 'gpt-3.5-turbo',
  did: 'nick.eth',
  id: '0',
  agentId: 'Vi2L02VaH8HZG5MmaUH9B',
  blogPrompt: '',
  hasBlog: HAS_BLOG,
}

const MOBILE_BREAKPOINT = 760
const sessionId = uuidv4()

const Independent: React.FC = () => {
  // Data
  const aiData = window?.aiData as any
  const {
    avatar = DEFAULT_CONFIG.avatar,
    name = DEFAULT_CONFIG.name,
    functionDesc = DEFAULT_CONFIG.functionDesc,
    behaviorDesc,
    did = DEFAULT_CONFIG.did,
    blogPrompt,
    agentId,
    id,
    hasBlog = HAS_BLOG,
  } = aiData || DEFAULT_CONFIG

  // States
  const [content, setContent] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isComposing, setIsComposing] = useState(false)
  const [activeTab, setActiveTab] = useState<'feed' | 'chat'>(hasBlog ? 'feed' : 'chat')
  const [feedList, setFeedList] = useState<FeedItem[]>([])
  const [isOnMobile, setIsOnMobile] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [ensSocialAccounts, setEnsSocialAccounts] = useState<any>({})
  // Refs
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<any>(null)

  const sessionParam = {
    sessionId,
    agentId: agentId || id,
    ens: did,
  }

  // Chat configuration
  const roles = {
    ai: {
      placement: 'start' as const,
      typing: { step: 5, interval: 20 },
      avatar: { src: avatar },
    },
    local: {
      placement: 'end' as const,
      variant: 'shadow' as const,
    },
  }

  // Utility functions
  const scrollChatToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
      }
    })
  }, [])

  const copyToClipboard = useCallback((text: string) => {
    try {
      navigator.clipboard.writeText(text)
      setIsCopied(true)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }, [])

  // Chat handling
  const [agent] = useXAgent({
    request: async ({ message }, { onSuccess, onUpdate }) => {
      try {
        await sendMessage(
          message || '',
          sessionId,
          (text: string) => {
            onUpdate(text)
            scrollChatToBottom()
          },
          (text: string) => {
            onSuccess(text)
            scrollChatToBottom()
          },
        )
      } catch (error) {
        console.error('Error:', error)
        onSuccess('Sorry, an error occurred. Please try again later.')
      }
    },
  })

  const { onRequest, messages } = useXChat({ agent })

  const onSubmit = useCallback(() => {
    const content = inputRef.current?.value
    if (isComposing || !content) return
    onRequest(content)
    inputRef.current.value = ''
    setContent('')
    scrollChatToBottom()
  }, [isComposing, onRequest, scrollChatToBottom])

  // Feed handling
  const [feedLoading, setFeedLoading] = useState(false)
  const queryFeedList = useCallback(async () => {
    try {
      setFeedLoading(true)
      const res = await getBlogList({
        agent_id: sessionParam.agentId,
        page: 1,
        limit: 100,
      })
      setFeedList(res.data)
      setFeedLoading(false)
    } catch (error) {
      setFeedLoading(false)
      console.error('Failed to fetch feed:', error)
    }
  }, [sessionParam.agentId])

  // Components
  const CustomBubble = useCallback(
    ({ content }: { content: string }) => (
      <div className='markdown-content'>
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    ),
    [],
  )

  const items = useMemo(() => {
    return messages.map(({ id, message, status }) => ({
      key: id,
      loading: false,
      role: status === 'local' ? 'local' : 'ai',
      content: <CustomBubble content={message} />,
    }))
  }, [messages, CustomBubble])

  // Effects
  useEffect(() => {
    const checkMobile = () => setIsOnMobile(window.innerWidth < MOBILE_BREAKPOINT)
    checkMobile()
    window.addEventListener('resize', checkMobile)

    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (did) {
      getEnsSocialAccounts(did).then((res) => {
        setEnsSocialAccounts(res)
      })
    }
  }, [did])

  useEffect(() => {
    if (hasBlog) {
      queryFeedList()
    }
  }, [hasBlog, queryFeedList])

  const contentTabWidth = useMemo(() => {
    if (isOnMobile) {
      return '100%'
    }
    return hasBlog ? '400px' : '200px'
  }, [hasBlog, isOnMobile])
  const chatTabWidth = useMemo(() => {
    if (!hasBlog) {
      return '100%'
    }
    return '50%'
  }, [hasBlog])

  return (
    <>
      <div className='ai-agent-ert-effect'></div>
      <div className='ai-agent-container'>
        <div className='agent-header'>
          <div className='agent-info'>
            <img src={avatar} alt='avatar' className='agent-avatar' />
            <div className='agent-details'>
              <h2 className='agent-name ai-agent-flicker'>{name}</h2>
              <div className='agent-social-accounts'>
                {ensSocialAccounts.twitter && (
                  <img
                    src={icTwitter}
                    onClick={() => window.open(`https://x.com/${ensSocialAccounts.twitter}`, '_blank')}
                    alt='twitter'
                  />
                )}
                {ensSocialAccounts.telegram && (
                  <img
                    src={icTelegram}
                    onClick={() => window.open(`https://t.me/${ensSocialAccounts.telegram}`, '_blank')}
                    alt='telegram'
                  />
                )}
                {ensSocialAccounts.github && (
                  <img
                    src={icGithub}
                    onClick={() => window.open(`https://github.com/${ensSocialAccounts.github}`, '_blank')}
                    alt='github'
                  />
                )}
              </div>
              {!isOnMobile && (
                <div>
                  <p className='agent-desc ai-agent-flicker'>{functionDesc}</p>
                  <div className='agent-details-btn' onClick={() => setIsModalOpen(true)}>
                    <span>View Details</span>
                    <img src={icJump} alt='' style={{ width: '26px', marginLeft: '8px' }} />
                  </div>
                </div>
              )}
            </div>
          </div>
          {isOnMobile && (
            <>
              <p className='agent-desc ai-agent-flicker'>{functionDesc}</p>
              <div className='agent-details-btn' onClick={() => setIsModalOpen(true)}>
                <span>View Details</span>
                <img src={icJump} alt='' style={{ width: '26px', marginLeft: '8px' }} />
              </div>
            </>
          )}
        </div>
        <div className='content-container'>
          <div className='content-tabs' style={{ width: contentTabWidth }}>
            {hasBlog && (
              <div
                className={activeTab === 'feed' ? 'ai-agent-flicker active' : 'ai-agent-flicker'}
                onClick={() => setActiveTab('feed')}
              >
                Feed
              </div>
            )}
            <div
              className={`${!hasBlog && isOnMobile ? 'showBorderBottom' : ''} ${
                activeTab === 'chat' ? 'ai-agent-flicker active' : 'ai-agent-flicker'
              }`}
              style={{ width: chatTabWidth }}
              onClick={() => setActiveTab('chat')}
            >
              Chat
            </div>
          </div>

          <div className='tabs-content-splitter'></div>
          <div className='content-wrapper'>
            {/* feed */}
            <div style={{ display: activeTab === 'feed' ? 'block' : 'none' }} className='feed-container'>
              {feedLoading ? (
                <div className='feed-loading'>
                  <div className='loader'></div>
                  <div className='feed-loading-text'>Loading</div>
                </div>
              ) : (
                <>
                  {feedList.length > 0 ? (
                    feedList.map((item: any, index: number) => (
                      <div key={index}>
                        <div className='feed-item'>
                          <div className='feed-item-title'>{item.title}</div>
                          <div>{item.content}</div>
                        </div>
                        {index !== feedList.length - 1 && <div className='feed-item-divider'></div>}
                      </div>
                    ))
                  ) : (
                    <div className='feed-empty'>
                      <img src={icEmpty} alt='' />
                      <div>No Content</div>
                    </div>
                  )}
                </>
              )}
            </div>
            {/* chat */}
            <div
              ref={chatContainerRef}
              style={{ display: activeTab === 'chat' ? 'block' : 'none' }}
              className='chat-container'
            >
              <Bubble.List items={items} roles={roles} className='messages' />
              <div className='sender'>
                <input
                  ref={inputRef}
                  placeholder='Send a message, and I will chat with you.'
                  className='sender-input'
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      onSubmit()
                    }
                  }}
                  onCompositionStart={() => setIsComposing(true)}
                  onCompositionEnd={() => setIsComposing(false)}
                />
                <Button
                  loading={agent.isRequesting()}
                  onClick={() => onSubmit()}
                  type='primary'
                  className='sender-btn'
                  icon={<img src={icSend} alt='' style={{ width: 16, height: 16 }} />}
                ></Button>
              </div>
            </div>
          </div>
        </div>

        <Modal
          title={<div className='ai-agent-flicker'>AI Agent Details</div>}
          open={isModalOpen}
          onCancel={() => setIsModalOpen(false)}
          footer={null}
          width={'85%'}
          centered
          closeIcon={<img src={icClose} alt='' style={{ width: '24px', height: '24px' }} />}
          getContainer={() => document.querySelector('.ai-agent-container') as HTMLElement}
        >
          <div className='agent-details-modal ai-agent-flicker'>
            <div className='avatar-section'>
              <img src={avatar || DEFAULT_CONFIG.avatar} alt='avatar' />
              <h3 className='agent-modal-name'>{name}</h3>
            </div>
            <div className='agent-details-divider'></div>
            <div className='detail-item'>
              <h4>Agent Intro:</h4>
              <p>{functionDesc}</p>
            </div>
            <div className='detail-item'>
              <h4>Agent Description Prompt:</h4>
              <Tooltip
                title={
                  <div style={{ cursor: 'pointer' }} onClick={() => copyToClipboard(behaviorDesc)}>
                    {isCopied ? 'Copied!' : 'Click To Copy'}
                  </div>
                }
                getPopupContainer={() => document.querySelector('.agent-details-modal') as HTMLElement}
                placement='topRight'
                mouseEnterDelay={0}
                onOpenChange={(open) => {
                  if (open) {
                    setIsCopied(false)
                  }
                }}
              >
                <p onClick={() => copyToClipboard(behaviorDesc)} style={{ cursor: 'pointer' }}>
                  {behaviorDesc}
                </p>
              </Tooltip>
            </div>
            {blogPrompt && (
              <div className='detail-item'>
                <h4>Blog Description Prompt:</h4>
                <Tooltip
                  title={
                    <div style={{ cursor: 'pointer' }} onClick={() => copyToClipboard(blogPrompt)}>
                      {isCopied ? 'Copied!' : 'Click To Copy'}
                    </div>
                  }
                  getPopupContainer={() => document.querySelector('.agent-details-modal') as HTMLElement}
                  placement='topRight'
                  mouseEnterDelay={0}
                  onOpenChange={(open) => {
                    if (open) {
                      setIsCopied(false)
                    }
                  }}
                >
                  <p onClick={() => copyToClipboard(blogPrompt)} style={{ cursor: 'pointer' }}>
                    {blogPrompt}
                  </p>
                </Tooltip>
              </div>
            )}
            <div className='detail-item'>
              <h4>DID:</h4>
              <p>{did}</p>
            </div>
          </div>
        </Modal>
      </div>
    </>
  )
}

export default Independent
