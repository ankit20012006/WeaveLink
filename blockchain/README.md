# WeaveLink Artisan Passport

Minimal ERC-721 contract for anchoring artisan-approved product-passport hashes
on Ethereum Sepolia.

The NFT is evidence that a specific record existed at a given time. It is not
automatic proof of physical authenticity, GI authorization, copyright, or
legal ownership.

## Deploy to Sepolia

Use a dedicated demo wallet with only Sepolia ETH. Never reuse a personal or
mainnet key.

```bash
pnpm install
pnpm compile
npx hardhat keystore set SEPOLIA_RPC_URL
npx hardhat keystore set SEPOLIA_PRIVATE_KEY
pnpm deploy:sepolia
```

Copy the resulting address to the backend:

```bash
WEAVE_PASSPORT_CONTRACT_ADDRESS=0x...
SEPOLIA_CHAIN_ID=11155111
SEPOLIA_EXPLORER_URL=https://sepolia.etherscan.io
```

The backend signer must remain the contract owner. Minting is available only
through an authenticated, verified-weaver API route that checks product
ownership.
