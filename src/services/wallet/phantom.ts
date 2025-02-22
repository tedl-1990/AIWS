import { BaseWalletService } from './base'
import { BaseWalletServiceProps, WalletInfo, WalletType, PhantomProvider } from './types'

declare global {
  interface Window {
    phantom?: {
      solana?: PhantomProvider
    }
  }
}

export class PhantomWalletService extends BaseWalletService {
  protected _provider: PhantomProvider | null = null

  constructor(props: BaseWalletServiceProps) {
    super(props)
    this._provider = window.phantom?.solana || null
    
    if (this._provider) {
      this.setupListeners()
    }
  }

  get type() {
    return WalletType.Phantom
  }

  private setupListeners() {
    if (!this._provider) return

    this._provider.on('accountChanged', (publicKey: string) => {
      if (publicKey) {
        this.props.onAccountsChange?.([publicKey])
      }
    })

    this._provider.on('disconnect', () => {
      this.setConnected(false) 
      this.setInfo(null)
      this.props.onDisconnect?.()
    })
  }

  async connect(): Promise<WalletInfo> {
    if (!this._provider) {
      throw new Error('Phantom provider not found')
    }

    try {
      const resp = await this._provider.connect()
      const info: WalletInfo = {
        address: resp.publicKey.toString()
      }
      
      this.setConnected(true)
      this.setInfo(info)
      
      return info
    } catch {
      throw new Error('Failed to connect to Phantom')
    }
  }

  async disconnect(): Promise<void> {
    if (!this._provider) return
    
    await this._provider.disconnect()
    this.setConnected(false)
    this.setInfo(null)
  }

  async signMessage(message: string): Promise<string> {
    if (!this.isConnected || !this.info?.address || !this._provider) {
      throw new Error('Wallet not connected')
    }

    try {
      const encodedMessage = new TextEncoder().encode(message)
      const signedMessage = await this._provider.signMessage(encodedMessage)
      return signedMessage.signature
    } catch {
      throw new Error('Failed to sign message')
    }
  }
} 