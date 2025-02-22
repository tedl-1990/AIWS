import { createConfig, configureChains, mainnet } from 'wagmi'
import { MetaMaskConnector } from 'wagmi/connectors/metaMask'
import { publicProvider } from 'wagmi/providers/public'
import { BaseWalletService } from './base'
import { BaseWalletServiceProps, WalletInfo, WalletType, EthereumProvider } from './types'

export class MetaMaskWalletService extends BaseWalletService {
  private connector: MetaMaskConnector
  
  constructor(props: BaseWalletServiceProps) {
    super(props)
    
    const { chains, publicClient } = configureChains(
      [mainnet],
      [publicProvider()]
    )

    const config = createConfig({
      autoConnect: true,
      connectors: [
        new MetaMaskConnector({ 
          chains,
          options: {
            shimDisconnect: true,
            UNSTABLE_shimOnConnectSelectAccount: true,
          }
        })
      ],
      publicClient
    })  
    console.log(config.connectors[0])

    this.connector = config.connectors[0] as MetaMaskConnector
    this.setupListeners()
  }

  get type() {
    return WalletType.MetaMask
  }

  private setupListeners() {
    this.connector.on('change', ({ account, chain }) => {
      if(account) {
        this.props.onAccountsChange?.([account])
      }
      if(chain?.id) {
        this.props.onChainChange?.(chain.id)
      }
    })

    this.connector.on('disconnect', () => {
      this.setConnected(false)
      this.setInfo(null)
      this.props.onDisconnect?.()
    })
  }

  async connect(): Promise<WalletInfo> {
    const provider = await this.connector.getProvider()
    if (!provider?.isMetaMask) {
      throw new Error('MetaMask not found')
    }

    const { account, chain } = await this.connector.connect()
    
    const info: WalletInfo = {
      address: account,
      chainId: chain?.id
    }

    this.setConnected(true)
    this.setInfo(info)
    this.setProvider(provider as EthereumProvider)

    return info
  }

  async disconnect(): Promise<void> {
    this.setConnected(false)
    this.setInfo(null)
    this.setProvider(null)
    this.props.onDisconnect?.()
  }

  async signMessage(message: string): Promise<string> {
    if (!this.isConnected || !this.info?.address) {
      throw new Error('Wallet not connected')
    }
    
    return this.provider?.request({
      method: 'personal_sign',
      params: [message, this.info.address]
    })
  }
} 