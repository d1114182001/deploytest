import React, { useState } from "react";
import { requestPasswordReset } from "../api"; 

const ForgotPassword = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const isEmailValid = /\S+@\S+\.\S+/;

  const handleForgotPassword = async (e) => {
    e.preventDefault();

    if (!username) {
      setMessage("請輸入帳號。");
      return;
    }

    if (!isEmailValid.test(email)) {
      setMessage("請輸入有效的電子郵件地址。");
      return;
    }

    if (phone.length < 10) {
      setMessage("請輸入有效的電話號碼。");
      return;
    }

    setLoading(true);

    try {
      const response = await requestPasswordReset(username, email, phone);
      setMessage(response.resetLink);
    } catch (error) {
      setMessage(error.message || "無法找到匹配的用戶或發生了錯誤。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>重置密碼</h2>
      <form onSubmit={handleForgotPassword}>
        <div>
          <label>帳號:</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <label>電子郵件:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label>電話:</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>
        {loading ? (
          <p>載入中...</p>
        ) : (
          <button type="submit">請求重置密碼</button>
        )}
      </form>

      {message && (
        <p>
          {message.startsWith("http") ? (
            <>
              請點擊以下連結重置密碼:{" "}
              <a href={message} target="_blank" rel="noopener noreferrer">
                {message}
              </a>
            </>
          ) : (
            message
          )}
        </p>
      )}
    </div>
  );
};

export default ForgotPassword;