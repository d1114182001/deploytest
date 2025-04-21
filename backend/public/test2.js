

app.post("/create-wallet", async (req, res) => {
    const { user_id } = req.body;
  
    try {
      const { mnemonic2, seed } = generateMnemonicAndSeed();
      const hdPrivateKey = bitcore.HDPrivateKey.fromSeed(seed, network);
      const address = deriveNewAddress(hdPrivateKey, 0, 0);
  
      // 引用 Cloud Storage
      const storageRef = firebase.storage().ref();
  
      // 建立儲存錢包資料的路徑 (例如：wallets/user_id/wallet.json)
      const walletPath = `wallets/${user_id}/wallet.json`;
      const walletRef = storageRef.child(walletPath);
  
      // 錢包資料，將會儲存在 Cloud Storage 中
      const walletData = {
        user_id: user_id,
        mnemonic: mnemonic2,
        addresses: [
          {
            path: address.path,
            address: address.address,
            privateKey: address.privateKey,
            publicKey: address.publicKey,
          },
        ],
      };
  
      // 將 walletData 轉換為 JSON 字串
      const walletString = JSON.stringify(walletData);
      // 從 JSON 字串建立 Blob
      const walletBlob = new Blob([walletString], { type: "application/json" });
  
      // 上傳 Blob 到 Cloud Storage
      await walletRef.put(walletBlob);
  
      res.json({ mnemonic2, address: address.address });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to create wallet." });
    }
  });
  