#![no_std]
#![allow(clippy::too_many_arguments)]

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, panic_with_error, token,
    Address, Env, MuxedAddress, String,
};

// ── Shared enums ──────────────────────────────────────────────────────────

#[derive(Clone, PartialEq, Debug)]
#[contracttype]
pub enum CreditStatus {
    /// Credit is minted and available on the exchange.
    Listed,
    /// Credit has been sold and is held by its owner (not listed).
    Sold,
    /// Credit has been permanently retired (consumed off-chain).
    Retired,
}

// ── Structs ───────────────────────────────────────────────────────────────

#[derive(Clone)]
#[contracttype]
pub struct CarbonCredit {
    pub id: u64,
    pub project_name: String,
    pub project_type: String,
    pub vintage_year: u32,
    pub tonnes: i128,
    /// Total asking price in payment-token base units (e.g. USDC stroops).
    pub price: i128,
    pub region: String,
    pub registry_id: String,
    pub issuer: Address,
    pub status: CreditStatus,
    pub listed_at: u64,
    pub sold_at: u64,
    pub retired_at: u64,
}

// ── Storage keys ──────────────────────────────────────────────────────────

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    PaymentToken,
    Treasury,
    /// Exchange fee in basis points (0-10000), paid to treasury on each sale.
    FeeBps,
    NextId,
    Credit(u64),
    Owner(u64),
    /// Number of non-retired credits currently held by an address.
    PortfolioCount(Address),
    TotalIssued,
    TotalRetired,
}

// ── Errors ────────────────────────────────────────────────────────────────

#[contracterror]
#[derive(Clone, Copy, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum CarbonError {
    AlreadyInitialized = 1,
    Unauthorized = 2,
    NotFound = 3,
    InvalidStatus = 4,
    InvalidAmount = 5,
    NotForSale = 6,
    AlreadyRetired = 7,
}

// ── Events ────────────────────────────────────────────────────────────────

#[contractevent(topics = ["carbon", "issued"])]
#[derive(Clone)]
pub struct CreditIssuedEvent {
    #[topic]
    pub id: u64,
    #[topic]
    pub issuer: Address,
    pub tonnes: i128,
    pub price: i128,
}

#[contractevent(topics = ["carbon", "listed"])]
#[derive(Clone)]
pub struct CreditListedEvent {
    #[topic]
    pub id: u64,
    pub price: i128,
}

#[contractevent(topics = ["carbon", "unlisted"])]
#[derive(Clone)]
pub struct CreditUnlistedEvent {
    #[topic]
    pub id: u64,
}

#[contractevent(topics = ["carbon", "price_updated"])]
#[derive(Clone)]
pub struct PriceUpdatedEvent {
    #[topic]
    pub id: u64,
    pub old_price: i128,
    pub new_price: i128,
}

#[contractevent(topics = ["carbon", "bought"])]
#[derive(Clone)]
pub struct CreditBoughtEvent {
    #[topic]
    pub id: u64,
    #[topic]
    pub buyer: Address,
    #[topic]
    pub seller: Address,
    pub price: i128,
    pub seller_payout: i128,
    pub treasury_fee: i128,
}

#[contractevent(topics = ["carbon", "transferred"])]
#[derive(Clone)]
pub struct CreditTransferredEvent {
    #[topic]
    pub id: u64,
    #[topic]
    pub from: Address,
    #[topic]
    pub to: Address,
}

#[contractevent(topics = ["carbon", "retired"])]
#[derive(Clone)]
pub struct CreditRetiredEvent {
    #[topic]
    pub id: u64,
    #[topic]
    pub owner: Address,
    pub tonnes: i128,
    pub retired_at: u64,
}

// ── Contract ──────────────────────────────────────────────────────────────

#[contract]
pub struct CarbonExchange;

fn payment_token(env: &Env) -> Address {
    env.storage()
        .instance()
        .get(&DataKey::PaymentToken)
        .unwrap_or_else(|| panic_with_error!(env, CarbonError::Unauthorized))
}

