use candid::{CandidType, Deserialize, Principal};
use ic_cdk::api::time;
use ic_cdk::{caller, export_candid, init, post_upgrade, pre_upgrade, query, update};
use serde::Serialize;
use std::collections::{HashMap, HashSet};

// ===== TYPE DEFINITIONS =====

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct Agreement {
    pub id: String,
    pub title: String,
    pub description: String,
    pub creator: Principal,
    pub participants: HashSet<Principal>,
    pub documents: Vec<DocumentRef>,
    pub milestones: Vec<Milestone>,
    pub voting_threshold: u8,
    pub status: AgreementStatus,
    pub created_at: u64,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct DocumentRef {
    pub doc_id: String,
    pub title: String,
    pub required_signers: HashSet<Principal>,
    pub current_signers: HashSet<Principal>,
    pub is_signed_by_all: bool,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct Milestone {
    pub id: u64,
    pub title: String,
    pub description: String,
    pub milestone_type: MilestoneType,
    pub recipient: Principal,
    pub amount: u128,
    pub status: MilestoneStatus,
    pub votes: HashMap<Principal, bool>,
    pub created_at: u64,
    pub completed_at: Option<u64>,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub enum MilestoneType {
    // Automatic - releases when document is signed by all required parties
    DocumentSignature {
        required_doc_id: String,
    },
    // Manual approval by DAO vote
    ManualApproval,
    // Time-based - releases after specific timestamp
    TimeRelease {
        release_time: u64,
    },
    // Multi-condition - requires multiple conditions
    MultiCondition {
        required_docs: Vec<String>,
        requires_vote: bool,
        min_time: Option<u64>,
    },
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub enum MilestoneStatus {
    Pending,        // Waiting for conditions
    ReadyForVoting, // Conditions met, needs DAO vote
    VotingActive,   // Currently being voted on
    Approved,       // Approved by DAO, ready for payment
    Executed,       // Payment completed
    Rejected,       // DAO rejected the milestone
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub enum AgreementStatus {
    Active,
    Completed,
    Cancelled,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct Event {
    pub event_type: String,
    pub agreement_id: String,
    pub milestone_id: Option<u64>,
    pub document_id: Option<String>,
    pub actor: Principal,
    pub details: String,
    pub timestamp: u64,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct CanisterState {
    pub agreements: HashMap<String, Agreement>,
    pub agreement_balances: HashMap<String, u128>,
    pub events: Vec<Event>,
    pub ledger_canister_id: Principal,
    pub admin: Principal,
}

#[derive(CandidType, Deserialize)]
pub struct ICRC1TransferArgs {
    pub from_subaccount: Option<Vec<u8>>,
    pub to: ICRC1Account,
    pub amount: u128,
    pub fee: Option<u128>,
    pub memo: Option<Vec<u8>>,
    pub created_at_time: Option<u64>,
}

#[derive(CandidType, Deserialize)]
pub struct ICRC1Account {
    pub owner: Principal,
    pub subaccount: Option<Vec<u8>>,
}

#[derive(CandidType, Deserialize, Debug)]
pub enum ICRC1TransferResult {
    Ok(u128),
    Err(ICRC1TransferError),
}

#[derive(CandidType, Deserialize, Debug)]
pub enum ICRC1TransferError {
    BadFee { expected_fee: u128 },
    BadBurn { min_burn_amount: u128 },
    InsufficientFunds { balance: u128 },
    TooOld,
    CreatedInFuture { ledger_time: u64 },
    Duplicate { duplicate_of: u128 },
    TemporarilyUnavailable,
    GenericError { error_code: u128, message: String },
}

// ===== STATE MANAGEMENT =====

thread_local! {
    static STATE: std::cell::RefCell<CanisterState> =
        std::cell::RefCell::new(CanisterState {
            agreements: HashMap::new(),
            agreement_balances: HashMap::new(),
            events: Vec::new(),
            ledger_canister_id: Principal::anonymous(),
            admin: Principal::anonymous(),
        });
}

// ===== HELPER FUNCTIONS =====

fn add_event(
    event_type: String,
    agreement_id: String,
    milestone_id: Option<u64>,
    document_id: Option<String>,
    details: String,
) {
    let event = Event {
        event_type,
        agreement_id,
        milestone_id,
        document_id,
        actor: caller(),
        details,
        timestamp: time(),
    };

    STATE.with(|state| {
        state.borrow_mut().events.push(event);
    });
}

fn is_participant(agreement_id: &String, user: Principal) -> bool {
    STATE.with(|state| {
        let state = state.borrow();
        if let Some(agreement) = state.agreements.get(agreement_id) {
            return agreement.creator == user
                || agreement.participants.contains(&user)
                || state.admin == user;
        }
        false
    })
}

fn check_milestone_conditions(agreement_id: &String, milestone_id: u64) -> bool {
    STATE.with(|state| {
        let state = state.borrow();
        let agreement = match state.agreements.get(agreement_id) {
            Some(a) => a,
            None => return false,
        };

        let milestone = match agreement.milestones.iter().find(|m| m.id == milestone_id) {
            Some(m) => m,
            None => return false,
        };

        match &milestone.milestone_type {
            MilestoneType::DocumentSignature { required_doc_id } => agreement
                .documents
                .iter()
                .find(|doc| doc.doc_id == *required_doc_id)
                .map(|doc| doc.is_signed_by_all)
                .unwrap_or(false),
            MilestoneType::TimeRelease { release_time } => time() >= *release_time,
            MilestoneType::MultiCondition {
                required_docs,
                min_time,
                ..
            } => {
                let docs_signed = required_docs.iter().all(|doc_id| {
                    agreement
                        .documents
                        .iter()
                        .find(|doc| doc.doc_id == *doc_id)
                        .map(|doc| doc.is_signed_by_all)
                        .unwrap_or(false)
                });

                let time_passed = min_time.map(|t| time() >= t).unwrap_or(true);

                docs_signed && time_passed
            }
            MilestoneType::ManualApproval => true,
        }
    })
}

async fn transfer_tokens(
    to_account: ICRC1Account,
    amount: u128,
    memo: Option<Vec<u8>>,
) -> Result<u128, ICRC1TransferError> {
    let ledger_id = STATE.with(|state| state.borrow().ledger_canister_id);

    if ledger_id == Principal::anonymous() {
        return Err(ICRC1TransferError::GenericError {
            error_code: 1,
            message: "Ledger canister ID not set".to_string(),
        });
    }

    let transfer_args = ICRC1TransferArgs {
        from_subaccount: None,
        to: to_account,
        amount,
        fee: None,
        memo,
        created_at_time: Some(time()),
    };

    let result: Result<(ICRC1TransferResult,), _> =
        ic_cdk::call(ledger_id, "icrc1_transfer", (transfer_args,)).await;

    match result {
        Ok((ICRC1TransferResult::Ok(block_index),)) => Ok(block_index),
        Ok((ICRC1TransferResult::Err(err),)) => Err(err),
        Err(_) => Err(ICRC1TransferError::TemporarilyUnavailable),
    }
}

// ===== AGREEMENT MANAGEMENT =====

#[update]
fn create_agreement(
    id: String,
    title: String,
    description: String,
    participants: Vec<Principal>,
    documents: Vec<DocumentRef>,
    milestones: Vec<Milestone>,
    voting_threshold: u8,
) -> Result<String, String> {
    if id.is_empty() || title.is_empty() {
        return Err("Agreement ID and title cannot be empty".to_string());
    }

    if voting_threshold < 50 || voting_threshold > 100 {
        return Err("Voting threshold must be between 50-100%".to_string());
    }

    if milestones.is_empty() {
        return Err("Agreement must have at least one milestone".to_string());
    }

    // Validate milestone IDs are unique
    let mut milestone_ids = HashSet::new();
    for milestone in &milestones {
        if !milestone_ids.insert(milestone.id) {
            return Err(format!("Duplicate milestone ID: {}", milestone.id));
        }
    }

    STATE.with(|state| {
        let mut state = state.borrow_mut();

        if state.agreements.contains_key(&id) {
            return Err("Agreement with this ID already exists".to_string());
        }

        let mut participant_set = HashSet::new();
        for p in participants {
            participant_set.insert(p);
        }

        let agreement = Agreement {
            id: id.clone(),
            title: title.clone(),
            description,
            creator: caller(),
            participants: participant_set,
            documents,
            milestones,
            voting_threshold,
            status: AgreementStatus::Active,
            created_at: time(),
        };

        state.agreements.insert(id.clone(), agreement);

        add_event(
            "create_agreement".to_string(),
            id.clone(),
            None,
            None,
            format!("Agreement '{}' created", title),
        );

        Ok(format!("Agreement '{}' created successfully", title))
    })
}

#[update]
fn add_participant(agreement_id: String, participant: Principal) -> Result<String, String> {
    STATE.with(|state| {
        let admin = state.borrow().admin;
        let mut state = state.borrow_mut();
        let agreement = state
            .agreements
            .get_mut(&agreement_id)
            .ok_or("Agreement not found")?;

        // Only creator or admin can add participants
        if caller() != agreement.creator && caller() != admin {
            return Err("Only agreement creator or admin can add participants".to_string());
        }

        if agreement.participants.insert(participant) {
            add_event(
                "add_participant".to_string(),
                agreement_id,
                None,
                None,
                format!("Added participant: {}", participant),
            );
            Ok(format!("Participant {} added to agreement", participant))
        } else {
            Err("Participant already exists in agreement".to_string())
        }
    })
}

#[update]
fn sign_document(agreement_id: String, doc_id: String) -> Result<String, String> {
    if !is_participant(&agreement_id, caller()) {
        return Err("Only agreement participants can sign documents".to_string());
    }

    STATE.with(|state| {
        let mut state = state.borrow_mut();
        let agreement = state
            .agreements
            .get_mut(&agreement_id)
            .ok_or("Agreement not found")?;

        let document = agreement
            .documents
            .iter_mut()
            .find(|doc| doc.doc_id == doc_id)
            .ok_or("Document not found")?;

        if !document.required_signers.contains(&caller()) {
            return Err("You are not required to sign this document".to_string());
        }

        document.current_signers.insert(caller());

        document.is_signed_by_all = document
            .required_signers
            .iter()
            .all(|signer| document.current_signers.contains(signer));

        add_event(
            "sign_document".to_string(),
            agreement_id.clone(),
            None,
            Some(doc_id.clone()),
            format!("Document '{}' signed", document.title),
        );

        let mut milestones_ready = Vec::new();
        for milestone in &mut agreement.milestones {
            if matches!(milestone.status, MilestoneStatus::Pending) {
                if check_milestone_conditions(&agreement_id, milestone.id) {
                    match &milestone.milestone_type {
                        MilestoneType::DocumentSignature { .. } => {
                            milestone.status = MilestoneStatus::Approved;
                        }
                        _ => {
                            milestone.status = MilestoneStatus::ReadyForVoting;
                        }
                    }
                    milestones_ready.push(milestone.id);
                }
            }
        }

        let mut result = format!("Document '{}' signed successfully", document.title);
        if !milestones_ready.is_empty() {
            result.push_str(&format!(". Milestones now ready: {:?}", milestones_ready));
        }

        Ok(result)
    })
}

#[update]
fn fund_agreement(agreement_id: String, amount: u128) -> Result<String, String> {
    if amount == 0 {
        return Err("Amount must be greater than zero".to_string());
    }

    STATE.with(|state| {
        let mut state = state.borrow_mut();

        if !is_participant(&agreement_id, caller()) {
            return Err("Only agreement participants can fund this agreement".to_string());
        }

        let current_balance = *state.agreement_balances.get(&agreement_id).unwrap_or(&0);
        let new_balance = current_balance
            .checked_add(amount)
            .ok_or("Balance overflow")?;

        state
            .agreement_balances
            .insert(agreement_id.clone(), new_balance);

        add_event(
            "fund_agreement".to_string(),
            agreement_id.clone(),
            None,
            None,
            format!("Funded with {} tokens", amount),
        );

        Ok(format!(
            "Agreement funded with {} tokens. New balance: {}",
            amount, new_balance
        ))
    })
}

#[update]
fn vote_milestone(
    agreement_id: String,
    milestone_id: u64,
    approve: bool,
) -> Result<String, String> {
    if !is_participant(&agreement_id, caller()) {
        return Err("Only agreement participants can vote".to_string());
    }

    STATE.with(|state| {
        let mut state = state.borrow_mut();
        let agreement = state
            .agreements
            .get_mut(&agreement_id)
            .ok_or("Agreement not found")?;

        let milestone = agreement
            .milestones
            .iter_mut()
            .find(|m| m.id == milestone_id)
            .ok_or("Milestone not found")?;

        if !matches!(
            milestone.status,
            MilestoneStatus::ReadyForVoting | MilestoneStatus::VotingActive
        ) {
            return Err("Milestone is not ready for voting".to_string());
        }

        milestone.votes.insert(caller(), approve);
        milestone.status = MilestoneStatus::VotingActive;

        let total_participants = agreement.participants.len() + 1;
        let approval_votes = milestone.votes.values().filter(|&&v| v).count();
        let required_votes = (total_participants * agreement.voting_threshold as usize + 99) / 100;

        let vote_result = if approval_votes >= required_votes {
            milestone.status = MilestoneStatus::Approved;
            "Milestone approved by DAO vote"
        } else {
            let rejection_votes = milestone.votes.values().filter(|&&v| !v).count();
            if rejection_votes > total_participants - required_votes {
                milestone.status = MilestoneStatus::Rejected;
                "Milestone rejected by DAO vote"
            } else {
                "Vote recorded, waiting for more votes"
            }
        };

        add_event(
            "vote_milestone".to_string(),
            agreement_id,
            Some(milestone_id),
            None,
            format!(
                "Voted {} on milestone {}",
                if approve { "approve" } else { "reject" },
                milestone_id
            ),
        );

        Ok(vote_result.to_string())
    })
}

#[update]
async fn execute_milestone(agreement_id: String, milestone_id: u64) -> Result<String, String> {
    let (milestone_amount, recipient, current_balance, milestone_title) = STATE.with(|state| {
        let state = state.borrow();

        let milestone = state
            .agreements
            .get(&agreement_id)
            .ok_or("Agreement not found")?
            .milestones
            .iter()
            .find(|m| m.id == milestone_id)
            .ok_or("Milestone not found")?;

        if !matches!(milestone.status, MilestoneStatus::Approved) {
            return Err("Milestone is not approved for execution".to_string());
        }

        let current_balance = *state.agreement_balances.get(&agreement_id).unwrap_or(&0);

        if current_balance < milestone.amount {
            return Err(format!(
                "Insufficient escrow balance. Required: {}, Available: {}",
                milestone.amount, current_balance
            ));
        }

        Ok((
            milestone.amount,
            milestone.recipient,
            current_balance,
            milestone.title.clone(),
        ))
    })?;

    let to_account = ICRC1Account {
        owner: recipient,
        subaccount: None,
    };

    let memo = format!(
        "Milestone {} payment for agreement {}",
        milestone_id, agreement_id
    );

    match transfer_tokens(to_account, milestone_amount, Some(memo.into_bytes())).await {
        Ok(block_index) => {
            STATE.with(|state| {
                let mut state = state.borrow_mut();

                let agreement = state.agreements.get_mut(&agreement_id).unwrap();
                let milestone = agreement
                    .milestones
                    .iter_mut()
                    .find(|m| m.id == milestone_id)
                    .unwrap();
                milestone.status = MilestoneStatus::Executed;
                milestone.completed_at = Some(time());

                let new_balance = current_balance - milestone_amount;
                state
                    .agreement_balances
                    .insert(agreement_id.clone(), new_balance);
            });

            add_event(
                "execute_milestone".to_string(),
                agreement_id,
                Some(milestone_id),
                None,
                format!(
                    "Milestone '{}' executed, payment: {} tokens",
                    milestone_title, milestone_amount
                ),
            );

            Ok(format!(
                "Milestone '{}' executed successfully. Transfer block: {}. Remaining balance: {}",
                milestone_title,
                block_index,
                current_balance - milestone_amount
            ))
        }
        Err(err) => Err(format!("Transfer failed: {:?}", err)),
    }
}

// ===== QUERY FUNCTIONS =====

#[query]
fn get_agreement(agreement_id: String) -> Option<Agreement> {
    STATE.with(|state| state.borrow().agreements.get(&agreement_id).cloned())
}

#[query]
fn get_my_agreements() -> Vec<Agreement> {
    let caller_principal = caller();
    STATE.with(|state| {
        state
            .borrow()
            .agreements
            .values()
            .filter(|agreement| {
                agreement.creator == caller_principal
                    || agreement.participants.contains(&caller_principal)
            })
            .cloned()
            .collect()
    })
}

#[query]
fn get_milestone_voting_status(
    agreement_id: String,
    milestone_id: u64,
) -> Result<MilestoneVotingInfo, String> {
    STATE.with(|state| {
        let state = state.borrow();
        let agreement = state
            .agreements
            .get(&agreement_id)
            .ok_or("Agreement not found")?;

        let milestone = agreement
            .milestones
            .iter()
            .find(|m| m.id == milestone_id)
            .ok_or("Milestone not found")?;

        let total_participants = agreement.participants.len() + 1; // +1 for creator
        let approval_votes = milestone.votes.values().filter(|&&v| v).count();
        let rejection_votes = milestone.votes.values().filter(|&&v| !v).count();
        let required_votes = (total_participants * agreement.voting_threshold as usize + 99) / 100;

        Ok(MilestoneVotingInfo {
            milestone_id,
            status: milestone.status.clone(),
            approval_votes: approval_votes as u64,
            rejection_votes: rejection_votes as u64,
            total_participants: total_participants as u64,
            required_votes: required_votes as u64,
            voting_threshold: agreement.voting_threshold,
        })
    })
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct MilestoneVotingInfo {
    pub milestone_id: u64,
    pub status: MilestoneStatus,
    pub approval_votes: u64,
    pub rejection_votes: u64,
    pub total_participants: u64,
    pub required_votes: u64,
    pub voting_threshold: u8,
}

#[query]
fn get_agreement_balance(agreement_id: String) -> u128 {
    STATE.with(|state| {
        *state
            .borrow()
            .agreement_balances
            .get(&agreement_id)
            .unwrap_or(&0)
    })
}

#[query]
fn list_events() -> Vec<Event> {
    STATE.with(|state| state.borrow().events.clone())
}

#[query]
fn get_canister_principal() -> Principal {
    ic_cdk::id()
}

// ===== ADMIN FUNCTIONS =====

#[update]
fn set_ledger_canister_id(canister_id: Principal) -> Result<String, String> {
    STATE.with(|state| {
        let admin = state.borrow().admin;
        if caller() != admin {
            return Err("Only admin can set ledger canister ID".to_string());
        }

        state.borrow_mut().ledger_canister_id = canister_id;
        Ok(format!("Ledger canister ID set to: {}", canister_id))
    })
}

// ===== CANISTER LIFECYCLE =====

#[init]
fn init(ledger_canister_id: Principal) {
    STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.admin = caller();
        state.ledger_canister_id = ledger_canister_id;
    });

    ic_cdk::println!(
        "Agreement Orchestrator initialized with admin: {} and ledger: {}",
        caller(),
        ledger_canister_id
    );
}

#[pre_upgrade]
fn pre_upgrade() {
    let state = STATE.with(|state| state.borrow().clone());

    ic_cdk::storage::stable_save((state,)).expect("Failed to save state before upgrade");

    ic_cdk::println!("State saved for upgrade");
}

#[post_upgrade]
fn post_upgrade() {
    let (state,): (CanisterState,) =
        ic_cdk::storage::stable_restore().expect("Failed to restore state after upgrade");

    STATE.with(|s| *s.borrow_mut() = state);

    ic_cdk::println!("State restored after upgrade");
}

export_candid!();
