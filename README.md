# Kiro Hack Sprint

Hackathon prototype for satellite-informed carbon-credit issuance and marketplace flows on Stellar/Soroban. The app combines a Next.js frontend/API layer with a Soroban smart contract workspace and Remotion promo materials.

## What is included

| Path | Purpose |
| --- | --- |
| `app/` | Next.js App Router pages and API routes |
| `lib/verification/` | NDVI/geometry-based carbon estimation helpers |
| `lib/stellar/` | Stellar/Soroban client helpers |
| `contracts/` | Soroban carbon-credit contract workspace |
| `promo/` | Remotion promo video project |

## Configuration

Server-side Stellar actions read these environment variables:

| Variable | Purpose |
| --- | --- |
| `STELLAR_RPC_URL` | Soroban RPC endpoint; defaults to Stellar testnet RPC |
| `STELLAR_NETWORK_PASSPHRASE` | Network passphrase; defaults to testnet |
| `CARBON_CONTRACT_ID` | Deployed carbon-credit contract ID |
| `CARBON_ADMIN_SECRET` | Issuer/admin secret key for attestation routes; never commit this |
| `CARBON_PAYMENT_TOKEN` | Payment token contract/address used by marketplace flows |
| `CARBON_TREASURY` | Treasury public key/address |

Without those variables, UI pages and local static checks can run, but contract-backed issue/buy/retire routes will return configuration errors.

## Local development

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3000`.

## Safe verification

These checks do not deploy contracts or call host services:

```sh
pnpm lint
pnpm exec tsc --noEmit
pnpm build
cd contracts && cargo test --locked
```

Do not run `scripts/deploy-carbon.mjs` during local finalization unless you explicitly intend to deploy a Soroban contract.

## Promo project

```sh
cd promo
npm install
npm run preview
```

## Finalization notes

This is archive-ready only as a hackathon prototype. Before claiming a live demo, verify the deployed contract ID, Stellar network, and any OpenEO/satellite endpoints against the environment actually used for the demo.
