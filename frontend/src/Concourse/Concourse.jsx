import React, { useState, useEffect } from 'react';
import "./Concourse.css"; // 引入 CSS
import { Link } from 'react-router-dom';

const Concourse = () => {
    const [transactions, setTransactions] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const fetchTransactions = () => {
            fetch("http://localhost:3001/extract-transactions")
                .then((res) => res.json())
                .then((data) => setTransactions(data))
                .catch((error) => console.error("載入交易紀錄錯誤:", error));
        };

        fetchTransactions(); // 先載入一次
        const interval = setInterval(fetchTransactions, 5000); // 每 5 秒更新一次

        return () => clearInterval(interval); // 組件卸載時清除計時器，避免記憶體洩漏
    }, []);

    // 篩選交易紀錄
    const filteredTransactions = transactions.filter(tx =>
        tx.tx_hash.includes(searchQuery) ||
        tx.sender_address.includes(searchQuery) ||
        tx.recipient_address.includes(searchQuery)
    );

    return (
        <div className="concourse-container">
            <Link to="/wallet" className="wallet-btn">回到我的錢包</Link>

            <h2>交易大廳</h2>
            
            {/* 搜尋輸入框 */}
            <input
                type="text"
                placeholder="搜尋交易哈希、發送者或接收者"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
            />

            <table>
                <thead>
                    <tr>
                        <th>交易哈希</th>
                        <th>發送者</th>
                        <th>接收者</th>
                        <th>金額 (BTC)</th>
                        <th>時間</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredTransactions.map((tx, index) => (
                        <tr key={index}>
                            <td>{tx.tx_hash.substring(0, 10) + "..."}</td>
                            <td>{tx.sender_address.substring(0, 6) + "..."}</td>
                            <td>{tx.recipient_address.substring(0, 6) + "..."}</td>
                            <td>{tx.amount}</td>
                            <td>{tx.timestamp}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default Concourse;
