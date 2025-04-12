import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom"; 

import Wallet from "./pages/Wallet";
import CreateWallet from "./Wallet/CreateWallet";
import ForgotPassword from "./register/forgot-password";
import ResetPassword from "./register/reset-password";
import RestoreWallet from "./Wallet/RestoreWallet";

import Login from "./loginf/login"; // 引入 Login
import Register from "./register/register"; // 引入 Register 
import Transaction from "./Transaction/Transaction";
import Concourse from "./Concourse/Concourse"; // 引入交易大廳 

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />, // 在 `Layout` 加入全局導航列
    children: [
      { path: "", element: <Login /> }, // 首頁為 Login 頁面
      { path: "register", element: <Register /> },
      { path: "transaction/:address", element: <Transaction /> }, 
      { path: "concourse", element: <Concourse /> }, //加入交易大廳路由 
      {
        path: "wallet",
        element: <WalletLayout />, // Wallet 內部管理自己的子路由
        children: [
          { path: "", element: <Wallet /> },
          { path: "create", element: <CreateWallet /> },      
          { path: "restore", element: <RestoreWallet /> },
        ],
      },
      { path: "forgot-password", element: <ForgotPassword /> },
      { path: "reset-password", element: <ResetPassword /> },
    ],
  },
]);

function Layout() {
  return (
    <div>
      <Outlet />
    </div>
  );
}

function WalletLayout() {
  return (
    <div>
      <Outlet /> {/* 這裡會根據當前路由渲染 Wallet 或 CreateWallet */}
    </div>
  );
}

const App = () => {
  return <RouterProvider router={router} />;
};

export default App;
