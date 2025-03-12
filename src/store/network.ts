import { atom } from "recoil";
import { ENetwork } from "@/services/network";

const UrlNetwork = () => {
  const url = window.location.href;
  if (url.includes("sol.build")) {
    return ENetwork.Solana;
  }
  return ENetwork.Ethereum;
};

export const networkState = atom<ENetwork>({
  key: "networkState",
  default:
    (Number(localStorage.getItem("network_type")) as ENetwork) || UrlNetwork(),
});

export const isWalletConnectedState = atom<boolean>({
  key: "isWalletConnectedState",
  default: !!localStorage.getItem("Authentication-Tokens"),
});