fn treasury(env: &Env) -> Address {
    env.storage()
        .instance()
        .get(&DataKey::Treasury)
        .unwrap_or_else(|| panic_with_error!(env, CarbonError::Unauthorized))
}

fn fee_bps(env: &Env) -> u32 {
    env.storage().instance().get(&DataKey::FeeBps).unwrap_or(0)
}

fn require_admin(env: &Env) {
    let admin: Address = env
        .storage()
        .instance()
        .get(&DataKey::Admin)
        .unwrap_or_else(|| panic_with_error!(env, CarbonError::Unauthorized));
    admin.require_auth();
}

fn get_credit_internal(env: &Env, id: u64) -> CarbonCredit {
    env.storage()
        .persistent()
        .get(&DataKey::Credit(id))
        .unwrap_or_else(|| panic_with_error!(env, CarbonError::NotFound))
}

fn get_owner_internal(env: &Env, id: u64) -> Address {
    env.storage()
        .persistent()
        .get(&DataKey::Owner(id))
        .unwrap_or_else(|| panic_with_error!(env, CarbonError::NotFound))
}

fn bump_portfolio(env: &Env, holder: &Address, delta: i128) {
    let key = DataKey::PortfolioCount(holder.clone());
    let current: i128 = env.storage().persistent().get(&key).unwrap_or(0);
    let next = current.checked_add(delta).expect("portfolio overflow");
    if next < 0 {
        panic_with_error!(env, CarbonError::InvalidAmount);
    }
    env.storage().persistent().set(&key, &next);
}

#[contractimpl]
impl CarbonExchange {
    // ── Constructor ──────────────────────────────────────────────────

