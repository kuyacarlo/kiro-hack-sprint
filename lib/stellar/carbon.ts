// @ts-nocheck
/* eslint-disable */
import {
  Address,
  BASE_FEE,
  Contract,
  Keypair,
  nativeToScVal,
  rpc,
  TimeoutInfinite,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";

import {
  CARBON_CONTRACT_ID,
  STELLAR_NETWORK_PASSPHRASE,
  STELLAR_RPC_URL,
} from "./config";

export type CreditStatus = "Listed" | "Sold" | "Retired";

export type CarbonCredit = {
  id: number;
  projectName: string;
  projectType: string;
  vintageYear: number;
  tonnes: number;
  price: bigint;
  region: string;
  registryId: string;
  issuer: string;
  status: CreditStatus;
  listedAt: number;
  soldAt: number;
  retiredAt: number;
};

export type SubmitResult = {
  hash: string;
  status: "PENDING" | "SUCCESS" | "FAILED";
  result?: CarbonCredit;
};

function makeRpcServer() {
  return new rpc.Server(STELLAR_RPC_URL, {
    allowHttp: STELLAR_RPC_URL.startsWith("http://"),
  });
}

function requireContractId() {
  if (!CARBON_CONTRACT_ID) {
    throw new Error("CARBON_CONTRACT_ID is not configured");
  }
  return CARBON_CONTRACT_ID;
}

/** Convert a human decimal amount string to base units (7 decimals). */
export function toStroops(amount: string, decimals = 7): bigint {
  const trimmed = (amount ?? "0").trim();
  const negative = trimmed.startsWith("-");
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [whole = "0", fraction = ""] = unsigned.split(".");
  const fracPadded = (fraction + "0".repeat(decimals)).slice(0, decimals);
  const scale = 10n ** BigInt(decimals);
  const value = BigInt(whole || "0") * scale + BigInt(fracPadded || "0");
  return negative ? -value : value;
}

export function stroopsToHuman(stroops: bigint, decimals = 7): string {
  const negative = stroops < 0n;
  const abs = negative ? -stroops : stroops;
  const scale = 10n ** BigInt(decimals);
  const whole = abs / scale;
  const frac = (abs % scale).toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole}${frac ? "." + frac : ""}`;
}

// ── ScVal helpers ─────────────────────────────────────────────────────────

function scvSymbol(s: string) {
  return xdr.ScVal.scvSymbol(s);
}

function scvU64(value: bigint | number) {
  return xdr.ScVal.scvU64(xdr.Uint64.fromString(BigInt(value).toString()));
}

function scvAddress(address: string) {
  return nativeToScVal(address, { type: "address" });
}

/** DataKey::Credit(u64) — persistent. */
function creditKey(id: number) {
  return xdr.ScVal.scvVec([scvSymbol("Credit"), scvU64(id)]);
}

/** DataKey::Owner(u64) — persistent. */
function ownerKey(id: number) {
  return xdr.ScVal.scvVec([scvSymbol("Owner"), scvU64(id)]);
}

function u64Value(value: xdr.ScVal | undefined): bigint {
  if (!value) return 0n;
  switch (value.switch()) {
    case xdr.ScValType.scvU64():
      return value.u64().toBigInt();
    case xdr.ScValType.scvI128(): {
      const parts = value.i128();
      const hi = BigInt((parts as unknown as { hi: () => { toBigInt: () => bigint } }).hi().toBigInt());
      const lo = BigInt((parts as unknown as { lo: () => { toBigInt: () => bigint } }).lo().toBigInt());
      return (hi << 64n) | lo;
    }
    case xdr.ScValType.scvU32():
      return BigInt(value.u32());
    default:
      return 0n;
  }
}

function statusFromU32(raw: number): CreditStatus {
  if (raw === 0) return "Listed";
  if (raw === 1) return "Sold";
  return "Retired";
}

// SDK 27 unit enum variants (e.g. CreditStatus::Sold) serialize as
// scvVec([scvSymbol("Sold")]); the numeric fallback keeps the parse working
// for older wasm builds.
function statusFromScVal(value: xdr.ScVal | undefined): CreditStatus {
  if (!value) return "Listed";
  try {
    switch (value.switch()) {
      case xdr.ScValType.scvVec(): {
        const inner = value.vec();
        if (inner?.length === 1) {
          const sym = inner[0].sym().toString();
          if (sym === "Listed" || sym === "Sold" || sym === "Retired") return sym as CreditStatus;
        }
        return "Listed";
      }
      case xdr.ScValType.scvSymbol(): {
        const sym = value.sym().toString();
        if (sym === "Listed" || sym === "Sold" || sym === "Retired") return sym as CreditStatus;
        return "Listed";
      }
      default:
        return statusFromU32(Number(u64Value(value)));
    }
  } catch {
    return statusFromU32(Number(u64Value(value)));
  }
}

function addressFromScVal(value: xdr.ScVal): string {
  return Address.fromScVal(value).toString();
}

function stringFromScVal(value: xdr.ScVal | undefined): string {
  if (!value) return "";
  try {
    switch (value.switch()) {
      case xdr.ScValType.scvString():
        return value.str().toString();
      case xdr.ScValType.scvSymbol():
        return value.sym().toString();
      default:
        return "";
    }
  } catch {
    return "";
  }
}

function parseCredit(scval: xdr.ScVal): CarbonCredit {
  const entries = scval.map()!;
  const get = (name: string): xdr.ScVal | undefined => {
    const key = scvSymbol(name);
    const entry = entries.find((e) => e.key().toXDR("base64") === key.toXDR("base64"));
    return entry?.val();
  };
  return {
    id: Number(u64Value(get("id"))),
    projectName: stringFromScVal(get("project_name")),
    projectType: stringFromScVal(get("project_type")),
    vintageYear: Number(u64Value(get("vintage_year"))),
    tonnes: Number(u64Value(get("tonnes"))),
    price: u64Value(get("price")),
    region: stringFromScVal(get("region")),
    registryId: stringFromScVal(get("registry_id")),
    issuer: addressFromScVal(get("issuer") as xdr.ScVal),
    status: statusFromScVal(get("status")),
    listedAt: Number(u64Value(get("listed_at"))),
    soldAt: Number(u64Value(get("sold_at"))),
    retiredAt: Number(u64Value(get("retired_at"))),
  };
}

// ── Reads (simulation only, no fees) ──────────────────────────────────────

export async function readCredit(id: number): Promise<CarbonCredit> {
  const server = makeRpcServer();
  const entry = await server.getContractData(
    requireContractId(),
    creditKey(id),
    rpc.Durability.Persistent,
  );
  return parseCredit(entry.val.contractData().val());
}

export async function readOwner(id: number): Promise<string> {
  const server = makeRpcServer();
  const entry = await server.getContractData(
    requireContractId(),
    ownerKey(id),
    rpc.Durability.Persistent,
  );
  return addressFromScVal(entry.val.contractData().val());
}

export async function readInstance() {
  const server = makeRpcServer();
  let storage: { key: () => xdr.ScVal; val: () => xdr.ScVal }[] = [];
  try {
    const entry = await server.getContractData(
      requireContractId(),
      xdr.ScVal.scvLedgerKeyContractInstance(),
      rpc.Durability.Persistent,
    );
    const instance = entry.val
      .contractData()
      .val()
      .instance() as unknown as { storage: () => { key: () => xdr.ScVal; val: () => xdr.ScVal }[] };
    storage = instance.storage();
  } catch {
    // Contract not initialized yet.
  }

  const get = (name: string): xdr.ScVal | undefined => {
    const key = xdr.ScVal.scvVec([scvSymbol(name)]);
    const found = storage.find(
      (e) => e.key().toXDR("base64") === key.toXDR("base64"),
    );
    return found?.val();
  };

  return {
    admin: get("Admin") ? addressFromScVal(get("Admin") as xdr.ScVal) : null,
    nextId: Number(u64Value(get("NextId"))),
    feeBps: Number(u64Value(get("FeeBps"))),
    totalIssuedTonnes: Number(u64Value(get("TotalIssued"))),
    totalRetiredTonnes: Number(u64Value(get("TotalRetired"))),
    paymentToken: get("PaymentToken") ? addressFromScVal(get("PaymentToken") as xdr.ScVal) : null,
    treasury: get("Treasury") ? addressFromScVal(get("Treasury") as xdr.ScVal) : null,
  };
}

// ── Writes (simulate + sign + submit) ─────────────────────────────────────

type WriteInput = {
  signerSecret: string;
  method: string;
  args: xdr.ScVal[];
  parseResult?: (scval: xdr.ScVal) => CarbonCredit;
};

async function submitWrite({ signerSecret, method, args, parseResult }: WriteInput) {
  const server = makeRpcServer();
  const kp = Keypair.fromSecret(signerSecret);
  const account = await server.getAccount(kp.publicKey());
  const contract = new Contract(requireContractId());

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: STELLAR_NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(TimeoutInfinite)
    .build();

  const prepared = await server.prepareTransaction(tx);
  prepared.sign(kp);
  const sendResult = await server.sendTransaction(prepared);

  if (sendResult.status !== "PENDING" && sendResult.status !== "DUPLICATE") {
    throw new Error(`Transaction rejected: ${sendResult.status} ${JSON.stringify(sendResult.errorResult ?? "")}`);
  }

  const hash = sendResult.hash;
  const confirmed = await server.getTransaction(hash);

  if (confirmed.status === "NOT_FOUND") {
    // Wait up to ~10s for the ledger to include the tx.
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const retry = await server.getTransaction(hash);
      if (retry.status !== "NOT_FOUND") {
        return finalizeConfirmed(retry, hash, parseResult);
      }
    }
    return { hash, status: "PENDING" as const, result: undefined };
  }

  return finalizeConfirmed(confirmed, hash, parseResult);
}

function finalizeConfirmed(
  confirmed: rpc.Api.GetTransactionResponse,
  hash: string,
  parseResult?: (scval: xdr.ScVal) => CarbonCredit,
): SubmitResult {
  if (confirmed.status === "SUCCESS") {
    let result: CarbonCredit | undefined;
    if (parseResult) {
      try {
        const returnValue = confirmed.returnValue;
        if (returnValue) {
          result = parseResult(returnValue);
        }
      } catch {
        result = undefined;
      }
    }
    return { hash, status: "SUCCESS", result };
  }
  if (confirmed.status === "FAILED") {
    throw new Error(`Transaction failed on-chain (${hash})`);
  }
  return { hash, status: "PENDING", result: undefined };
}

// ── Public write helpers ──────────────────────────────────────────────────

export async function submitIssueCredit(
  adminSecret: string,
  input: {
    issuer: string;
    projectName: string;
    projectType: string;
    vintageYear: number;
    tonnes: number;
    price: bigint;
    region: string;
    registryId: string;
  },
): Promise<SubmitResult> {
  return submitWrite({
    signerSecret: adminSecret,
    method: "issue_credit",
    args: [
      scvAddress(input.issuer),
      nativeToScVal(input.projectName, { type: "string" }),
      nativeToScVal(input.projectType, { type: "string" }),
      nativeToScVal(input.vintageYear, { type: "u32" }),
      nativeToScVal(BigInt(input.tonnes), { type: "i128" }),
      nativeToScVal(input.price, { type: "i128" }),
      nativeToScVal(input.region, { type: "string" }),
      nativeToScVal(input.registryId, { type: "string" }),
    ],
    parseResult: parseCredit,
  });
}

export async function submitBuyCredit(
  buyerSecret: string,
  id: number,
): Promise<SubmitResult> {
  return submitWrite({
    signerSecret: buyerSecret,
    method: "buy_credit",
    args: [scvAddress(Keypair.fromSecret(buyerSecret).publicKey()), scvU64(id)],
    parseResult: parseCredit,
  });
}

export async function submitRetireCredit(
  ownerSecret: string,
  id: number,
): Promise<SubmitResult> {
  return submitWrite({
    signerSecret: ownerSecret,
    method: "retire_credit",
    args: [scvAddress(Keypair.fromSecret(ownerSecret).publicKey()), scvU64(id)],
  });
}

export async function submitTransferCredit(
  fromSecret: string,
  to: string,
  id: number,
): Promise<SubmitResult> {
  return submitWrite({
    signerSecret: fromSecret,
    method: "transfer_credit",
    args: [scvAddress(Keypair.fromSecret(fromSecret).publicKey()), scvAddress(to), scvU64(id)],
  });
}

export async function submitListCredit(
  ownerSecret: string,
  id: number,
): Promise<SubmitResult> {
  return submitWrite({
    signerSecret: ownerSecret,
    method: "list_credit",
    args: [scvAddress(Keypair.fromSecret(ownerSecret).publicKey()), scvU64(id)],
  });
}

export async function submitUnlistCredit(
  ownerSecret: string,
  id: number,
): Promise<SubmitResult> {
  return submitWrite({
    signerSecret: ownerSecret,
    method: "unlist_credit",
    args: [scvAddress(Keypair.fromSecret(ownerSecret).publicKey()), scvU64(id)],
  });
}

export async function submitSetPrice(
  ownerSecret: string,
  id: number,
  newPrice: bigint,
): Promise<SubmitResult> {
  return submitWrite({
    signerSecret: ownerSecret,
    method: "set_price",
    args: [scvAddress(Keypair.fromSecret(ownerSecret).publicKey()), scvU64(id), nativeToScVal(newPrice, { type: "i128" })],
  });
}
