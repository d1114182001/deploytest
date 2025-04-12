import React, { useState, useEffect} from 'react';
import { useNavigate } from 'react-router-dom';
import { recoverWallet } from '../api';

const RestoreWallet = () => {
  const [mnemonic, setMnemonic] = useState('');
  const [wallet, setWallet] = useState(null);
  const [error, setError] = useState('');
  const userId = sessionStorage.getItem('userId'); 
  const navigate = useNavigate();

  const handleRecover = async () => {
    
    try {
      const recovered = await recoverWallet(mnemonic,userId); // 調用 API
      setWallet(recovered);
      setError('');
    } catch (err) {
      setError('恢復失敗');
      setWallet(null);
    }
  };

  // 當 wallet 更新時觸發跳轉
  useEffect(() => {
    if (wallet) {
      const timer = setTimeout(() => {
        navigate('/wallet'); 
      }, 10000); // 10000 毫秒 = 10 秒

      // 清除計時器，防止內存洩漏
      return () => clearTimeout(timer);
    }
  }, [wallet, navigate]); // 監聽 wallet 和 navigate

  return (
    <div>
      <h2>恢復 HD 錢包</h2>
      <div>
        <label>輸入助記詞:</label>
        <textarea
          value={mnemonic}
          onChange={(e) => setMnemonic(e.target.value)}
          placeholder="輸入 12 個單詞的助記詞"
          rows="2"
          cols="50"
        />
      </div>
      <button onClick={handleRecover}>恢復錢包</button>

      {error && <p style={{ color: 'red' }}>錯誤: {error}</p>}
      {wallet && (
        <div>
          <h3>恢復的錢包資訊</h3>
          <h4>地址: {wallet.address}</h4>
          <h4>助記詞: {wallet.mnemonic}</h4>
          <p style={{color:'red',fontSize:30,}}>一旦成功，本頁將在10秒內跳轉!!</p>
        </div>
      )}
    </div>
  )
}

export default RestoreWallet