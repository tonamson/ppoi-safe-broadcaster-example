# Tài liệu MY-CONFIG.ts

File cấu hình override cho **ppoi-safe-broadcaster-example** — broadcaster client cho RAILGUN (Private Proof Of Innocence). Mọi cấu hình mặc định trong `src/server/config/` đều có thể ghi đè trong file này.

**Nguồn:** [README — Railgun-Community/ppoi-safe-broadcaster-example](https://github.com/Railgun-Community/ppoi-safe-broadcaster-example)

---

## 1. Tạo file cấu hình lần đầu

Chạy lệnh sau để copy file mẫu thành `MY-CONFIG.ts` (file này **không** được commit, chỉ dùng local):

```bash
npm run copy-my-config
```

Sẽ copy `src/MY-CONFIG.ts.example` → `src/MY-CONFIG.ts`. Mọi thay đổi cấu hình chỉnh trong `myConfigOverrides()`.

---

## 2. Các mục cấu hình chính (theo README)

### 2.1. Networks — mạng chạy broadcaster

Chọn các network mà broadcaster sẽ hoạt động. Trong code hiện tại dùng `configDefaults.networks.EVM` (mảng `NetworkChainID`).

```ts
configDefaults.networks.EVM = [
  NetworkChainID.BNBChain,
  NetworkChainID.PolygonPOS,
  NetworkChainID.PolygonMumbai,
  NetworkChainID.Arbitrum,
];
```

- **POI (Proof Of Innocence):** Chạy trên EVM với POI bật thì cần set `configDefaults.poi.nodeURL = ['FQDN of your POI node']`.

### 2.2. Waku — giao tiếp P2P

URL server Waku cho broadcaster (mặc định `http://localhost:8546`):

```ts
configDefaults.waku.rpcURL = 'http://nwaku1:8546';
```

### 2.3. Wallet — ví

- **Mnemonic:** Thường cấu hình qua biến môi trường / secret (ví dụ Docker), không ghi thẳng vào file.
- **HD Wallets:** Chỉ số và độ ưu tiên ví derive từ mnemonic:

```ts
configDefaults.wallet.hdWallets = [
  { index: 0, priority: 1 },
];
```

### 2.4. Network provider (RPC)

Cấu hình fallback RPC cho từng network. Có thể dùng helper `createFallbackProviderConfig(chainId, [url1, url2, ...])` rồi gán bằng:

```ts
setFallbackProviderConfigForNetworkEVM(NetworkChainID.PolygonMumbai, polygonMumbaiConfig);
```

Hoặc chỉnh trực tiếp (theo README):

```ts
configNetworks[ChainType.EVM][NetworkChainID.Ethereum].fallbackProviderConfig.providers.unshift({
  provider: 'http://<IP>:<PORT>',
  priority: 1,
  weight: 1,
});
```

### 2.5. Tokens — token nhận phí

Token mà broadcaster chấp nhận làm phí trên mỗi network. Có thể gán cả map hoặc thêm từng token:

```ts
// Thêm một token (giữ token cũ)
configTokens[ChainType.EVM][NetworkChainID.Ethereum]['0x_token_address'] = {
  symbol: 'TOKEN1',
};

// Hoặc thay toàn bộ token cho network (dùng setTokensForNetworkEVM hoặc gán object mới)
setTokensForNetworkEVM(NetworkChainID.Ethereum, { '0x...': { symbol: 'USDC' } });
```

---

## 3. Helper functions trong MY-CONFIG.ts

Các hàm dùng trong `myConfigOverrides()` để chỉnh config cho từng network:

| Helper | Mô tả |
|--------|--------|
| `setMaxSpendPercentageForNetwork(chainId, value)` | % tối đa balance gas token chi cho 1 giao dịch (vd: 0.08 = 8%). |
| `setTopUpUnshieldAmountForNetwork(chainId, value)` | Số lượng unshield khi top-up (đơn vị gas token). |
| `setTopUpBeginThresholdForNetwork(chainId, value)` | Ngưỡng balance; dưới ngưỡng này sẽ bắt đầu top-up. |
| `setMinAvailabilityBalanceForNetwork(chainId, value)` | Số dư tối thiểu để coi là “available”. |
| `setNativeTokenAccumulationForNetwork(chainId, boolean)` | Bật/tắt tích lũy native token. |
| `setFallbackProviderConfigForNetworkEVM(chainId, config)` | Gán cấu hình fallback RPC (FallbackProviderJsonConfig). |
| `setTokensForNetworkEVM(chainId, tokens)` | Gán map token cho network (AddressToTokenMap). |
| `setFeesForNetworkEVM(chainId, fees)` | Gán cấu hình fees cho network. |
| `setTopUpOnChains(chains)` | Danh sách chain chạy top-up. |
| `setDontSwapTokens(tokens)` | Danh sách token không swap. |
| `setRetryGasBufferForNetwork(chainId, value)` | Gas buffer khi retry (string, đơn vị gwei). |
| `enableTopUp()` | Bật tính năng top-up. |

`createFallbackProviderConfig(chainId, url[])` tạo object cấu hình fallback provider (chainId + danh sách URL RPC, có priority/weight/stallTimeout mặc định).

---

## 4. Debug

```ts
configDefaults.debug.logLevel = DebugLevel.WarningsErrors;
```

---

## 5. Lưu ý

- **MY-CONFIG.ts** không commit lên git; dùng từ **MY-CONFIG.ts.example** làm mẫu.
- POI: Chạy EVM với POI thì **bắt buộc** set `configDefaults.poi.nodeURL`.
- Polygon Mumbai: README lưu ý RPC có thể cần cập nhật; testnet Mumbai đã deprecated (có thể chuyển sang Amoy).
- Top-up: Mặc định có thể bị tắt; cần thì gọi `enableTopUp()` và cấu hình `setTopUpOnChains` cùng các ngưỡng top-up cho từng chain.

Tài liệu này tổng hợp từ [README của repo](https://github.com/Railgun-Community/ppoi-safe-broadcaster-example) và code trong `src/MY-CONFIG.ts`.
