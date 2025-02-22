import { Routes, Route } from "react-router-dom";
import AIAgent from "./pages/AIAgent";
import AgentList from "./pages/AgentList";
import { ConfigProvider, theme } from "antd";
import { message } from "antd";
import { RecoilRoot } from 'recoil';

message.config({
  maxCount: 1,
  top: 24,
  duration: 3,
});

function App() {
  return (
    <RecoilRoot>
        <ConfigProvider
          theme={{
            algorithm: theme.darkAlgorithm,
            token: {
              colorPrimary: "#F0B90B",
              colorBgContainer: "#141414",
              colorBgElevated: "#1f1f1f",
              colorText: "#ffffff",
              colorTextSecondary: "rgba(255, 255, 255, 0.65)",
              colorBgLayout: "#141414",
              colorBorder: "#303030",
              colorPrimaryBorder: "#F0B90B",
              colorPrimaryHover: "#F0B90B",
              colorPrimaryActive: "#F0B90B",
            },
            components: {
              Button: {
                defaultBorderColor: "#F0B90B",
                defaultColor: "#F0B90B",
                colorBorder: "#F0B90B",
                defaultHoverBorderColor: "#F0B90B",
                defaultHoverColor: "#F0B90B",
              },
            },
          }}
        >
          <div>
            <Routes>
              <Route path="/" element={<AgentList />} />
              <Route path="/ai" element={<AIAgent />} />
              <Route path="*" element={<AgentList />} />
            </Routes>
          </div>
        </ConfigProvider>
    </RecoilRoot>
  );
}

export default App;
