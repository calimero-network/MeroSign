#![allow(clippy::len_without_is_empty)]

use calimero_sdk::borsh::{BorshDeserialize, BorshSerialize};
use calimero_sdk::serde::{Deserialize, Serialize};
use calimero_sdk::{app, env};
use calimero_storage::collections::{UnorderedMap, UnorderedSet, Vector};

mod types;
use types::id::UserId;

fn encode_blob_id_base58(blob_id_bytes: &[u8; 32]) -> String {
    let mut buf = [0u8; 44];
    let len = bs58::encode(blob_id_bytes).onto(&mut buf[..]).unwrap();
    std::str::from_utf8(&buf[..len]).unwrap().to_owned()
}

fn parse_blob_id_base58(blob_id_str: &str) -> Result<[u8; 32], String> {
    match bs58::decode(blob_id_str).into_vec() {
        Ok(bytes) => {
            if bytes.len() != 32 {
                return Err(format!(
                    "Invalid blob ID length: expected 32 bytes, got {}",
                    bytes.len()
                ));
            }
            let mut blob_id = [0u8; 32];
            blob_id.copy_from_slice(&bytes);
            Ok(blob_id)
        }
        Err(e) => Err(format!("Failed to decode blob ID '{}': {}", blob_id_str, e)),
    }
}

fn serialize_blob_id_bytes<S>(blob_id_bytes: &[u8; 32], serializer: S) -> Result<S::Ok, S::Error>
where
    S: calimero_sdk::serde::Serializer,
{
    let safe_string = encode_blob_id_base58(blob_id_bytes);
    serializer.serialize_str(&safe_string)
}

#[derive(Debug, Clone, BorshSerialize, BorshDeserialize, Serialize)]
#[borsh(crate = "calimero_sdk::borsh")]
#[serde(crate = "calimero_sdk::serde")]
pub struct SignatureRecord {
    pub id: u64,
    pub name: String,
    #[serde(serialize_with = "serialize_blob_id_bytes")]
    pub blob_id: [u8; 32],
    pub size: u64,
    pub created_at: u64,
}

#[derive(Debug, Clone, BorshSerialize, BorshDeserialize, Serialize)]
#[borsh(crate = "calimero_sdk::borsh")]
#[serde(crate = "calimero_sdk::serde")]
pub struct ContextAgreement {
    pub context_id: String,
    pub agreement_name: String,
    pub joined_at: u64,
}

/// Context types for different kinds of shared contexts
#[derive(Debug, Clone, PartialEq, BorshSerialize, BorshDeserialize, Serialize, Deserialize)]
#[borsh(crate = "calimero_sdk::borsh")]
#[serde(crate = "calimero_sdk::serde")]
pub enum ContextType {
    Default,
    DaoAgreement,
}

/// Participant roles in shared contexts
#[derive(Debug, Clone, BorshSerialize, BorshDeserialize, Serialize, Deserialize)]
#[borsh(crate = "calimero_sdk::borsh")]
#[serde(crate = "calimero_sdk::serde")]
pub enum ParticipantRole {
    Owner,
    Signer,
    Viewer,
    Unknown,
}

/// DAO Agreement milestone types
#[derive(Debug, Clone, BorshSerialize, BorshDeserialize, Serialize, Deserialize)]
#[borsh(crate = "calimero_sdk::borsh")]
#[serde(crate = "calimero_sdk::serde")]
pub enum MilestoneType {
    /// Automatic - releases when document is signed by all required parties
    DocumentSignature { required_doc_id: String },
    /// Manual approval by DAO vote
    ManualApproval,
    /// Time-based - releases after specific timestamp
    TimeRelease { release_time: u64 },
    /// Multi-condition - requires multiple conditions
    MultiCondition {
        required_docs: Vec<String>,
        requires_vote: bool,
        min_time: Option<u64>,
    },
}

/// DAO Agreement milestone status
#[derive(Debug, Clone, BorshSerialize, BorshDeserialize, Serialize, Deserialize)]
#[borsh(crate = "calimero_sdk::borsh")]
#[serde(crate = "calimero_sdk::serde")]
pub enum MilestoneStatus {
    Pending,        // Waiting for conditions
    ReadyForVoting, // Conditions met, needs DAO vote
    VotingActive,   // Currently being voted on
    Approved,       // Approved by DAO, ready for payment
    Executed,       // Payment completed
    Rejected,       // DAO rejected the milestone
}

/// DAO Agreement milestone
#[derive(Debug, Clone, BorshSerialize, BorshDeserialize, Serialize, Deserialize)]
#[borsh(crate = "calimero_sdk::borsh")]
#[serde(crate = "calimero_sdk::serde")]
pub struct DaoMilestone {
    pub id: u64,
    pub title: String,
    pub description: String,
    pub milestone_type: MilestoneType,
    pub recipient: UserId,
    pub amount: u128,
    pub status: MilestoneStatus,
    pub votes: std::collections::HashMap<String, bool>,
    pub created_at: u64,
    pub completed_at: Option<u64>,
}

/// DAO Agreement status
#[derive(Debug, Clone, BorshSerialize, BorshDeserialize, Serialize, Deserialize)]
#[borsh(crate = "calimero_sdk::borsh")]
#[serde(crate = "calimero_sdk::serde")]
pub enum AgreementStatus {
    Active,
    Completed,
    Cancelled,
}

/// DAO Agreement information
#[derive(Debug, Clone, BorshSerialize, BorshDeserialize, Serialize, Deserialize)]
#[borsh(crate = "calimero_sdk::borsh")]
#[serde(crate = "calimero_sdk::serde")]
pub struct DaoAgreement {
    pub id: String,
    pub title: String,
    pub description: String,
    pub creator: UserId,
    pub participants: std::collections::HashSet<String>,
    pub milestones: Vec<DaoMilestone>,
    pub voting_threshold: u8,
    pub status: AgreementStatus,
    pub created_at: u64,
    pub total_funding: u128,
    pub remaining_balance: u128,
}

