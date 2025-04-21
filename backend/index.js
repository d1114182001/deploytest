const express = require("express");
const mysql = require("mysql2");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const cors = require("cors");
const bitcore = require("bitcore-lib");
const Mnemonic = require('bitcore-mnemonic');
const crypto = require('crypto');
const path = require('path');

require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

// 建立 MySQL 連線
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err.message);
  } else {
    console.log("Connected to the database successfully.");
  }
});
const network = bitcore.Networks.mainnet;

// JWT 驗證中間件
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "未提供授權標頭" });

  jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret", (err, decoded) => {
    if (err) return res.status(401).json({ message: "無效的授權標頭" });
    req.userId = decoded.userId;
    next();
  });
};


function generateMnemonicAndSeed() {
  const mnemonic = new Mnemonic(128);
  const mnemonic2 =mnemonic.toString();
  const seed = mnemonic.toSeed();
  return { mnemonic2, seed };
}

function deriveNewAddress(root, accountIndex = 0, addressIndex = 0) {
  const path = `m/44'/0'/${accountIndex}'/0/${addressIndex}`;
  const child = root.deriveChild(path);
  return {
    path,
    address: child.privateKey.toAddress(network).toString(),
    privateKey: child.privateKey.toWIF(),
    publicKey: child.publicKey.toString('hex')
  };
}


// 註冊 API
app.post("/register", async (req, res) => {
  const { username, password, email, phone } = req.body;

  if (!username || !password || !email || !phone) {
    return res.status(400).json({ message: "請填寫所有欄位" });
  }

  try {
    const checkUserSql = "SELECT * FROM users WHERE username = ?";
    db.query(checkUserSql, [username], async (err, results) => {
      if (err) return res.status(500).json({ message: "伺服器錯誤" });
      if (results.length > 0) return res.status(400).json({ message: "使用者名稱已存在" });

      const hashedPassword = await bcrypt.hash(password, 10);
      const sql = "INSERT INTO users (username, password, email, phone) VALUES (?, ?, ?, ?)";
      db.query(sql, [username, hashedPassword, email, phone], (err) => {
        if (err) {
          console.error("插入使用者錯誤:", err);
          return res.status(500).json({ message: "註冊失敗" });
        }
        res.json({ message: "註冊成功" });
      });
    });
  } catch (error) {
    console.error("註冊錯誤:", error);
    res.status(500).json({ message: "伺服器錯誤" });
  }
});

// 登入 API
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  const sql = "SELECT * FROM users WHERE username = ?";
  db.query(sql, [username], async (err, results) => {
    if (err) return res.status(500).json({ message: "伺服器錯誤" });
    if (results.length === 0) return res.status(401).json({ message: "用戶不存在" });

    const user = results[0];
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) return res.status(401).json({ message: "密碼錯誤" });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || "your_jwt_secret", { expiresIn: "1h" });
    res.json({ success: true, token, userId: user.id }); // 返回 userId
  });
});

// 創建錢包 API
app.post("/create-wallet", (req, res) => {
  const { user_id } = req.body; // 從請求中獲取 user_id
  
  try {
    const { mnemonic2, seed } = generateMnemonicAndSeed();
    const hdPrivateKey = bitcore.HDPrivateKey.fromSeed(seed, network);
    const address = deriveNewAddress(hdPrivateKey, 0, 0);
    
    res.json({ mnemonic2, address: address.address});
    
    const walletsql = "INSERT INTO wallets (user_id, mnemonic) VALUES (?, ?)";
    db.query(walletsql, [user_id, mnemonic2], (err,result) => {
      if (err) return res.status(500).json({ error: "Failed to create wallet." });
      const walletId = result.insertId; // 取得新增加的 wallet ID
      

      const addrsql ="INSERT INTO addresses (wallet_id,paths,address,private_key,public_key,user_id) VALUES (?, ?, ?, ?, ?, ?)";
      db.query(addrsql, [walletId, address.path, address.address, address.privateKey, address.publicKey,user_id], (err) => {
        if (err) return res.status(500).json({ error: "Failed to insert address." });  
      });
    });
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create wallet." });
  }
});


