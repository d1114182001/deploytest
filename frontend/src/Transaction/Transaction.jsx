import React, { useState, useEffect } from 'react';
import { useParams,useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { sendTransaction, getAllWallets, getPrivateKey, completeTransaction, signTransaction } from '../api';
import "./Transaction.css";


const Transaction = () => {
  const { address } = useParams();
  const [wallets, setWallets] = useState([]);
  const [senderAddress, setSenderAddress] = useState(address || '');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [transactionDetails, setTransactionDetails] = useState(null);
  const [password, setPassword] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [privateKey, setPrivateKey] = useState('');
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [finalSignature, setFinalSignature] = useState('');
  const [showCompleteButton, setShowCompleteButton] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [showFinalizeButton, setShowFinalizeButton] = useState(false);
  const [showTransactionHash, setShowTransactionHash] = useState(false);
  const [formHidden, setFormHidden] = useState(false); // 控制表单是否隐藏
  const [isTransactionSubmitted, setIsTransactionSubmitted] = useState(false);
  const navigate = useNavigate();
  const [showBackButton, setShowBackButton] = useState(false); 


  useEffect(() => {
    const fetchWallets = async () => {
      try {
        const token = sessionStorage.getItem('token');
        const walletData = await getAllWallets(token);
        setWallets(walletData);
        if (!senderAddress && walletData.length > 0) {
          setSenderAddress(walletData[0].address);
        }
      } catch (error) {
        toast.error("無法載入錢包列表");
      }
    };
    fetchWallets();
  }, [senderAddress]);

  const handleSendTransaction = async () => {
    if (!senderAddress || !recipientAddress || !amount) {
      toast.error("請選擇發送地址並填寫接收地址和金額");
      return;
    }

    setLoading(true);
    try {
      const response = await sendTransaction(senderAddress, recipientAddress, amount);
      // 獲取當前時間並格式化
      const timestamp = new Date().toLocaleString();
      setTransactionDetails({
        sender: response.senderAddress,
        recipient: response.recipientAddress,
        amount: response.amount,
        transactionHash: response.transactionHash,
        timestamp: timestamp // 添加時間戳
      });
      toast.success("交易已初始化");
      setFormHidden(true); 
    } catch (error) {
      toast.error(error.message || "交易初始化失敗");
    } finally {
      setLoading(false);
    }
  };

  const verifyPassword = async () => {
    try {
      const response = await getPrivateKey(senderAddress, password);
      setPrivateKey(response.privateKey);
      setShowPrivateKey(true);
      setShowPasswordInput(false);
      setShowCompleteButton(true);
      toast.success("密碼驗證成功");
    } catch (error) {
      toast.error(error.message || "密碼錯誤");
    }
  };

  
  const handleSignTransaction = async () => {
    if (isTransactionSubmitted || !transactionDetails) return;
    setLoading(true);
    try {
      const response = await signTransaction(
        transactionDetails.sender,
        transactionDetails.recipient,
        transactionDetails.amount,
        transactionDetails.transactionHash,
        false // 不提交，只簽名
      );
      
      if (response.signature) {
        setFinalSignature(response.signature);
        setShowCompleteButton(false);
        setShowFinalizeButton(true);
        toast.success("簽名生成成功");
      } else {
        throw new Error("簽名未生成");
      }

    } catch (error) {
      toast.error(error.message || "簽名失敗");
    }finally {
      setLoading(false);
    }
  };

  const handleFinalizeTransaction = async () => {
    if (isTransactionSubmitted || !finalSignature) return;
    setLoading(true);
    try {
      const response = await completeTransaction(
        transactionDetails.sender,
        transactionDetails.recipient,
        transactionDetails.amount,
        transactionDetails.transactionHash,
        finalSignature,
        true // 最終提交
      );
      
      if (response.transactionId) {
        setTransactionId(response.transactionId);
        setIsTransactionSubmitted(true);
        setShowFinalizeButton(false);
        setShowBackButton(true);
        toast.success("交易完成");
      } else {
        throw new Error("交易未完成");
      }

    } catch (error) {
      toast.error(error.message || "交易完成失敗");
    } finally {
      setLoading(false);
    }
  };

  const handleShowTransactionHash = () => {
    setShowTransactionHash(true);
    setShowPasswordInput(true); // 在這裡顯示密碼輸入框
    toast.info("交易訊息摘要已顯示，請輸入密碼");
  };

  const handleBackToWallet = () => {
    navigate('/wallet'); // 跳到我的錢包頁面
  };

  return (
    <div className="transaction-container">
      <h2>比特幣交易</h2>
      {!formHidden && (  // 如果formHidden为false，顯示表單
        <>
          <div className="form-group">
            <label>從錢包地址</label>
            <select value={senderAddress} onChange={(e) => setSenderAddress(e.target.value)} disabled={loading}>
              {wallets.map((wallet) => (
                <option key={wallet.address} value={wallet.address}>
                  {wallet.address} (餘額: {wallet.balance} BTC)
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>接收者地址</label>
            <input
              type="text"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              placeholder="輸入接收者的比特幣地址"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>金額 (BTC)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="輸入發送金額 (BTC)"
              step="0.00000001"
              disabled={loading}
            />
          </div>

          <button onClick={handleSendTransaction} className="send-btn" disabled={loading}>
            {loading ? "發送中..." : "發送比特幣"}
          </button>
        </>
      )}

      {transactionDetails && (
        <div className="transaction-details">
          <h3>交易詳情</h3>
          <p><strong>發送者：</strong> {transactionDetails.sender}</p>
          <p><strong>接收者：</strong> {transactionDetails.recipient}</p>
          <p><strong>發送金額：</strong> {transactionDetails.amount} BTC</p>
          <p><strong>發送時間：</strong> {transactionDetails.timestamp}</p>
          {!showTransactionHash ? (
            <button onClick={handleShowTransactionHash} className="show-hash-btn">
              交易訊息摘要
            </button>
          ) : (
            <p><strong>交易訊息摘要：</strong> {transactionDetails.transactionHash}</p>
          )}
        </div>
      )}

      {showPasswordInput && (
        <div className="password-input">
          <label>請輸入密碼</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button onClick={verifyPassword}>驗證</button>
        </div>
      )}

      {showPrivateKey && (
        <div className="private-key">
          <p><strong>私鑰：</strong> {privateKey}</p>
        </div>
      )}

      {finalSignature && (
        <div className="signature-result">
          <p><strong>簽名成功 </strong></p>
          <p><strong>交易簽名：</strong> {finalSignature}</p>
        </div>
      )}

      {showCompleteButton && (
        <div className="key-lock-container">
          <div
            className="key"
            draggable="true"
            onDragStart={(e) => e.dataTransfer.setData('text/plain', 'key')}
          >
            🔑
          </div>
          <div
            className="lock"
            onDrop={(e) => {
              e.preventDefault();
              handleSignTransaction();
            }}
            onDragOver={(e) => e.preventDefault()}
          >
            🔒
          </div>
        </div>
      )}

      {showFinalizeButton && (
        <button onClick={handleFinalizeTransaction} className="finalize-btn">
          完成交易
        </button>
      )}

      {transactionId && (
        <div className="transaction-success">
          <p><strong>交易哈希值 (TxID)：</strong> {transactionId}</p>
          <p><strong>交易資料完成</strong></p>
        </div>
      )}

      {showBackButton && (
        <button onClick={handleBackToWallet} className="finalize-btn">
          回到我的錢包
        </button>
      )}
    </div>
  );
};

export default Transaction;
