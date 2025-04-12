import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { resetPassword } from "../api"; 

const ResetPassword = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");

  // 從 URL 中獲取令牌
  const queryParams = new URLSearchParams(location.search);
  const token = queryParams.get("token");

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!token) {
      setMessage("無效的重置令牌。");
      return;
    }

    try {
      const response = await resetPassword(token, newPassword);
      setMessage(response.message);
      setTimeout(() => navigate("/"), 2000); // 重置成功後2秒跳轉到主頁
    } catch (error) {
      setMessage(error.message || "密碼重置失敗，請重試。");
    }
  };

  return (
    <div>
      <h2>重置密碼</h2>
      <form onSubmit={handleResetPassword}>
        <div>
          <label>新密碼:</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">提交新密碼</button>
      </form>

      {message && <p>{message}</p>}
    </div>
  );
};

export default ResetPassword;