// 取得特定使用者的錢包 API 
app.get("/wallets", (req, res) => {
  // 從請求中獲取 JWT token
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "未提供授權標頭" });

  // 驗證 token
  jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret", (err, decoded) => {
    if (err) return res.status(401).json({ message: "無效的授權標頭" });

    const userId = decoded.userId; // 獲取用户 ID

    // 根據用户 ID 查詢錢包訊息
    const sql = "SELECT * FROM addresses WHERE user_id = ?";
    db.query(sql, [userId], (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results); // 返回該用户的所有錢包訊息
    });
  });
});

// 原有 /send-transaction 修改如下
app.post("/send-transaction", verifyToken, async (req, res) => {
  const { senderAddress, recipientAddress, amount } = req.body;
  const userId = req.userId;

  if (!senderAddress || !recipientAddress || !amount) {
    return res.status(400).json({ message: "請提供發送地址、收款地址和金額" });
  }

  try {
    //const sql = "SELECT * FROM wallets WHERE user_id = ? AND address = ?";
    const sql = "SELECT * FROM addresses WHERE user_id = ? AND address = ?";
    db.query(sql, [userId, senderAddress], async (err, results) => {
      if (err) return res.status(500).json({ message: "伺服器錯誤" });
      if (results.length === 0) {
        return res.status(404).json({ message: "未找到指定的發送錢包或無權限" });
      }

      const wallet = results[0];
      const amountInBTC = parseFloat(amount);

      if (wallet.balance === null || wallet.balance < amountInBTC) {
        return res.status(400).json({ message: "餘額不足" });
      }

      // 加入時間戳
      const timestamp = Date.now();

      // 建立交易內容
      const transactionContent = {
        senderAddress,
        recipientAddress,
        amount: amountInBTC,
        timestamp,
      };

      // 生成交易訊息摘要（SHA-256）
      const transactionHash = crypto.createHash('sha256')
        .update(JSON.stringify(transactionContent))
        .digest('hex');

      // 這裡不直接簽名和完成交易，只返回初始數據
      res.json({
        message: "交易已初始化",
        senderAddress,
        recipientAddress,
        amount: amountInBTC,
        timestamp,
        transactionHash,
      });
    });
  } catch (error) {
    console.error("交易處理錯誤:", error);
    res.status(500).json({ message: "交易初始化失敗" });
  }
});

app.post("/get-private-key", verifyToken, async (req, res) => {
  const { senderAddress, password } = req.body;
  const userId = req.userId;

  try {
    // 驗證密碼
    //const sqlUser = "SELECT * FROM users WHERE id = ?";
    const sqlUser = "SELECT * FROM users WHERE id = ?";
    db.query(sqlUser, [userId], async (err, userResults) => {
      if (err) return res.status(500).json({ message: "伺服器錯誤" });
      if (userResults.length === 0) return res.status(404).json({ message: "用戶不存在" });

      const user = userResults[0];
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) return res.status(401).json({ message: "密碼錯誤" });

      // 獲取私鑰
      //const sqlWallet = "SELECT private_key FROM wallets WHERE user_id = ? AND address = ?";
      const sqlWallet = "SELECT private_key FROM addresses WHERE user_id = ? AND address = ?";
      db.query(sqlWallet, [userId, senderAddress], (err, walletResults) => {
        if (err) return res.status(500).json({ message: "伺服器錯誤" });
        if (walletResults.length === 0) return res.status(404).json({ message: "錢包不存在" });

        const privateKey = walletResults[0].private_key;
        res.json({ privateKey });
      });
    });
  } catch (error) {
    console.error("獲取私鑰錯誤:", error);
    res.status(500).json({ message: "伺服器錯誤" });
  }
});