/// Document chunk with its embedding
#[derive(Debug, Clone, BorshSerialize, BorshDeserialize, Serialize, Deserialize)]
#[borsh(crate = "calimero_sdk::borsh")]
#[serde(crate = "calimero_sdk::serde")]
pub struct DocumentChunk {
    pub text: String,
    pub embedding: Vec<f32>,
    pub start_position: usize,
    pub end_position: usize,
}

/// Document information
#[derive(Debug, Clone, BorshSerialize, BorshDeserialize, Serialize)]
#[borsh(crate = "calimero_sdk::borsh")]
#[serde(crate = "calimero_sdk::serde")]
pub struct DocumentInfo {
    pub id: String,
    pub name: String,
    pub hash: String,
    pub uploaded_by: UserId,
    pub uploaded_at: u64,
    pub status: DocumentStatus,
    #[serde(serialize_with = "serialize_blob_id_bytes")]
    pub pdf_blob_id: [u8; 32],
    pub size: u64,
    pub embeddings: Option<Vec<f32>>,
    pub extracted_text: Option<String>,
    pub chunks: Option<Vec<DocumentChunk>>,
}

/// Document status tracking
#[derive(Debug, Clone, PartialEq, BorshSerialize, BorshDeserialize, Serialize)]
#[borsh(crate = "calimero_sdk::borsh")]
#[serde(crate = "calimero_sdk::serde")]
pub enum DocumentStatus {
    Pending,
    PartiallySigned,
    FullySigned,
}

/// Signature record for documents
#[derive(Debug, Clone, BorshSerialize, BorshDeserialize, Serialize)]
#[borsh(crate = "calimero_sdk::borsh")]
#[serde(crate = "calimero_sdk::serde")]
pub struct DocumentSignature {
    pub signer: UserId,
    pub signed_at: u64,
}

/// Permission levels for participants
#[derive(Debug, Clone, PartialEq, BorshSerialize, BorshDeserialize, Serialize, Deserialize)]
#[borsh(crate = "calimero_sdk::borsh")]
#[serde(crate = "calimero_sdk::serde")]
pub enum PermissionLevel {
    Read,
    Sign,
    Admin,
}

#[app::state(emits = MeroDocsEvent)]
#[derive(BorshDeserialize, BorshSerialize)]
#[borsh(crate = "calimero_sdk::borsh")]
pub struct MeroDocsState {
    // Context type flag
    pub is_private: bool,

    pub owner: UserId,
    pub context_name: String,

    // Private context data
    pub signatures: UnorderedMap<String, SignatureRecord>,
    pub joined_contexts: UnorderedMap<String, ContextMetadata>,
    pub identity_mappings: UnorderedMap<String, IdentityMapping>,
    pub signature_count: u64,

    // Shared context data
    pub participants: UnorderedSet<UserId>,
    pub documents: UnorderedMap<String, DocumentInfo>,
    pub document_signatures: UnorderedMap<String, Vector<DocumentSignature>>,
    pub permissions: UnorderedMap<String, PermissionLevel>,
    pub consents: UnorderedMap<String, bool>,

    // DAO Agreement specific data
    pub dao_agreements: UnorderedMap<String, DaoAgreement>,
    pub context_type: ContextType,
}

/// Metadata for tracking joined shared contexts
#[derive(Debug, Clone, BorshSerialize, BorshDeserialize, Serialize, Deserialize)]
#[borsh(crate = "calimero_sdk::borsh")]
#[serde(crate = "calimero_sdk::serde")]
pub struct ContextMetadata {
    pub context_id: String,
    pub context_name: String,
    pub context_type: ContextType,
    pub role: ParticipantRole,
    pub joined_at: u64,
    pub private_identity: UserId, // User's private context identity
    pub shared_identity: UserId,  // User's identity in this shared context
}

/// Identity mapping for tracking user identities across contexts
#[derive(Debug, Clone, BorshSerialize, BorshDeserialize, Serialize, Deserialize)]
#[borsh(crate = "calimero_sdk::borsh")]
#[serde(crate = "calimero_sdk::serde")]
pub struct IdentityMapping {
    pub private_identity: UserId, // Original private context identity
    pub shared_identity: UserId,  // Identity used in specific shared context
    pub context_id: String,       // Which shared context this mapping is for
    pub created_at: u64,          // When this mapping was created
}

/// Participant information with permission level
#[derive(Debug, Clone, BorshSerialize, BorshDeserialize, Serialize, Deserialize)]
#[borsh(crate = "calimero_sdk::borsh")]
#[serde(crate = "calimero_sdk::serde")]
pub struct ParticipantInfo {
    pub user_id: UserId,
    pub permission_level: PermissionLevel,
}

/// Detailed information about a shared context
#[derive(Debug, Clone, BorshSerialize, BorshDeserialize, Serialize, Deserialize)]
#[borsh(crate = "calimero_sdk::borsh")]
#[serde(crate = "calimero_sdk::serde")]
pub struct ContextDetails {
    pub context_id: String,
    pub context_name: String,
    pub owner: UserId,
    pub is_private: bool,
    pub participant_count: u64,
    pub participants: Vec<ParticipantInfo>,
    pub document_count: u64,
    pub created_at: u64,
}

#[app::event]
#[derive(Debug, BorshSerialize, BorshDeserialize)]
#[borsh(crate = "calimero_sdk::borsh")]
pub enum MeroDocsEvent {
    // Private context events
    SignatureCreated {
        id: u64,
        name: String,
        size: u64,
    },
    SignatureDeleted {
        id: u64,
    },
    ContextJoined {
        context_id: String,
        context_name: String,
    },
    ContextLeft {
        context_id: String,
    },

    // Shared context events
    DocumentUploaded {
        id: String,
        name: String,
        uploaded_by: UserId,
    },
    DocumentDeleted {
        id: String,
    },
    DocumentSigned {
        document_id: String,
        signer: UserId,
    },
    ParticipantInvited {
        user_id: UserId,
        role: ParticipantRole,
    },
    ParticipantJoined {
        user_id: UserId,
    },
    ParticipantLeft {
        user_id: UserId,
    },
}

