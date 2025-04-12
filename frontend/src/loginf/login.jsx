import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // 引入 useNavigate
import { loginUser } from '../api'; // 引入 api.js 中的 loginUser 函數
import './login.css'; // 引入登入css

function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate(); // 創建 navigate 實例

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            const data = await loginUser(username, password); // 調用 api.js 中的函數
            setSuccess(data.message || 'Login successful!');
            sessionStorage.setItem('token', data.token);
            sessionStorage.setItem('userId', data.userId); 
            // 登錄成功后跳轉到錢包管理頁面
            navigate('/wallet');
        } catch (err) {
            setError(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <form className="login-form" onSubmit={handleLogin}>
                <h2 className="login-title">Login</h2>

                {error && <div className="login-message error">{error}</div>}
                {success && <div className="login-message success">{success}</div>}

                <div className="input-group">
                    <label>Username</label>
                    <input
                        type="text"
                        placeholder="Enter username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                </div>

                <div className="input-group">
                    <label>Password</label>
                    <input
                        type="password"
                        placeholder="Enter password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>

                <button type="submit" className={`login-button ${loading ? 'disabled' : ''}`} disabled={loading}>
                    {loading ? 'Logging in...' : 'Login'}
                </button>

                {/* 添加註冊連結 */}
                <p className="register-link">
                    Don't have an account? <span onClick={() => navigate('/register')} className="link">Register here</span>
                </p>

                {/* 添加忘记密碼連結 */}
                <p className="forgot-password-link">
                    <span onClick={() => navigate('/forgot-password')} className="link">Forgot password?</span>
                </p>
            </form>
        </div>
    );
}

export default Login;
