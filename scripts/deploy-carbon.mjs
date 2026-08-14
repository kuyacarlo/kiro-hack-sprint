import {
  Address,
  Asset,
  BASE_FEE,
  Contract,
  Keypair,
  Operation,
  TransactionBuilder,
  TimeoutInfinite,
  nativeToScVal,
  rpc,
  xdr,
} from "@stellar/stellar-sdk";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RPC_URL = process.env.STELLAR_RPC_URL ?? "https://soroban-testnet.stellar.org";
const PASSPHRASE =
  process.env.STELLAR_NETWORK_PASSPHRASE ?? "Test SDF Network ; September 2015";
const FRIENDBOT = "https://friendbot.stellar.org";
const WASM = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../contracts/target/wasm32v1-none/release/carbon_credit.wasm",
);

const server = new rpc.Server(RPC_URL, { allowHttp: RPC_URL.startsWith("http://") });

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fundIfNeeded(pub) {
  try {
    await server.getAccount(pub);
    console.log(`account ${pub} exists`);
  } catch {
    console.log(`funding ${pub} via friendbot...`);
    await fetch(`${FRIENDBOT}?addr=${pub}`);
    for (let i = 0; i < 10; i++) {
      await sleep(1000);
      try {
        await server.getAccount(pub);
        console.log(`account funded`);
        return;
      } catch {}
    }
    throw new Error("friendbot funding timed out");
  }
}

async function submitClassic(tx, kp) {
  tx.sign(kp);
  const sent = await server.sendTransaction(tx);
  if (sent.status !== "PENDING" && sent.status !== "DUPLICATE") {
    throw new Error(`send failed: ${JSON.stringify(sent)}`);
  }
  for (let i = 0; i < 15; i++) {
    await sleep(1000);
    const res = await server.getTransaction(sent.hash);
    if (res.status === "SUCCESS") return res;
    if (res.status === "FAILED") throw new Error(`tx ${sent.hash} failed on-chain`);
  }
  throw new Error(`tx ${sent.hash} still pending after 15s`);
}

async function submitAndConfirm(tx, kp) {
  tx.sign(kp); // sign BEFORE sim: ED25519 address-auth must validate in simulation
  const prepared = await server.prepareTransaction(tx);
  prepared.sign(kp);
  const sent = await server.sendTransaction(prepared);
  if (sent.status !== "PENDING" && sent.status !== "DUPLICATE") {
    throw new Error(`send failed: ${JSON.stringify(sent)}`);
  }
  for (let i = 0; i < 15; i++) {
    await sleep(1000);
    const res = await server.getTransaction(sent.hash);
    if (res.status === "SUCCESS") return res;
    if (res.status === "FAILED") throw new Error(`tx ${sent.hash} failed on-chain`);
  }
  throw new Error(`tx ${sent.hash} still pending after 15s`);
}