#[app::logic]
impl MeroDocsState {
    #[app::init]
    pub fn init(is_private: bool, context_name: String) -> MeroDocsState {
        let owner_raw = env::executor_id();
        let owner = UserId::new(owner_raw);

        let mut state = MeroDocsState {
            is_private,
            owner,
            context_name,

            signatures: UnorderedMap::new(),
            joined_contexts: UnorderedMap::new(),
            identity_mappings: UnorderedMap::new(),
            signature_count: 0,
            participants: UnorderedSet::new(),
            documents: UnorderedMap::new(),
            document_signatures: UnorderedMap::new(),
            permissions: UnorderedMap::new(),
            consents: UnorderedMap::new(),
            dao_agreements: UnorderedMap::new(),
            context_type: if is_private {
                ContextType::Default
            } else {
                ContextType::Default
            },
        };

        // For shared contexts, add the creator as a participant with admin permissions
        if !is_private {
            let _ = state.participants.insert(owner);
            let owner_str = format!("{:?}", owner);
            let _ = state.permissions.insert(owner_str, PermissionLevel::Admin);
        }

        state
    }

    pub fn is_default_private_context(&self) -> bool {
        self.is_private && self.context_name == "default"
    }

    /// Create a new signature and store its blob ID
    pub fn create_signature(
        &mut self,
        name: String,
        blob_id_str: String,
        data_size: u64,
    ) -> Result<u64, String> {
        if !self.is_private {
            return Err("Signatures can only be created in private context".to_string());
        }

        let signature_id = self.signature_count;
        self.signature_count += 1;

        let blob_id = parse_blob_id_base58(&blob_id_str)?;

        // Announce the signature blob to the network for discovery
        let current_context = env::context_id();
        if env::blob_announce_to_context(&blob_id, &current_context) {
            app::log!(
                "Successfully announced signature blob {} to network",
                blob_id_str
            );
        } else {
            app::log!(
                "Failed to announce signature blob {} to network",
                blob_id_str
            );
        }

        let signature = SignatureRecord {
            id: signature_id,
            name: name.clone(),
            blob_id,
            size: data_size,
            created_at: env::time_now(),
        };

        self.signatures
            .insert(signature_id.to_string(), signature)
            .map_err(|e| format!("Failed to store signature: {:?}", e))?;

        app::emit!(MeroDocsEvent::SignatureCreated {
            id: signature_id,
            name,
            size: data_size,
        });

        Ok(signature_id)
    }

    /// Delete a signature by ID
    pub fn delete_signature(&mut self, signature_id: u64) -> Result<(), String> {
        if !self.is_private {
            return Err("Signatures can only be deleted in private context".to_string());
        }

        let key = signature_id.to_string();

        match self.signatures.remove(&key) {
            Ok(Some(_)) => {
                app::emit!(MeroDocsEvent::SignatureDeleted { id: signature_id });
                Ok(())
            }
            Ok(None) => Err(format!("Signature not found: {}", signature_id)),
            Err(e) => Err(format!("Failed to delete signature: {:?}", e)),
        }
    }

    /// Get all signatures
    pub fn list_signatures(&self) -> Result<Vec<SignatureRecord>, String> {
        if !self.is_private {
            return Err("Signatures can only be accessed in private context".to_string());
        }

        let mut signatures = Vec::new();
        if let Ok(entries) = self.signatures.entries() {
            for (_, signature) in entries {
                signatures.push(signature.clone());
            }
        }
        Ok(signatures)
    }

    /// Join a shared context with identity mapping
    pub fn join_shared_context(
        &mut self,
        context_id: String,
        shared_identity: UserId,
        context_name: String,
    ) -> Result<(), String> {
        self.join_shared_context_with_type(
            context_id,
            shared_identity,
            context_name,
            ContextType::Default,
        )
    }

    /// Join a shared context with identity mapping and context type
    pub fn join_shared_context_with_type(
        &mut self,
        context_id: String,
        shared_identity: UserId,
        context_name: String,
        context_type: ContextType,
    ) -> Result<(), String> {
        if !self.is_private {
            return Err("Context joining can only be managed in private context".to_string());
        }

        if self.joined_contexts.contains(&context_id).unwrap_or(false) {
            return Err("Already joined this context".to_string());
        }

        let private_identity = self.owner;

        let metadata = ContextMetadata {
            context_id: context_id.clone(),
            context_name: context_name.clone(),
            context_type: context_type.clone(),
            role: ParticipantRole::Unknown,
            joined_at: env::time_now(),
            private_identity,
            shared_identity,
        };

        let identity_mapping = IdentityMapping {
            private_identity,
            shared_identity,
            context_id: context_id.clone(),
            created_at: env::time_now(),
        };

        self.joined_contexts
            .insert(context_id.clone(), metadata)
            .map_err(|e| format!("Failed to join context: {:?}", e))?;

        self.identity_mappings
            .insert(context_id.clone(), identity_mapping)
            .map_err(|e| format!("Failed to store identity mapping: {:?}", e))?;

        app::emit!(MeroDocsEvent::ContextJoined {
            context_id,
            context_name
        });
        Ok(())
    }

    /// Leave a shared context
    pub fn leave_shared_context(&mut self, context_id: String) -> Result<(), String> {
        if !self.is_private {
            return Err("Context leaving can only be managed in private context".to_string());
        }

        match self.joined_contexts.remove(&context_id) {
            Ok(Some(_)) => {
                app::emit!(MeroDocsEvent::ContextLeft { context_id });
                Ok(())
            }
            Ok(None) => Err("Context not found".to_string()),
            Err(e) => Err(format!("Failed to leave context: {:?}", e)),
        }
    }

    // === SHARED CONTEXT METHODS ===