app.post("/sign-transaction", verifyToken, (req, res) => {
  const { senderAddress, recipientAddress, amount, transactionHash,finalize } = req.body;
  const userId = req.userId;

  const sqlSender = "SELECT * FROM addresses WHERE user_id = ? AND address = ?";
  db.query(sqlSender, [userId, senderAddress], (err, senderResults) => {
    if (err) {
      console.error("查詢發送者錯誤:", err);
      return res.status(500).json({ message: "伺服器錯誤" });
    }
    if (senderResults.length === 0) {
      return res.status(404).json({ message: "發送錢包不存在" });
    }

    const wallet = senderResults[0];
    const privateKey = new bitcore.PrivateKey(wallet.private_key);
    const amountInBTC = parseFloat(amount);

    if (wallet.balance < amountInBTC) {
      return res.status(400).json({ message: "餘額不足" });
    }

    // 生成簽名
    const message = new bitcore.Message(transactionHash);
    const signature = message.sign(privateKey);
    const isValidSignature = message.verify(senderAddress, signature);
    if (!isValidSignature) {
      return res.status(400).json({ message: "簽名無效" });
    }

    // 完整的交易內容（包括簽名）
    const fullTransactionContent = {
      senderAddress,
      recipientAddress,
      amount: amountInBTC,
      timestamp: Date.now(), // 使用當前時間戳，或從前端傳入
      signature,
    };

    // 序列化交易內容並生成最終 TxID（雙重 SHA-256）
    const serializedTx = JSON.stringify(fullTransactionContent);
    const firstHash = crypto.createHash('sha256').update(serializedTx).digest();
    const finalTransactionHash = crypto.createHash('sha256').update(firstHash).digest('hex');

    if (!finalize) {
      // 如果不是最終提交，只返回簽名和 TxID
      res.json({
        message: "簽名成功",
        signature,
        transactionId: finalTransactionHash, // 返回最終 TxID
      });
    }
  });
});

app.post("/newaddress", (req, res) => {
  const userId = req.body.userId;

  // 開始事務
  db.beginTransaction((err) => {
    if (err) {
      console.error("開始事務失敗:", err);
      return res.status(500).json({ error: "開始事務失敗" });
    }

    // 查詢 mnemonic
    const mnemonic_sql = "SELECT id, mnemonic FROM wallets WHERE user_id = ?";
    db.query(mnemonic_sql, [userId], (err, mnemonicResults) => {
      if (err) {
        console.error("查詢 mnemonic 失敗:", err);
        return db.rollback(() => {
          res.status(500).json({ error: "查詢 mnemonic 失敗" });
        });
      }
      if (mnemonicResults.length === 0) {
        return db.rollback(() => {
          res.status(404).json({ error: "未找到用戶的錢包助記詞" });
        });
      }

      const mnemonics = mnemonicResults[0].mnemonic;
      const walletId = mnemonicResults[0].id;

      // 查詢所有現有地址和最新的路徑
      const sql = "SELECT address, paths FROM addresses WHERE user_id = ? ORDER BY id DESC LIMIT 1";
      db.query(sql, [userId], (err, rows) => {
        if (err) {
          console.error("查詢路徑失敗:", err);
          return db.rollback(() => {
            res.status(500).json({ error: "查詢路徑失敗" });
          });
        }

        const mnemonic = new Mnemonic(mnemonics);
        const seed = mnemonic.toSeed();
        const root = bitcore.HDPrivateKey.fromSeed(seed);

        let currentPath = rows.length > 0 ? rows[0].paths : "m/44'/0'/0'/0/0";
        let pathParts = currentPath.split('/');
        let currentIndex = parseInt(pathParts[pathParts.length - 1]);
        let nextIndex = currentIndex + 1;
        let newPath = pathParts.slice(0, -1).join('/') + '/' + nextIndex;
        let address;
        let derived;
        let privatekey;
        let publickey;

        // 檢查地址是否已存在
        const checkAddressExists = () => {
          return new Promise((resolve, reject) => {
            db.query("SELECT address FROM addresses WHERE address = ?", [address], (err, results) => {
              if (err) reject(err);
              resolve(results.length > 0);
            });
          });
        };

        // 生成唯一地址
        const generateUniqueAddress = async () => {
          do {
            newPath = pathParts.slice(0, -1).join('/') + '/' + nextIndex;
            derived = root.derive(newPath);
            address = derived.privateKey.toAddress().toString();
            privatekey = derived.privateKey.toWIF();
            publickey = derived.publicKey.toString('hex');

            try {
              const exists = await checkAddressExists();
              if (!exists) {
                return true; // 找到未使用的地址
              }
              nextIndex++;
            } catch (err) {
              throw err;
            }
          } while (true);
        };

        // 執行地址生成並儲存
        generateUniqueAddress()
          .then(() => {
            // 儲存到 MySQL
            const newaddrsql = `
              INSERT INTO addresses (wallet_id, paths, address, private_key, public_key, user_id) 
              VALUES (?, ?, ?, ?, ?, ?)
            `;
            db.query(newaddrsql, [walletId, newPath, address, privatekey, publickey, userId], (err) => {
              if (err) {
                console.error("儲存地址失敗:", err);
                return db.rollback(() => {
                  res.status(500).json({ error: "無法儲存新地址" });
                });
              }

              // 提交事務
              db.commit((err) => {
                if (err) {
                  console.error("提交事務失敗:", err);
                  return db.rollback(() => {
                    res.status(500).json({ error: "提交事務失敗" });
                  });
                }
                res.json({ address });
              });
            });
          })
          .catch((err) => {
            console.error("生成地址失敗:", err);
            db.rollback(() => {
              res.status(500).json({ error: "生成地址失敗" });
            });
          });
      });
    });
  });
});

