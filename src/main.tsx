import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import "./index.less";
import { createClient, cacheExchange, fetchExchange, Provider } from "urql";
import { WhiskSdkProvider } from "@paperclip-labs/whisk-sdk";
import { IdentityResolver } from "@paperclip-labs/whisk-sdk/identity";

// Create GraphQL client
const client = createClient({
  url: "https://gateway.thegraph.com/api/ab3d8f4af89bb707816522616dd717fd/subgraphs/id/5qcR6rAfDMZCVGuZ6DDois7y4zyXqsyqvaqhE6NRRraW",
  exchanges: [cacheExchange, fetchExchange],
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  // <React.StrictMode><WhiskSdkProvider
  <WhiskSdkProvider
    apiKey={"d327a2a1-6b0b-4708-aeec-d9d220a91ef7"}
    config={{
      identity: {
        // Specify the resolver order for sequential resolution.
        // This will be used as defaults if no resolvers are provided in the component or hook.
        resolverOrder: [
          IdentityResolver.Ens,
          IdentityResolver.Farcaster,
          IdentityResolver.Base,
          IdentityResolver.Nns,
          IdentityResolver.Uni,
          IdentityResolver.Lens,
          IdentityResolver.World,
        ],

        // Optional: Override specific addresses with custom names or avatars.
        overrides: {},
      },
    }}
  >
    <Provider value={client}>
      <HashRouter>
        <App />
      </HashRouter>
    </Provider>
  </WhiskSdkProvider>
  // </React.StrictMode>
);
