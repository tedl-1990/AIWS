import { BaseWalletServiceProps, WalletType } from './types'
import { MetaMaskWalletService } from './metamask'
import { PhantomWalletService } from './phantom'

export class WalletService {
  private static instance: WalletService
  private currentWallet: MetaMaskWalletService | PhantomWalletService | null = null

  private constructor() {}

  static getInstance() {
    if (!WalletService.instance) {
      WalletService.instance = new WalletService()
    }
    return WalletService.instance
  }

  init(type: WalletType, props: BaseWalletServiceProps) {
    switch(type) {
      case WalletType.MetaMask:
        this.currentWallet = new MetaMaskWalletService(props)
        break
      case WalletType.Phantom:
        this.currentWallet = new PhantomWalletService(props)
        break
      default:
        throw new Error('Unsupported wallet type')
    }
  }

  get wallet() {
    if (!this.currentWallet) {
      throw new Error('Wallet not initialized')
    }
    return this.currentWallet
  }
}

export const walletService = WalletService.getInstance()

export * from './types' 