app.post("/complete-transaction", verifyToken, (req, res) => {
  const { senderAddress, recipientAddress, amount, finalTransactionHash,signature,finalize } = req.body;
  const userId = req.userId;
  if(!finalize) return res.status(500).json({message:"沒有雙重簽名"});
  try{
    const sqlSender = "SELECT * FROM addresses WHERE user_id = ? AND address = ?";
    db.query(sqlSender, [userId, senderAddress], (err, senderResults) => {
      if (err) {
        console.error("查詢發送者錯誤:", err);
        return res.status(500).json({ message: "伺服器錯誤" });
      }
      if (senderResults.length === 0) {
        return res.status(404).json({ message: "發送錢包不存在" });
      }

      const wallet = senderResults[0];
      const privateKey = new bitcore.PrivateKey(wallet.private_key);
      const amountInBTC = parseFloat(amount);

      if (wallet.balance < amountInBTC) {
        return res.status(400).json({ message: "餘額不足" });
      }

      db.beginTransaction((err) => {
        if (err) return res.status(500).json({ message: "事務啟動失敗" });

        const sqlUpdateSender = "UPDATE addresses SET balance = balance - ? WHERE address = ?";
        db.query(sqlUpdateSender, [amountInBTC, senderAddress], (err) => {
          if (err) {
            db.rollback(() => res.status(500).json({ message: "更新發送餘額失敗" }));
            return;
          }

          const sqlUpdateRecipient = "UPDATE addresses SET balance = balance + ? WHERE address = ?";
          db.query(sqlUpdateRecipient, [amountInBTC, recipientAddress], (err) => {
            if (err) {
              db.rollback(() => res.status(500).json({ message: "更新接收餘額失敗" }));
              return;
            }

            const sqlInsertTransaction = "INSERT INTO transactions (tx_hash, sender_address, recipient_address, amount, sender_public_key) VALUES (?, ?, ?, ?, ?)";
            db.query(sqlInsertTransaction, [finalTransactionHash, senderAddress, recipientAddress, amountInBTC, wallet.public_key], (err) => {
              if (err) {
                db.rollback(() => res.status(500).json({ message: "插入交易資料失敗" }));
                return;
              }

              db.commit((err) => {
                if (err) {
                  db.rollback(() => res.status(500).json({ message: "事務提交失敗" }));
                  return;
                }
                res.json({
                  message: "交易成功",
                  transactionId: finalTransactionHash, // 使用最終 TxID
                  signature,
                });
              });
            });
          });
        });
      });
    });
  }catch(error){
    console.error("完成交易錯誤:", error);
    res.status(500).json({ message: "交易失敗" });
  }
  
});

