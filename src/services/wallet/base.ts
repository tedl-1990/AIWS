import { BaseWalletServiceProps, IWalletService, WalletInfo, WalletType, WalletProvider } from './types'

export abstract class BaseWalletService implements IWalletService {
  protected _isConnected = false
  protected _info: WalletInfo | null = null
  protected _provider: WalletProvider | null = null

  constructor(protected props: BaseWalletServiceProps) {}

  get isConnected() {
    return this._isConnected
  }

  get info() {
    return this._info
  }

  get provider() {
    return this._provider
  }

  abstract get type(): WalletType

  abstract connect(): Promise<WalletInfo>
  abstract disconnect(): Promise<void>
  abstract signMessage(message: string): Promise<string>

  protected setConnected(connected: boolean) {
    this._isConnected = connected
  }

  protected setInfo(info: WalletInfo | null) {
    this._info = info
  }

  protected setProvider(provider: WalletProvider | null) {
    this._provider = provider
  }
} 