    /// Get detailed information about the shared context
    pub fn get_context_details(&self, context_id: String) -> Result<ContextDetails, String> {
        let mut participants_with_permissions = Vec::new();

        if let Ok(iter) = self.participants.iter() {
            for participant in iter {
                let user_id_str = format!("{:?}", participant);
                let permission = self
                    .permissions
                    .get(&user_id_str)
                    .map_err(|e| format!("Failed to get permission for user: {:?}", e))?
                    .unwrap_or(PermissionLevel::Read);

                participants_with_permissions.push(ParticipantInfo {
                    user_id: participant.clone(),
                    permission_level: permission,
                });
            }
        }

        let document_count =
            self.documents
                .len()
                .map_err(|e| format!("Failed to get document count: {:?}", e))? as u64;

        let context_details = ContextDetails {
            context_id: context_id.clone(),
            context_name: self.context_name.clone(),
            owner: self.owner,
            is_private: self.is_private,
            participant_count: participants_with_permissions.len() as u64,
            participants: participants_with_permissions,
            document_count,
            created_at: env::time_now(),
        };

        Ok(context_details)
    }

    fn validate_admin_permissions(&self) -> Result<(), String> {
        if self.is_private {
            return Err("This method can only be called from shared context".to_string());
        }

        let current_user_str = format!("{:?}", self.owner);
        match self.permissions.get(&current_user_str) {
            Ok(Some(PermissionLevel::Admin)) => Ok(()),
            Ok(Some(_)) => Err("Admin permissions required for this operation".to_string()),
            Ok(None) => Err("User permissions not found".to_string()),
            Err(e) => Err(format!("Failed to check user permissions: {:?}", e)),
        }
    }

    /// Upload a document
    pub fn upload_document(
        &mut self,
        context_id: String,
        name: String,
        hash: String,
        pdf_blob_id_str: String,
        file_size: u64,
        embeddings: Option<Vec<f32>>,
        extracted_text: Option<String>,
        chunks: Option<Vec<DocumentChunk>>,
    ) -> Result<String, String> {
        let document_id = format!("doc_{}_{}", env::time_now(), name);

        if self.documents.contains(&document_id).unwrap_or(false) {
            return Err("Document with this ID already exists".to_string());
        }

        let pdf_blob_id_bytes = parse_blob_id_base58(&pdf_blob_id_str)?;

        // Announce blob to the network for discovery
        let current_context = env::context_id();
        if env::blob_announce_to_context(&pdf_blob_id_bytes, &current_context) {
            app::log!(
                "Successfully announced PDF blob {} to network",
                pdf_blob_id_str
            );
        } else {
            app::log!("Failed to announce PDF blob {} to network", pdf_blob_id_str);
        }

        let document = DocumentInfo {
            id: document_id.clone(),
            name: name.clone(),
            hash,
            uploaded_by: self.owner,
            uploaded_at: env::time_now(),
            status: DocumentStatus::Pending,
            pdf_blob_id: pdf_blob_id_bytes,
            size: file_size,
            embeddings,
            extracted_text,
            chunks,
        };

        self.documents
            .insert(document_id.clone(), document)
            .map_err(|e| format!("Failed to upload document: {:?}", e))?;

        self.document_signatures
            .insert(document_id.clone(), Vector::new())
            .map_err(|e| format!("Failed to initialize document signatures: {:?}", e))?;

        app::emit!(MeroDocsEvent::DocumentUploaded {
            id: document_id.clone(),
            name,
            uploaded_by: self.owner,
        });

        Ok(document_id)
    }

    /// Delete a document by ID
    pub fn delete_document(
        &mut self,
        context_id: String,
        document_id: String,
    ) -> Result<(), String> {
        self.validate_admin_permissions()?;

        match self.documents.remove(&document_id) {
            Ok(Some(_)) => {
                let _ = self.document_signatures.remove(&document_id);

                app::emit!(MeroDocsEvent::DocumentDeleted { id: document_id });

                Ok(())
            }
            Ok(None) => Err(format!("Document not found: {}", document_id)),
            Err(e) => Err(format!("Failed to delete document: {:?}", e)),
        }
    }

    /// List all documents
    pub fn list_documents(&self, context_id: String) -> Result<Vec<DocumentInfo>, String> {
        let mut documents = Vec::new();
        if let Ok(entries) = self.documents.entries() {
            for (_, document) in entries {
                documents.push(document.clone());
            }
        }
        Ok(documents)
    }

    /// In your set_consent and has_consented methods:
    pub fn set_consent(&mut self, user_id: UserId, document_id: String) -> Result<(), String> {
        let key = format!("{:?}|{}", user_id, document_id);
        self.consents
            .insert(key, true)
            .map_err(|e| format!("Failed to store consent: {:?}", e))?;
        Ok(())
    }

    /// Check if user has given consent for a document
    pub fn has_consented(&self, user_id: UserId, document_id: String) -> Result<bool, String> {
        let key = format!("{:?}|{}", user_id, document_id);
        match self.consents.get(&key) {
            Ok(Some(consented)) => Ok(consented),
            Ok(None) => Ok(false),
            Err(e) => Err(format!("Failed to check consent: {:?}", e)),
        }
    }
    pub fn sign_document(
        &mut self,
        context_id: String,
        document_id: String,
        pdf_blob_id_str: String,
        file_size: u64,
        new_hash: String,
        signer_id: UserId,
    ) -> Result<(), String> {
        let has_consent = self.has_consented(signer_id.clone(), document_id.clone())?;
        if !has_consent {
            return Err("User must provide consent before signing this document".to_string());
        }

        let mut document = match self.documents.get(&document_id) {
            Ok(Some(doc)) => doc,
            Ok(None) => return Err("Document not found".to_string()),
            Err(e) => return Err(format!("Failed to get document: {:?}", e)),
        };

        let pdf_blob_id_bytes = parse_blob_id_base58(&pdf_blob_id_str)?;

        // Announce the signed blob to the network for discovery
        let current_context = env::context_id();
        if env::blob_announce_to_context(&pdf_blob_id_bytes, &current_context) {
            app::log!(
                "Successfully announced signed PDF blob {} to network",
                pdf_blob_id_str
            );
        } else {
            app::log!(
                "Failed to announce signed PDF blob {} to network",
                pdf_blob_id_str
            );
        }

        // Announce the signed blob to the network for discovery
        let current_context = env::context_id();
        if env::blob_announce_to_context(&pdf_blob_id_bytes, &current_context) {
            app::log!(
                "Successfully announced signed PDF blob {} to network",
                pdf_blob_id_str
            );
        } else {
            app::log!(
                "Failed to announce signed PDF blob {} to network",
                pdf_blob_id_str
            );
        }

        document.pdf_blob_id = pdf_blob_id_bytes;
        document.size = file_size;
        document.hash = new_hash;
        document.status = DocumentStatus::PartiallySigned;

        self.documents
            .insert(document_id.clone(), document)
            .map_err(|e| format!("Failed to update document: {:?}", e))?;

        let signature = DocumentSignature {
            signer: signer_id,
            signed_at: env::time_now(),
        };

        let mut signatures = self
            .document_signatures
            .get(&document_id)
            .map_err(|e| format!("Failed to get document signatures: {:?}", e))?
            .unwrap_or_else(|| Vector::new());

        signatures
            .push(signature)
            .map_err(|e| format!("Failed to add signature: {:?}", e))?;

        self.document_signatures
            .insert(document_id.clone(), signatures)
            .map_err(|e| format!("Failed to update document signatures: {:?}", e))?;

        app::emit!(MeroDocsEvent::DocumentSigned {
            document_id,
            signer: signer_id,
        });

        Ok(())
    }