app.post('/recover-wallet', (req, res) => {
  try {
    const mnemonic = req.body.mnemonic;
    const userId = req.body.userId;
    
    if (!Mnemonic.isValid(mnemonic)) {
      return res.status(400).json({ error: '無效的助記詞' });
    }
    const searchsql = "select * from wallets where mnemonic = ?";
    db.query(searchsql,[mnemonic],(err,result) =>{
      if (Array.isArray(result) && result.length > 0){
        res.status(500).json({message:'已存在錢包!'});
      }
      else{
        const mnemonicObj = new Mnemonic(mnemonic);
        const seed = mnemonicObj.toSeed();
        const hdPrivateKey = bitcore.HDPrivateKey.fromSeed(seed, 'mainnet');

        const derivedKey = hdPrivateKey.derive("m/44'/0'/0'/0/0");
        const address = derivedKey.privateKey.toAddress().toString();
        const public_key= derivedKey.publicKey.toString('hex');
        const private_key = derivedKey.privateKey.toWIF();
        const path ="m/44'/0'/0'/0/0";
        const insertsql = "INSERT INTO wallets (user_id, mnemonic) VALUES (?, ?)";
        db.query(insertsql,[userId,mnemonic],(err,result) =>{
          const walletId = result.insertId;
          const addrsql ="INSERT INTO addresses (wallet_id,paths,address,private_key,public_key,user_id) VALUES (?, ?, ?, ?, ?, ?)";
          db.query(addrsql, [walletId, path, address, private_key, public_key,userId], (err) => {
            if (err) return res.status(500).json({ error: "Failed to insert address." });  
          });
        });
        
        res.json({
          address,
          mnemonic,
        });
      }
    });
    

    
  } catch (error) {
    //console.error(error);
    res.status(500).json({ error: '恢復錢包失敗' });
  }
});

// 忘記密碼 API
app.post("/forgot-password", (req, res) => {
  const { username, email, phone } = req.body;

  // 檢查是否提供了所有必要欄位
  if (!username || !email || !phone) {
    return res.status(400).json({ message: "請提供帳號、電子郵件和電話" });
  }

  // 檢查使用者是否存在且帳號、電子郵件和電話匹配
  const sql = "SELECT * FROM users WHERE username = ? AND email = ? AND phone = ?";
  db.query(sql, [username, email, phone], (err, results) => {
    if (err) {
      console.error("資料庫查詢錯誤:", err);
      return res.status(500).json({ message: "伺服器錯誤" });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: "未找到匹配的帳號、電子郵件或電話" });
    }

    const user = results[0];

    // 生成重置密碼的 JWT 令牌，1 小時有效
    const resetToken = jwt.sign(
      { userId: user.id },
      "your_jwt_secret",
      { expiresIn: "1h" }
    );

    // 返回重置密碼的連結
    const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`;
    res.json({ message: "密碼重置連結已生成", resetLink });
  });
});

// 重置密碼 API
app.post("/reset-password", (req, res) => {
  const { token, newPassword } = req.body;

  // 檢查是否提供了 token 和新密碼
  if (!token || !newPassword) {
    return res.status(400).json({ message: "請提供重置令牌和新密碼" });
  }

  // 驗證 JWT 令牌
  jwt.verify(token, "your_jwt_secret", async (err, decoded) => {
    if (err) {
      console.error("JWT 驗證失敗:", err);
      return res.status(400).json({ message: "無效或過期的重置令牌" });
    }

    const userId = decoded.userId;
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 更新使用者密碼
    const updateSql = "UPDATE users SET password = ? WHERE id = ?";
    db.query(updateSql, [hashedPassword, userId], (err) => {
      if (err) {
        console.error("密碼更新錯誤:", err);
        return res.status(500).json({ message: "密碼更新失敗" });
      }
      res.json({ message: "密碼重置成功" });
    });
  });
});

app.get('/extract-transactions', (req, res) => {
  db.query('SELECT * FROM transactions', (err, results) => {
    if (err) {
      console.error('獲取交易紀錄錯誤:', err);
      return res.status(500).send('伺服器錯誤');
    }
    res.json(results);
  });
});

app.get('/', (req, res) => {
  res.send('Hello World!')
});

// 啟動伺服器
app.listen(3001, () => {
  console.log('服務器運行在 http://localhost:3001');
});
module.exports = db;
