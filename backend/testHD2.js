const bitcore = require('bitcore-lib');
const Mnemonic = require('bitcore-mnemonic');

// 設置比特幣網絡 (mainnet 主網)
// 若要測試可以用 bitcore.Networks.testnet
const network = bitcore.Networks.mainnet;

function createHDWallet() {

    try {
        // 1. 生成助記詞 (12 或 24 個單詞)
        const mnemonic = new Mnemonic("boring food defense oblige toss coach poem live fox furnace pluck wasp"); // 256 bits 產生 24 個單詞
        console.log('助記詞:', mnemonic.toString());

        // 2. 從助記詞生成種子
        const seed = mnemonic.toSeed();
        console.log('種子:', seed.toString('hex'));

        // 3. 從種子創建 HD 私鑰 (根節點)
        const hdPrivateKey = bitcore.HDPrivateKey.fromSeed(seed, network);

        // 4. 派生第一個帳戶的路徑 (m/44'/0'/0'/0/0)
        // 遵循 BIP-44 標準
        const path = "m/44'/0'/0'/0/20";
        const derived = hdPrivateKey.deriveChild(path);

        // 5. 生成比特幣地址
        const address = derived.privateKey.toAddress(network).toString();

        // 6. 獲取私鑰 (WIF 格式)
        const privateKey = derived.privateKey.toWIF();

        // 7. 獲取公鑰
        const publicKey = derived.publicKey.toString('hex');

        // 輸出結果
        console.log('\nHD 錢包資訊:');
        console.log('派生路徑:', path);
        console.log('地址:', address);
        console.log('私鑰(WIF):', privateKey);
        console.log('公鑰:', publicKey);

        return {
            mnemonic: mnemonic.toString(),
            seed: seed.toString('hex'),
            address,
            privateKey,
            publicKey,
            path
        };
    } catch (error) {
        console.error('創建 HD 錢包時出錯:', error);
        throw error;
    }
}

// 主函數執行
async function main() {
    console.log('開始創建比特幣 HD 錢包...\n');
    const wallet = createHDWallet();
}

main();

// 假設你已經有助記詞，如果沒有就生成一個新的
/*let mnemonic = new Mnemonic("chronic brain milk wealth build arch shiver identify source great monitor carry"); // 或者使用 Mnemonic() 生成新助記詞
let seed = mnemonic.toSeed(); // 獲取種子

// 生成私鑰和地址的函數
function generateNewAddress() {
    // BIP44 路徑: m/44'/0'/0'/0/1
    // m / purpose' / coin_type' / account' / change / address_index
    const derivationPath = "m/44'/0'/0'/0/0";
    
    // 從種子生成 HD 私鑰
    const hdPrivateKey = bitcore.HDPrivateKey.fromSeed(seed, 'mainnet');
    
    // 根據路徑派生新的私鑰
    const derivedKey = hdPrivateKey.deriveChild(derivationPath);
    const privateKey = derivedKey.privateKey;
    const publicKey = privateKey.toPublicKey();
    
    // 生成比特幣地址
    const address = publicKey.toAddress(bitcore.Networks.mainnet);
    
    return {
        address: address.toString(),
        privateKey: privateKey.toString(),
        path: derivationPath
    };
}

// 模擬按鈕點擊事件
function onGenerateAddressButtonClick() {
    const newAddressInfo = generateNewAddress();
    console.log('新地址:', newAddressInfo.address);
    console.log('私鑰:', newAddressInfo.privateKey);
    console.log('派生路徑:', newAddressInfo.path);
    return newAddressInfo;
}

// 測試執行
const result = onGenerateAddressButtonClick();
console.log(result);*/