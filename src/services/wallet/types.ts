/* eslint-disable @typescript-eslint/no-explicit-any */
export enum WalletType {
  MetaMask = 'MetaMask',
  Phantom = 'Phantom'
}

export interface EthereumProvider {
  request: (args: { method: string; params?: any[] }) => Promise<any>
  on: (eventName: string, handler: (...args: any[]) => void) => void
  removeListener: (eventName: string, handler: (...args: any[]) => void) => void
}

export interface PhantomProvider {
  connect: () => Promise<{ publicKey: { toString: () => string } }>
  disconnect: () => Promise<void>
  on: (event: string, callback: (args: any) => void) => void
  signMessage: (message: Uint8Array) => Promise<{ signature: string }>
  solana?: any
}

export type WalletProvider = EthereumProvider | PhantomProvider

export interface WalletInfo {
  address: string
  chainId?: number
  balance?: string
}

export interface BaseWalletServiceProps {
  onAccountsChange?: (accounts: string[]) => void
  onChainChange?: (chainId: number) => void
  onDisconnect?: () => void
}

export interface IWalletService {
  type: WalletType
  isConnected: boolean
  info: WalletInfo | null
  provider: WalletProvider | null
  
  connect(): Promise<WalletInfo>
  disconnect(): Promise<void> 
  signMessage(message: string): Promise<string>
} 