    pub fn __constructor(
        env: Env,
        admin: Address,
        payment_token: Address,
        treasury: Address,
        fee_bps: u32,
    ) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic_with_error!(&env, CarbonError::AlreadyInitialized);
        }
        if fee_bps > 10_000 {
            panic_with_error!(&env, CarbonError::InvalidAmount);
        }

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::PaymentToken, &payment_token);
        env.storage().instance().set(&DataKey::Treasury, &treasury);
        env.storage().instance().set(&DataKey::FeeBps, &fee_bps);
        env.storage().instance().set(&DataKey::NextId, &1u64);
        env.storage().instance().set(&DataKey::TotalIssued, &0i128);
        env.storage().instance().set(&DataKey::TotalRetired, &0i128);
    }

    // ── Accessors ────────────────────────────────────────────────────

    pub fn get_admin(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .unwrap_or_else(|| panic_with_error!(&env, CarbonError::Unauthorized))
    }

    pub fn get_payment_token(env: Env) -> Address {
        payment_token(&env)
    }

    pub fn get_treasury(env: Env) -> Address {
        treasury(&env)
    }

    pub fn get_fee_bps(env: Env) -> u32 {
        fee_bps(&env)
    }

    pub fn get_next_id(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::NextId).unwrap_or(1u64)
    }

    pub fn get_total_issued(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::TotalIssued).unwrap_or(0)
    }

    pub fn get_total_retired(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::TotalRetired).unwrap_or(0)
    }

    pub fn get_portfolio_count(env: Env, holder: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::PortfolioCount(holder))
            .unwrap_or(0)
    }

    pub fn get_credit(env: Env, id: u64) -> CarbonCredit {
        get_credit_internal(&env, id)
    }

    pub fn owner_of(env: Env, id: u64) -> Address {
        get_owner_internal(&env, id)
    }

    pub fn is_listed(env: Env, id: u64) -> bool {
        matches!(get_credit_internal(&env, id).status, CreditStatus::Listed)
    }

    // ══════════════════════════════════════════════════════════════════
    // ISSUE
    // ══════════════════════════════════════════════════════════════════

    /// Mint a new carbon-credit NFT. Admin-only: the exchange operator
    /// decides which certified projects get listed. The credit is owned by
    /// `issuer` and is immediately listed for sale at `price`.
    pub fn issue_credit(
        env: Env,
        issuer: Address,
        project_name: String,
        project_type: String,
        vintage_year: u32,
        tonnes: i128,
        price: i128,
        region: String,
        registry_id: String,
    ) -> u64 {
        require_admin(&env);

        if tonnes <= 0 {
            panic_with_error!(&env, CarbonError::InvalidAmount);
        }
        if price <= 0 {
            panic_with_error!(&env, CarbonError::InvalidAmount);
        }

        let next_id: u64 = env.storage().instance().get(&DataKey::NextId).unwrap_or(1u64);
        let now = env.ledger().timestamp();

        let credit = CarbonCredit {
            id: next_id,
            project_name,
            project_type,
            vintage_year,
            tonnes,
            price,
            region,
            registry_id,
            issuer: issuer.clone(),
            status: CreditStatus::Listed,
            listed_at: now,
            sold_at: 0,
            retired_at: 0,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Credit(next_id), &credit);
        env.storage()
            .persistent()
            .set(&DataKey::Owner(next_id), &issuer.clone());
        env.storage()
            .instance()
            .set(&DataKey::NextId, &(next_id + 1));

        let mut total_issued: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalIssued)
            .unwrap_or(0);
        total_issued = total_issued.checked_add(tonnes).expect("overflow");
        env.storage()
            .instance()
            .set(&DataKey::TotalIssued, &total_issued);

        bump_portfolio(&env, &issuer, 1);

        CreditIssuedEvent {
            id: next_id,
            issuer,
            tonnes,
            price,
        }
        .publish(&env);
        CreditListedEvent {
            id: next_id,
            price,
        }
        .publish(&env);

        next_id
    }

    // ══════════════════════════════════════════════════════════════════
    // LISTING
    // ══════════════════════════════════════════════════════════════════

    /// Owner puts a held credit up for sale at its current price.
    pub fn list_credit(env: Env, owner: Address, id: u64) {
        owner.require_auth();

        let mut credit = get_credit_internal(&env, id);
        if get_owner_internal(&env, id) != owner {
            panic_with_error!(&env, CarbonError::Unauthorized);
        }
        if matches!(credit.status, CreditStatus::Retired) {
            panic_with_error!(&env, CarbonError::AlreadyRetired);
        }

        credit.status = CreditStatus::Listed;
        credit.listed_at = env.ledger().timestamp();
        env.storage().persistent().set(&DataKey::Credit(id), &credit);

        CreditListedEvent {
            id,
            price: credit.price,
        }
        .publish(&env);
    }

    /// Owner removes a credit from the exchange (still holds it).
    pub fn unlist_credit(env: Env, owner: Address, id: u64) {
        owner.require_auth();

        let mut credit = get_credit_internal(&env, id);
        if get_owner_internal(&env, id) != owner {
            panic_with_error!(&env, CarbonError::Unauthorized);
        }
        if !matches!(credit.status, CreditStatus::Listed) {
            panic_with_error!(&env, CarbonError::InvalidStatus);
        }

        credit.status = CreditStatus::Sold;
        env.storage().persistent().set(&DataKey::Credit(id), &credit);

        CreditUnlistedEvent { id }.publish(&env);
    }

    /// Owner updates the asking price of a held credit.
    pub fn set_price(env: Env, owner: Address, id: u64, new_price: i128) {
        owner.require_auth();

        if new_price <= 0 {
            panic_with_error!(&env, CarbonError::InvalidAmount);
        }

        let mut credit = get_credit_internal(&env, id);
        if get_owner_internal(&env, id) != owner {
            panic_with_error!(&env, CarbonError::Unauthorized);
        }
        if matches!(credit.status, CreditStatus::Retired) {
            panic_with_error!(&env, CarbonError::AlreadyRetired);
        }

        let old_price = credit.price;
        credit.price = new_price;
        env.storage().persistent().set(&DataKey::Credit(id), &credit);

        PriceUpdatedEvent {
            id,
            old_price,
            new_price,
        }
        .publish(&env);
    }

    // ══════════════════════════════════════════════════════════════════
    // BUY
    // ══════════════════════════════════════════════════════════════════

    /// Buy a listed carbon credit. Buyer pays `price` in the payment token;
    /// the seller receives `price - fee` and the treasury receives the fee.
    /// Ownership of the NFT transfers to the buyer; the credit is no longer
    /// listed.
    pub fn buy_credit(env: Env, buyer: Address, id: u64) -> CarbonCredit {
        buyer.require_auth();

        let mut credit = get_credit_internal(&env, id);
        if !matches!(credit.status, CreditStatus::Listed) {
            panic_with_error!(&env, CarbonError::NotForSale);
        }

        let price = credit.price;
        let seller = get_owner_internal(&env, id);
        let bps: u32 = fee_bps(&env);
        let treasury_fee = price * (bps as i128) / 10_000;
        let seller_payout = price - treasury_fee;
        let now = env.ledger().timestamp();

        let token_client = token::TokenClient::new(&env, &payment_token(&env));
        let current_contract = env.current_contract_address();

        // buyer -> contract (full price)
        token_client.transfer(
            &buyer,
            &MuxedAddress::from(current_contract.clone()),
            &price,
        );
        // contract -> seller (net of fee)
        if seller_payout > 0 {
            token_client.transfer(
                &current_contract,
                &MuxedAddress::from(seller.clone()),
                &seller_payout,
            );
        }
        // contract -> treasury (fee)
        if treasury_fee > 0 {
            token_client.transfer(
                &current_contract,
                &MuxedAddress::from(treasury(&env)),
                &treasury_fee,
            );
        }

        // Ownership transfer + portfolio counters.
        bump_portfolio(&env, &seller, -1);
        bump_portfolio(&env, &buyer, 1);
        env.storage().persistent().set(&DataKey::Owner(id), &buyer.clone());

        credit.status = CreditStatus::Sold;
        credit.sold_at = now;
        env.storage().persistent().set(&DataKey::Credit(id), &credit);

        CreditBoughtEvent {
            id,
            buyer: buyer.clone(),
            seller: seller.clone(),
            price,
            seller_payout,
            treasury_fee,
        }
        .publish(&env);

        credit
    }

    // ══════════════════════════════════════════════════════════════════
    // TRANSFER
    // ══════════════════════════════════════════════════════════════════

    /// Owner transfers a credit to another address (gift / secondary sale
    /// settled off-exchange). Retired credits cannot be transferred.
    pub fn transfer_credit(env: Env, from: Address, to: Address, id: u64) {
        from.require_auth();

        if get_owner_internal(&env, id) != from {
            panic_with_error!(&env, CarbonError::Unauthorized);
        }
        let credit = get_credit_internal(&env, id);
        if matches!(credit.status, CreditStatus::Retired) {
            panic_with_error!(&env, CarbonError::AlreadyRetired);
        }

        bump_portfolio(&env, &from, -1);
        bump_portfolio(&env, &to, 1);
        env.storage().persistent().set(&DataKey::Owner(id), &to.clone());

        CreditTransferredEvent { id, from, to }.publish(&env);
    }

    // ══════════════════════════════════════════════════════════════════
    // RETIRE
    // ══════════════════════════════════════════════════════════════════

    /// Permanently retire a credit held by `owner` (the offset has been
    /// claimed). Retired credits can never be sold or transferred again.
    pub fn retire_credit(env: Env, owner: Address, id: u64) {
        owner.require_auth();

        if get_owner_internal(&env, id) != owner {
            panic_with_error!(&env, CarbonError::Unauthorized);
        }

        let mut credit = get_credit_internal(&env, id);
        if matches!(credit.status, CreditStatus::Retired) {
            panic_with_error!(&env, CarbonError::AlreadyRetired);
        }

        credit.status = CreditStatus::Retired;
        credit.retired_at = env.ledger().timestamp();
        env.storage().persistent().set(&DataKey::Credit(id), &credit);

        bump_portfolio(&env, &owner, -1);

        let mut total_retired: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalRetired)
            .unwrap_or(0);
        total_retired = total_retired.checked_add(credit.tonnes).expect("overflow");
        env.storage()
            .instance()
            .set(&DataKey::TotalRetired, &total_retired);

        CreditRetiredEvent {
            id,
            owner,
            tonnes: credit.tonnes,
            retired_at: credit.retired_at,
        }
        .publish(&env);
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::{Address as _, Ledger};
    use soroban_sdk::{Address, String};

    const FEE_BPS: u32 = 250; // 2.5%

    fn setup_token_env(env: &Env) -> (Address, Address, Address) {
        let admin = Address::generate(env);
        let sac = env.register_stellar_asset_contract_v2(admin.clone());
        let usdc = sac.address();
        let treasury = Address::generate(env);
        let contract_id = env.register(
            CarbonExchange,
            (admin.clone(), usdc.clone(), treasury.clone(), FEE_BPS),
        );
        (contract_id, usdc, admin)
    }

    fn issue(
        client: &CarbonExchangeClient,
        env: &Env,
        issuer: &Address,
        price: i128,
    ) -> u64 {
        client.issue_credit(
            issuer,
            &String::from_str(env, "Reforestation Delta"),
            &String::from_str(env, "reforestation"),
            &2024,
            &1_000i128,
            &price,
            &String::from_str(env, "PH-LZ-001"),
            &String::from_str(env, "REG-1001"),
        )
    }

    #[test]
    fn constructor_stores_config() {
        let env = Env::default();
        env.mock_all_auths();
        let (contract_id, _usdc, _admin) = setup_token_env(&env);
        let client = CarbonExchangeClient::new(&env, &contract_id);

        assert_eq!(client.get_fee_bps(), FEE_BPS);
        assert_eq!(client.get_next_id(), 1);
        assert_eq!(client.get_total_issued(), 0);
        assert_eq!(client.get_total_retired(), 0);
    }

    #[test]
    fn issue_credit_creates_listed_nft_owned_by_issuer() {
        let env = Env::default();
        env.mock_all_auths();
        let (contract_id, _usdc, _admin) = setup_token_env(&env);
        let client = CarbonExchangeClient::new(&env, &contract_id);
        let issuer = Address::generate(&env);

        let id = issue(&client, &env, &issuer, 50_000_000i128);

        let credit = client.get_credit(&id);
        assert_eq!(credit.id, id);
        assert_eq!(credit.tonnes, 1_000i128);
        assert_eq!(credit.price, 50_000_000i128);
        assert_eq!(credit.status, CreditStatus::Listed);
        assert_eq!(client.owner_of(&id), issuer);
        assert!(client.is_listed(&id));
        assert_eq!(client.get_portfolio_count(&issuer), 1);
        assert_eq!(client.get_total_issued(), 1_000i128);
    }

    #[test]
    #[should_panic(expected = "Error(Auth, InvalidAction)")]
    fn non_admin_cannot_issue() {
        let env = Env::default();
        let (contract_id, _usdc, _admin) = setup_token_env(&env);
        let client = CarbonExchangeClient::new(&env, &contract_id);
        let rogue = Address::generate(&env);

        // No auth is mocked: issue_credit requires the on-chain admin's
        // signature, so a non-admin caller is rejected with Unauthorized (#2).
        client.issue_credit(
            &rogue,
            &String::from_str(&env, "Reforestation Delta"),
            &String::from_str(&env, "reforestation"),
            &2024,
            &1_000i128,
            &10_000_000i128,
            &String::from_str(&env, "PH-LZ-001"),
            &String::from_str(&env, "REG-1001"),
        );
    }

    #[test]
    fn buy_credit_splits_payment_and_transfers_ownership() {
        let env = Env::default();
        env.mock_all_auths();
        let (contract_id, usdc, _admin) = setup_token_env(&env);
        let client = CarbonExchangeClient::new(&env, &contract_id);

        let seller = Address::generate(&env);
        let buyer = Address::generate(&env);
        let price = 10_000_000i128; // $10.00

        token::StellarAssetClient::new(&env, &usdc).mint(&buyer, &price);
        let id = issue(&client, &env, &seller, price);

        let credit = client.buy_credit(&buyer, &id);

        assert_eq!(credit.status, CreditStatus::Sold);
        assert_eq!(client.owner_of(&id), buyer);
        assert!(!client.is_listed(&id));
        assert_eq!(client.get_portfolio_count(&seller), 0);
        assert_eq!(client.get_portfolio_count(&buyer), 1);

        let token = token::TokenClient::new(&env, &usdc);
        // seller received price - 2.5% fee; treasury received the fee.
        assert_eq!(token.balance(&seller), 9_750_000i128);
        assert_eq!(token.balance(&buyer), 0);
        assert_eq!(token.balance(&contract_id), 0);
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #6)")]
    fn cannot_buy_unlisted_credit() {
        let env = Env::default();
        env.mock_all_auths();
        let (contract_id, usdc, _admin) = setup_token_env(&env);
        let client = CarbonExchangeClient::new(&env, &contract_id);

        let seller = Address::generate(&env);
        let buyer = Address::generate(&env);
        let price = 10_000_000i128;

        token::StellarAssetClient::new(&env, &usdc).mint(&buyer, &price);
        let id = issue(&client, &env, &seller, price);

        // First buy succeeds; second buy of the same (now Sold) credit fails.
        client.buy_credit(&buyer, &id);
        let buyer2 = Address::generate(&env);
        token::StellarAssetClient::new(&env, &usdc).mint(&buyer2, &price);
        client.buy_credit(&buyer2, &id);
    }

    #[test]
    fn relist_and_price_update_flow() {
        let env = Env::default();
        env.mock_all_auths();
        let (contract_id, _usdc, _admin) = setup_token_env(&env);
        let client = CarbonExchangeClient::new(&env, &contract_id);
        let owner = Address::generate(&env);

        let id = issue(&client, &env, &owner, 10_000_000i128);
        client.unlist_credit(&owner, &id);
        assert!(!client.is_listed(&id));

        client.set_price(&owner, &id, &12_000_000i128);
        client.list_credit(&owner, &id);
        assert!(client.is_listed(&id));
        assert_eq!(client.get_credit(&id).price, 12_000_000i128);
    }

    #[test]
    fn retire_credit_is_permanent_and_counts_towards_totals() {
        let env = Env::default();
        env.mock_all_auths();
        env.ledger().set_timestamp(1_716_000_000u64);
        let (contract_id, _usdc, _admin) = setup_token_env(&env);
        let client = CarbonExchangeClient::new(&env, &contract_id);
        let owner = Address::generate(&env);

        let id = issue(&client, &env, &owner, 10_000_000i128);
        client.retire_credit(&owner, &id);

        let credit = client.get_credit(&id);
        assert_eq!(credit.status, CreditStatus::Retired);
        assert_ne!(credit.retired_at, 0);
        assert_eq!(client.get_portfolio_count(&owner), 0);
        assert_eq!(client.get_total_retired(), 1_000i128);
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #7)")]
    fn retired_credit_cannot_be_transferred() {
        let env = Env::default();
        env.mock_all_auths();
        let (contract_id, _usdc, _admin) = setup_token_env(&env);
        let client = CarbonExchangeClient::new(&env, &contract_id);
        let owner = Address::generate(&env);
        let recipient = Address::generate(&env);

        let id = issue(&client, &env, &owner, 10_000_000i128);
        client.retire_credit(&owner, &id);
        client.transfer_credit(&owner, &recipient, &id);
    }

    #[test]
    fn transfer_updates_owner_and_portfolios() {
        let env = Env::default();
        env.mock_all_auths();
        let (contract_id, _usdc, _admin) = setup_token_env(&env);
        let client = CarbonExchangeClient::new(&env, &contract_id);
        let owner = Address::generate(&env);
        let recipient = Address::generate(&env);

        let id = issue(&client, &env, &owner, 10_000_000i128);
        client.transfer_credit(&owner, &recipient, &id);

        assert_eq!(client.owner_of(&id), recipient);
        assert_eq!(client.get_portfolio_count(&owner), 0);
        assert_eq!(client.get_portfolio_count(&recipient), 1);
    }
}
