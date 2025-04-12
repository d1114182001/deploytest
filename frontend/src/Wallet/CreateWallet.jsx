import React, { useState } from 'react';
import { useNavigate} from "react-router-dom";
import { addWallet } from '../api'; 

function CreateWallet() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [mnemonic2, setMnemonic] = useState();
    const [address, setAddress] = useState();

    const navigate = useNavigate();

    const handleCreateWallet = async () => {
        setLoading(true);
        setError(null);

        const userId = sessionStorage.getItem('userId'); 
        if (!userId) {
            setError('User ID not found. Please log in again.');
            setLoading(false);
            return;
        }

        try {
            const newWallet = await addWallet(userId); // 傳送 userId
            setMnemonic(newWallet.mnemonic2);
            setAddress(newWallet.address);
        } catch (err) {
            setError('Failed to create wallet');
            console.error(err);
        }

        setLoading(false);
    };

    const handleBackToWallet = () => {
        navigate('/wallet'); 
    };

    return (
        <div>
            <h2>Create New Wallet</h2>
            <button onClick={handleCreateWallet} disabled={loading}>
                {loading ? 'Creating...' : 'Create Wallet'}
            </button>

            {error && <p style={{ color: 'red' }}>{error}</p>}
            {mnemonic2 && (
                <div>
                    <h3>助記詞：</h3>
                    <p>{mnemonic2}</p>
                </div>
            )}
            
            {address && (
                <div>
                    <h3>地址：</h3>
                    <p>{address}</p>
                </div>
            )}
            
            <button onClick={handleBackToWallet}>回到錢包</button>
        </div>
    );
}

export default CreateWallet;