    /// Get signatures for a document
    pub fn get_document_signatures(
        &self,
        context_id: String,
        document_id: String,
    ) -> Result<Vec<DocumentSignature>, String> {
        let mut signatures = Vec::new();
        if let Ok(Some(sigs)) = self.document_signatures.get(&document_id) {
            if let Ok(iter) = sigs.iter() {
                for sig in iter {
                    signatures.push(sig.clone());
                }
            }
        }
        Ok(signatures)
    }

    /// Update document status to fully signed
    pub fn mark_participant_signed(
        &mut self,
        context_id: String,
        document_id: String,
        user_id: UserId,
    ) -> Result<(), String> {
        let has_consent = self.has_consented(user_id.clone(), document_id.clone())?;
        if !has_consent {
            return Err("User must provide consent before being marked as signed".to_string());
        }

        let mut document = match self.documents.get(&document_id) {
            Ok(Some(doc)) => doc,
            Ok(None) => return Err("Document not found".to_string()),
            Err(e) => return Err(format!("Failed to get document: {:?}", e)),
        };

        let signatures = self
            .document_signatures
            .get(&document_id)
            .map_err(|e| format!("Failed to get document signatures: {:?}", e))?
            .unwrap_or_else(|| Vector::new());

        let mut already_signed = false;
        if let Ok(iter) = signatures.iter() {
            for sig in iter {
                if sig.signer == user_id {
                    already_signed = true;
                    break;
                }
            }
        }
        if !already_signed {
            return Err("User has not signed this document yet".to_string());
        }

        let mut all_signed = true;
        if let Ok(participants_iter) = self.participants.iter() {
            for participant in participants_iter {
                let mut signed = false;
                if let Ok(sig_iter) = signatures.iter() {
                    for sig in sig_iter {
                        if sig.signer == participant {
                            signed = true;
                            break;
                        }
                    }
                }
                if !signed {
                    all_signed = false;
                    break;
                }
            }
        }

        if all_signed {
            document.status = DocumentStatus::FullySigned;
            self.documents
                .insert(document_id.clone(), document)
                .map_err(|e| format!("Failed to update document status: {:?}", e))?;
        }

        Ok(())
    }

    /// Add participant to shared context
    pub fn add_participant(
        &mut self,
        context_id: String,
        user_id: UserId,
        permission: PermissionLevel,
    ) -> Result<(), String> {
        self.validate_admin_permissions()?;

        if self.participants.contains(&user_id).unwrap_or(false) {
            return Err("User is already a participant".to_string());
        }

        self.participants
            .insert(user_id)
            .map_err(|e| format!("Failed to add participant: {:?}", e))?;

        let user_id_str = format!("{:?}", user_id);
        self.permissions
            .insert(user_id_str, permission.clone())
            .map_err(|e| format!("Failed to set permissions: {:?}", e))?;

        if permission == PermissionLevel::Sign {
            let mut docs_to_update = Vec::new();
            if let Ok(entries) = self.documents.entries() {
                for (_, document) in entries {
                    if document.status == DocumentStatus::FullySigned {
                        let mut updated_document = document.clone();
                        updated_document.status = DocumentStatus::PartiallySigned;
                        docs_to_update.push(updated_document);
                    }
                }
            }
            for document in docs_to_update {
                let _ = self.documents.insert(document.id.clone(), document);
            }
        }

        app::emit!(MeroDocsEvent::ParticipantJoined { user_id });

        Ok(())
    }
    /// Remove participant from shared context
    pub fn remove_participant(
        &mut self,
        context_id: String,
        user_id: UserId,
    ) -> Result<(), String> {
        self.validate_admin_permissions()?;

        if !self.participants.contains(&user_id).unwrap_or(false) {
            return Err("User is not a participant".to_string());
        }

        self.participants
            .remove(&user_id)
            .map_err(|e| format!("Failed to remove participant: {:?}", e))?;

        let user_id_str = format!("{:?}", user_id);
        self.permissions
            .remove(&user_id_str)
            .map_err(|e| format!("Failed to remove permissions: {:?}", e))?;

        app::emit!(MeroDocsEvent::ParticipantLeft { user_id });

        Ok(())
    }

    /// List all participants
    pub fn list_participants(&self, context_id: String) -> Result<Vec<UserId>, String> {
        let mut participants = Vec::new();
        if let Ok(iter) = self.participants.iter() {
            for participant in iter {
                participants.push(participant.clone());
            }
        }
        Ok(participants)
    }

    /// Get user permission level
    pub fn get_user_permission(
        &self,
        context_id: String,
        user_id: UserId,
    ) -> Result<PermissionLevel, String> {
        let user_id_str = format!("{:?}", user_id);
        match self.permissions.get(&user_id_str) {
            Ok(Some(perm)) => Ok(perm.clone()),
            Ok(None) => Err("User not found".to_string()),
            Err(e) => Err(format!("Failed to get permission: {:?}", e)),
        }
    }