async function main() {
  const arg = process.argv.slice(2);
  const existingToken = arg.find((a) => a.startsWith("--use-token="))?.split("=")[1];
  const feeBps = Number(arg.find((a) => a.startsWith("--fee-bps="))?.split("=")[1] ?? 250);

  const adminSecret =
    process.env.CARBON_ADMIN_SECRET ?? Keypair.random().secret();
  const adminKp = Keypair.fromSecret(adminSecret);
  const adminPub = adminKp.publicKey();
  console.log("admin:", adminPub);

  const treasury = process.env.CARBON_TREASURY || adminPub;
  await fundIfNeeded(adminPub);

  // 1. Upload wasm
  const wasm = readFileSync(WASM);
  const account = await server.getAccount(adminPub);
  const uploadTx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: PASSPHRASE,
  })
    .addOperation(Operation.uploadContractWasm({ wasm }))
    .setTimeout(TimeoutInfinite)
    .build();
  const uploadRes = await submitAndConfirm(uploadTx, adminKp);
  const wasmId = Buffer.from(uploadRes.returnValue.bytes()).toString("hex");
  console.log("wasm uploaded:", wasmId);

  // 2. Payment token (SAC) — reuse existing or register new + mint supply
  //    to a holder account (SAC forbids minting to the issuer itself).
  let tokenId = existingToken;
  let holderKp = null;
  if (!tokenId) {
    const code = process.env.CARBON_TOKEN_CODE ?? "TESTUSD";
    const fresh2 = await server.getAccount(adminPub);
    const sacTx = new TransactionBuilder(fresh2, {
      fee: BASE_FEE,
      networkPassphrase: PASSPHRASE,
    })
      .addOperation(
        Operation.createStellarAssetContract({
          asset: new Asset(code, adminPub),
        }),
      )
      .setTimeout(TimeoutInfinite)
      .build();
    const sacRes = await submitAndConfirm(sacTx, adminKp);
    tokenId = Address.fromScVal(sacRes.returnValue).toString();
    console.log("payment token (SAC) created:", tokenId, code);

    holderKp = Keypair.random();
    await fundIfNeeded(holderKp.publicKey());
    const holderAccount = await server.getAccount(holderKp.publicKey());
    const trustTx = new TransactionBuilder(holderAccount, {
      fee: BASE_FEE,
      networkPassphrase: PASSPHRASE,
    })
      .addOperation(
        Operation.changeTrust({
          asset: new Asset(code, adminPub),
          limit: "100000",
        }),
      )
      .setTimeout(TimeoutInfinite)
      .build();
    await submitClassic(trustTx, holderKp);
    console.log("holder trustline set for", holderKp.publicKey());

    const mintAccount = await server.getAccount(adminPub);
    const mintTx = new TransactionBuilder(mintAccount, {
      fee: BASE_FEE,
      networkPassphrase: PASSPHRASE,
    })
      .addOperation(
        new Contract(tokenId).call(
          "mint",
          nativeToScVal(holderKp.publicKey(), { type: "address" }),
          nativeToScVal(1_000_000_000_000n, { type: "i128" }), // 100,000.00 units
        ),
      )
      .setTimeout(TimeoutInfinite)
      .build();
    await submitAndConfirm(mintTx, adminKp);
    console.log("minted 100,000.00 token units to holder", holderKp.publicKey());
  } else {
    console.log("using existing payment token:", tokenId);
  }

  // 3. Create contract instance (SDK 14's createCustomContract always
  //    invokes the constructor, so pass constructorArgs here).
  const feeBpsVal = xdr.ScVal.scvU32(feeBps);
  const fresh = await server.getAccount(adminPub);
  const createTx = new TransactionBuilder(fresh, {
    fee: BASE_FEE,
    networkPassphrase: PASSPHRASE,
  })
    .addOperation(
      Operation.createCustomContract({
        wasmHash: Buffer.from(wasmId, "hex"),
        address: new Address(adminPub),
        constructorArgs: [
          nativeToScVal(adminPub, { type: "address" }),
          nativeToScVal(tokenId, { type: "address" }),
          nativeToScVal(treasury, { type: "address" }),
          feeBpsVal,
        ],
      }),
    )
    .setTimeout(TimeoutInfinite)
    .build();
  const createRes = await submitAndConfirm(createTx, adminKp);
  const contractId = Address.fromScVal(createRes.returnValue).toString();
  console.log("contract created + initialized:", contractId);

  // 4. Persist config BEFORE init so a failed init can be retried.
  const envFile = resolve(dirname(fileURLToPath(import.meta.url)), "../.env.local");
  const lines = [
    `CARBON_CONTRACT_ID=${contractId}`,
    `CARBON_ADMIN_SECRET=${adminSecret}`,
    `CARBON_PAYMENT_TOKEN=${tokenId}`,
    `CARBON_TREASURY=${treasury}`,
  ];
  if (holderKp) {
    lines.push(`CARBON_HOLDER_SECRET=${holderKp.secret()}`);
  }
  let existing = "";
  try {
    existing = readFileSync(envFile, "utf8");
  } catch {}
  const next = [...new Set([...existing.split("\n"), ...lines].filter(Boolean))].join("\n") + "\n";
  writeFileSync(envFile, next);
  console.log("config written to .env.local");

  // 5. Smoke test: read back instance state.
  const adminEntry = await server.getContractData(
    contractId,
    xdr.ScVal.scvLedgerKeyContractInstance(),
    rpc.Durability.persistent,
  );
  const instance = adminEntry.val.contractData().val().instance();
  const adminVal = instance
    .storage()
    .find((e) => e.key().toXDR("base64") === xdr.ScVal.scvVec([xdr.ScVal.scvSymbol("Admin")]).toXDR("base64"));
  console.log("smoke test admin =", adminVal ? Address.fromScVal(adminVal.val()).toString() : "NOT FOUND");
  console.log("\n=== DEPLOY SUMMARY ===");
  console.log("contract:", contractId);
  console.log("token:   ", tokenId);
  console.log("admin:   ", adminPub);
  console.log("treasury:", treasury);
}

main().catch((e) => {
  console.error("deploy failed:", e.message ?? e);
  console.error(e.stack);
  process.exit(1);
});