    /// Get current context ID
    pub fn get_context_id(&self) -> String {
        if self.is_private {
            format!("private_{}", format!("{:?}", self.owner))
        } else {
            self.context_name.clone()
        }
    }

    /// Get identity mapping for a specific context
    pub fn get_identity_mapping(&self, context_id: String) -> Result<IdentityMapping, String> {
        if !self.is_private {
            return Err("Identity mappings can only be accessed in private context".to_string());
        }

        match self.identity_mappings.get(&context_id) {
            Ok(Some(mapping)) => Ok(mapping.clone()),
            Ok(None) => Err("Identity mapping not found for this context".to_string()),
            Err(e) => Err(format!("Failed to get identity mapping: {:?}", e)),
        }
    }

    /// Get shared identity for a specific context
    pub fn get_shared_identity(&self, context_id: String) -> Result<UserId, String> {
        if !self.is_private {
            return Err("Identity resolution can only be done in private context".to_string());
        }

        let mapping = self.get_identity_mapping(context_id)?;
        Ok(mapping.shared_identity)
    }

    /// Resolve private identity from shared identity
    pub fn resolve_private_identity(
        &self,
        shared_identity: UserId,
    ) -> Result<Option<UserId>, String> {
        if self.is_private {
            if let Ok(entries) = self.identity_mappings.entries() {
                for (_, mapping) in entries {
                    if mapping.shared_identity == shared_identity {
                        return Ok(Some(mapping.private_identity));
                    }
                }
            }
            Ok(None)
        } else {
            Err("Cannot resolve private identity from shared context".to_string())
        }
    }

    pub fn search_document_by_embedding(
        &self,
        query_embedding: Vec<f32>,
        document_id: String,
    ) -> Result<String, String> {
        let document = match self.documents.get(&document_id) {
            Ok(Some(doc)) => doc,
            Ok(None) => return Err(format!("Document with ID '{}' not found", document_id)),
            Err(e) => return Err(format!("Failed to access document: {:?}", e)),
        };

        if let Some(chunks) = &document.chunks {
            if chunks.is_empty() {
                return Err("Document has no chunks for semantic search".to_string());
            }

            if chunks[0].embedding.len() != query_embedding.len() {
                return Err(format!(
                    "Embedding dimension mismatch: query={}, document chunks={}",
                    query_embedding.len(),
                    chunks[0].embedding.len()
                ));
            }

            let mut chunk_similarities: Vec<(&DocumentChunk, f32)> = chunks
                .iter()
                .map(|chunk| {
                    let similarity = cosine_similarity(&query_embedding, &chunk.embedding);
                    (chunk, similarity)
                })
                .filter(|(_, similarity)| *similarity > 0.1)
                .collect();

            if chunk_similarities.is_empty() {
                return Ok(format!(
                    "Document: {}\nNo relevant sections found for your query. The document may not contain information related to your question.",
                    document.name
                ));
            }

            chunk_similarities
                .sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

            let top_chunks: Vec<String> = chunk_similarities
                .into_iter()
                .take(3)
                .map(|(chunk, similarity)| {
                    let clean_text = chunk
                        .text
                        .trim()
                        .replace('\n', " ")
                        .replace('\r', " ")
                        .replace("  ", " ");

                    let max_chars = if similarity > 0.5 {
                        300
                    } else if similarity > 0.3 {
                        200
                    } else {
                        150
                    };

                    let display_text = if clean_text.len() > max_chars {
                        format!("{}...", &clean_text[..max_chars])
                    } else {
                        clean_text
                    };

                    format!("[Relevance: {:.2}] {}", similarity, display_text)
                })
                .collect();

            return Ok(format!(
                "Document: {}\nMost relevant sections:\n\n{}",
                document.name,
                top_chunks.join("\n\n")
            ));
        }

        let doc_embedding = match &document.embeddings {
            Some(embedding) => embedding,
            None => return Err("Document has no embeddings for semantic search".to_string()),
        };

        if doc_embedding.len() != query_embedding.len() {
            return Err(format!(
                "Embedding dimension mismatch: query={}, document={}",
                query_embedding.len(),
                doc_embedding.len()
            ));
        }

        let similarity = cosine_similarity(&query_embedding, doc_embedding);

        if similarity < 0.05 {
            return Ok(format!(
                "Document: {} (Low relevance: {:.2})\nNo highly relevant content found for your query.",
                document.name, similarity
            ));
        }

        let text_snippet = if let Some(ref full_text) = document.extracted_text {
            let clean_text = full_text
                .replace('\n', " ")
                .replace('\r', " ")
                .replace("  ", " ");

            let max_chars = if similarity > 0.4 {
                400
            } else if similarity > 0.2 {
                250
            } else {
                200
            };

            if clean_text.len() > max_chars {
                format!("{}...", &clean_text[..max_chars])
            } else {
                clean_text
            }
        } else {
            format!("Document: {} (No extracted text available)", document.name)
        };

        Ok(format!(
            "Document: {} (Similarity: {:.2})\n{}",
            document.name, similarity, text_snippet
        ))
    }

    /// Initialize a context as a DAO agreement context
    pub fn initialize_dao_context(&mut self, context_id: String) -> Result<(), String> {
        if self.is_private {
            return Err("DAO context can only be initialized in shared context".to_string());
        }

        self.context_type = ContextType::DaoAgreement;
        Ok(())
    }

    /// Create a new DAO agreement
    pub fn create_dao_agreement(
        &mut self,
        agreement_id: String,
        title: String,
        participants: Vec<UserId>,
        milestones: Vec<DaoMilestone>,
        voting_threshold: u8,
        total_funding: u128,
    ) -> Result<String, String> {
        if self.context_type != ContextType::DaoAgreement {
            return Err("This context is not configured for DAO agreements".to_string());
        }

        if agreement_id.is_empty() || title.is_empty() {
            return Err("Agreement ID and title cannot be empty".to_string());
        }

        if voting_threshold < 50 || voting_threshold > 100 {
            return Err("Voting threshold must be between 50-100%".to_string());
        }

        if milestones.is_empty() {
            return Err("Agreement must have at least one milestone".to_string());
        }

        if total_funding == 0 {
            return Err("Total funding must be greater than zero".to_string());
        }

        // Validate milestone IDs are unique
        let mut milestone_ids = std::collections::HashSet::new();
        for milestone in &milestones {
            if !milestone_ids.insert(milestone.id) {
                return Err(format!("Duplicate milestone ID: {}", milestone.id));
            }
        }

        // Validate that milestone amounts don't exceed total funding
        let total_milestone_amount: u128 = milestones.iter().map(|m| m.amount).sum();
        if total_milestone_amount > total_funding {
            return Err(format!(
                "Total milestone amounts ({}) exceed total funding ({})",
                total_milestone_amount, total_funding
            ));
        }

        if self.dao_agreements.contains(&agreement_id).unwrap_or(false) {
            return Err("Agreement with this ID already exists".to_string());
        }

        let mut participant_set = std::collections::HashSet::new();
        for p in participants {
            participant_set.insert(format!("{:?}", p));
        }

        let agreement = DaoAgreement {
            id: agreement_id.clone(),
            title: title.clone(),
            description: String::new(),
            creator: self.owner,
            participants: participant_set,
            milestones,
            voting_threshold,
            status: AgreementStatus::Active,
            created_at: env::time_now(),
            total_funding,
            remaining_balance: 0, // Initially no funds are deposited
        };

        self.dao_agreements
            .insert(agreement_id.clone(), agreement)
            .map_err(|e| format!("Failed to create DAO agreement: {:?}", e))?;

        Ok(format!(
            "DAO Agreement '{}' created successfully with total funding of {} tokens",
            title, total_funding
        ))
    }

    /// Add a milestone to an existing DAO agreement
    pub fn add_milestone_to_agreement(
        &mut self,
        agreement_id: String,
        milestone: DaoMilestone,
    ) -> Result<(), String> {
        if self.context_type != ContextType::DaoAgreement {
            return Err("This context is not configured for DAO agreements".to_string());
        }

        let mut agreement = match self.dao_agreements.get(&agreement_id) {
            Ok(Some(agreement)) => agreement,
            Ok(None) => return Err("DAO Agreement not found".to_string()),
            Err(e) => return Err(format!("Failed to get DAO agreement: {:?}", e)),
        };

        // Check if milestone ID already exists
        for existing_milestone in &agreement.milestones {
            if existing_milestone.id == milestone.id {
                return Err(format!("Milestone with ID {} already exists", milestone.id));
            }
        }

        agreement.milestones.push(milestone);

        self.dao_agreements
            .insert(agreement_id, agreement)
            .map_err(|e| format!("Failed to add milestone: {:?}", e))?;

        Ok(())
    }

    /// Fund a DAO agreement
    pub fn fund_dao_agreement(
        &mut self,
        agreement_id: String,
        amount: u128,
    ) -> Result<String, String> {
        if self.context_type != ContextType::DaoAgreement {
            return Err("This context is not configured for DAO agreements".to_string());
        }

        if amount == 0 {
            return Err("Amount must be greater than zero".to_string());
        }

        let mut agreement = match self.dao_agreements.get(&agreement_id) {
            Ok(Some(agreement)) => agreement,
            Ok(None) => return Err("DAO Agreement not found".to_string()),
            Err(e) => return Err(format!("Failed to get DAO agreement: {:?}", e)),
        };

        let caller_str = format!("{:?}", self.owner);
        if agreement.creator != self.owner && !agreement.participants.contains(&caller_str) {
            return Err("Only agreement participants can fund this agreement".to_string());
        }

        let new_total = agreement
            .total_funding
            .checked_add(amount)
            .ok_or("Total funding overflow")?;

        let new_balance = agreement
            .remaining_balance
            .checked_add(amount)
            .ok_or("Balance overflow")?;

        agreement.total_funding = new_total;
        agreement.remaining_balance = new_balance;

        self.dao_agreements
            .insert(agreement_id.clone(), agreement)
            .map_err(|e| format!("Failed to fund agreement: {:?}", e))?;

        Ok(format!(
            "Agreement funded with {} tokens. New balance: {}",
            amount, new_balance
        ))
    }

    /// Vote on a milestone
    pub fn vote_on_milestone(
        &mut self,
        agreement_id: String,
        milestone_id: u64,
        approve: bool,
    ) -> Result<String, String> {
        if self.context_type != ContextType::DaoAgreement {
            return Err("This context is not configured for DAO agreements".to_string());
        }

        let mut agreement = match self.dao_agreements.get(&agreement_id) {
            Ok(Some(agreement)) => agreement,
            Ok(None) => return Err("DAO Agreement not found".to_string()),
            Err(e) => return Err(format!("Failed to get DAO agreement: {:?}", e)),
        };

        let caller_str = format!("{:?}", self.owner);
        if agreement.creator != self.owner && !agreement.participants.contains(&caller_str) {
            return Err("Only agreement participants can vote".to_string());
        }

        // Find the milestone
        let milestone_index = agreement
            .milestones
            .iter()
            .position(|m| m.id == milestone_id)
            .ok_or("Milestone not found")?;

        let milestone = &mut agreement.milestones[milestone_index];

        if !matches!(
            milestone.status,
            MilestoneStatus::ReadyForVoting | MilestoneStatus::VotingActive
        ) {
            return Err("Milestone is not ready for voting".to_string());
        }

        milestone.votes.insert(caller_str.clone(), approve);
        milestone.status = MilestoneStatus::VotingActive;

        let total_participants = agreement.participants.len() + 1; // +1 for creator
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

        self.dao_agreements
            .insert(agreement_id, agreement)
            .map_err(|e| format!("Failed to record vote: {:?}", e))?;

        Ok(vote_result.to_string())
    }

    /// Mark milestone as executed (simulated payment)
    pub fn execute_milestone(
        &mut self,
        agreement_id: String,
        milestone_id: u64,
    ) -> Result<String, String> {
        if self.context_type != ContextType::DaoAgreement {
            return Err("This context is not configured for DAO agreements".to_string());
        }

        let mut agreement = match self.dao_agreements.get(&agreement_id) {
            Ok(Some(agreement)) => agreement,
            Ok(None) => return Err("DAO Agreement not found".to_string()),
            Err(e) => return Err(format!("Failed to get DAO agreement: {:?}", e)),
        };

        // Find the milestone
        let milestone_index = agreement
            .milestones
            .iter()
            .position(|m| m.id == milestone_id)
            .ok_or("Milestone not found")?;

        let milestone = &mut agreement.milestones[milestone_index];

        if !matches!(milestone.status, MilestoneStatus::Approved) {
            return Err("Milestone is not approved for execution".to_string());
        }

        if agreement.remaining_balance < milestone.amount {
            return Err(format!(
                "Insufficient escrow balance. Required: {}, Available: {}",
                milestone.amount, agreement.remaining_balance
            ));
        }

        // Update milestone status
        milestone.status = MilestoneStatus::Executed;
        milestone.completed_at = Some(env::time_now());

        // Update agreement balance
        agreement.remaining_balance = agreement.remaining_balance - milestone.amount;

        // Capture values we need for the return message before moving agreement
        let milestone_title = milestone.title.clone();
        let milestone_amount = milestone.amount;
        let remaining_balance = agreement.remaining_balance;

        self.dao_agreements
            .insert(agreement_id.clone(), agreement)
            .map_err(|e| format!("Failed to execute milestone: {:?}", e))?;

        Ok(format!(
            "Milestone '{}' executed successfully. Payment: {} tokens. Remaining balance: {}",
            milestone_title, milestone_amount, remaining_balance
        ))
    }

    /// Get DAO agreement details
    pub fn get_dao_agreement(&self, agreement_id: String) -> Result<DaoAgreement, String> {
        if self.context_type != ContextType::DaoAgreement {
            return Err("This context is not configured for DAO agreements".to_string());
        }

        match self.dao_agreements.get(&agreement_id) {
            Ok(Some(agreement)) => Ok(agreement),
            Ok(None) => Err("DAO Agreement not found".to_string()),
            Err(e) => Err(format!("Failed to get DAO agreement: {:?}", e)),
        }
    }

    /// List all DAO agreements in this context
    pub fn list_dao_agreements(&self) -> Result<Vec<DaoAgreement>, String> {
        if self.context_type != ContextType::DaoAgreement {
            return Err("This context is not configured for DAO agreements".to_string());
        }

        let mut agreements = Vec::new();
        if let Ok(entries) = self.dao_agreements.entries() {
            for (_, agreement) in entries {
                agreements.push(agreement);
            }
        }
        Ok(agreements)
    }

    /// Get milestone details
    pub fn get_milestone_details(
        &self,
        agreement_id: String,
        milestone_id: u64,
    ) -> Result<DaoMilestone, String> {
        if self.context_type != ContextType::DaoAgreement {
            return Err("This context is not configured for DAO agreements".to_string());
        }

        let agreement = match self.dao_agreements.get(&agreement_id) {
            Ok(Some(agreement)) => agreement,
            Ok(None) => return Err("DAO Agreement not found".to_string()),
            Err(e) => return Err(format!("Failed to get DAO agreement: {:?}", e)),
        };

        let milestone = agreement
            .milestones
            .iter()
            .find(|m| m.id == milestone_id)
            .ok_or("Milestone not found")?;

        Ok(milestone.clone())
    }

    /// Get voting status for a milestone
    pub fn get_milestone_voting_status(
        &self,
        agreement_id: String,
        milestone_id: u64,
    ) -> Result<MilestoneVotingInfo, String> {
        if self.context_type != ContextType::DaoAgreement {
            return Err("This context is not configured for DAO agreements".to_string());
        }

        let agreement = match self.dao_agreements.get(&agreement_id) {
            Ok(Some(agreement)) => agreement,
            Ok(None) => return Err("DAO Agreement not found".to_string()),
            Err(e) => return Err(format!("Failed to get DAO agreement: {:?}", e)),
        };

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
    }

    /// List all joined contexts
    pub fn list_joined_contexts(&self) -> Result<Vec<ContextMetadata>, String> {
        if !self.is_private {
            return Err("Joined contexts can only be accessed in private context".to_string());
        }

        let mut contexts = Vec::new();
        if let Ok(entries) = self.joined_contexts.entries() {
            for (_, metadata) in entries {
                contexts.push(metadata.clone());
            }
        }

        // Sort by context type first, then by context name
        contexts.sort_by(|a, b| match (&a.context_type, &b.context_type) {
            (ContextType::Default, ContextType::DaoAgreement) => std::cmp::Ordering::Less,
            (ContextType::DaoAgreement, ContextType::Default) => std::cmp::Ordering::Greater,
            _ => a.context_name.cmp(&b.context_name),
        });

        Ok(contexts)
    }

    /// Get context type
    pub fn get_context_type(&self) -> ContextType {
        self.context_type.clone()
    }
}

fn cosine_similarity(a: &Vec<f32>, b: &Vec<f32>) -> f32 {
    let dot_product: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    let norm_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
    let norm_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();
    if norm_a == 0.0 || norm_b == 0.0 {
        0.0
    } else {
        dot_product / (norm_a * norm_b)
    }
}

/// Milestone voting information
#[derive(Debug, Clone, BorshSerialize, BorshDeserialize, Serialize, Deserialize)]
#[borsh(crate = "calimero_sdk::borsh")]
#[serde(crate = "calimero_sdk::serde")]
pub struct MilestoneVotingInfo {
    pub milestone_id: u64,
    pub status: MilestoneStatus,
    pub approval_votes: u64,
    pub rejection_votes: u64,
    pub total_participants: u64,
    pub required_votes: u64,
    pub voting_threshold: u8,
}
