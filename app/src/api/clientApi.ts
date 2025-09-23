import { type ApiResponse } from '@calimero-network/calimero-client';

export type UserId = string;

export enum ClientMethod {
  CREATE_SIGNATURE = 'create_signature',
  DELETE_SIGNATURE = 'delete_signature',
  LIST_SIGNATURES = 'list_signatures',
  GET_SIGNATURE_DATA = 'get_signature_data',
  JOIN_SHARED_CONTEXT = 'join_shared_context',
  LIST_JOINED_CONTEXTS = 'list_joined_contexts',
  LEAVE_SHARED_CONTEXT = 'leave_shared_context',
  UPLOAD_DOCUMENT = 'upload_document',
  DELETE_DOCUMENT = 'delete_document',
  LIST_DOCUMENTS = 'list_documents',
  SIGN_DOCUMENT = 'sign_document',
  GET_DOCUMENT_SIGNATURES = 'get_document_signatures',
  MARK_DOCUMENT_FULLY_SIGNED = 'mark_document_fully_signed',
  GET_CONTEXT_DETAILS = 'get_context_details',
  ADD_PARTICIPANT = 'add_participant',
  MARK_PARTICIPANT_SIGNED = 'mark_participant_signed',
  SET_CONSENT = 'set_consent',
  HAS_CONSENTED = 'has_consented',
  IS_DEFAULT_PRIVATE_CONTEXT = 'is_default_private_context',
  SEARCH_DOCUMENT_BY_EMBEDDING = 'search_document_by_embedding',
  INITIALIZE_DAO_CONTEXT = 'initialize_dao_context',
  CREATE_DAO_AGREEMENT = 'create_dao_agreement',
  ADD_MILESTONE_TO_AGREEMENT = 'add_milestone_to_agreement',
  FUND_DAO_AGREEMENT = 'fund_dao_agreement',
  VOTE_ON_MILESTONE = 'vote_on_milestone',
  EXECUTE_MILESTONE = 'execute_milestone',
  GET_DAO_AGREEMENT = 'get_dao_agreement',
  LIST_DAO_AGREEMENTS = 'list_dao_agreements',
  GET_MILESTONE_DETAILS = 'get_milestone_details',
  GET_MILESTONE_VOTING_STATUS = 'get_milestone_voting_status',
  GET_CONTEXT_TYPE = 'get_context_type',
  JOIN_DAO_AGREEMENT_CONTEXT = 'join_dao_agreement_context',
}

export interface SignatureRecord {
  id: number;
  name: string;
  blob_id: string;
  size: number;
  created_at: number;
}

export interface SavedSignature {
  id: number;
  name: string;
  dataURL: string;
  createdAt: string;
  size: number;
}

export interface ContextMetadata {
  context_id: string;
  context_name: string;
  context_type: ContextType;
  role: string;
  joined_at: number;
  private_identity: UserId;
  shared_identity: UserId;
}

export enum ContextType {
  Default = 'Default',
  DaoAgreement = 'DaoAgreement',
}

export enum MilestoneType {
  DocumentSignature = 'DocumentSignature',
  ManualApproval = 'ManualApproval',
  TimeRelease = 'TimeRelease',
  MultiCondition = 'MultiCondition',
}

export enum MilestoneStatus {
  Pending = 'Pending',
  ReadyForVoting = 'ReadyForVoting',
  VotingActive = 'VotingActive',
  Approved = 'Approved',
  Executed = 'Executed',
  Rejected = 'Rejected',
}

export enum AgreementStatus {
  Active = 'Active',
  Completed = 'Completed',
  Cancelled = 'Cancelled',
}

export interface DaoMilestone {
  id: number;
  title: string;
  description: string;
  milestone_type: MilestoneType;
  recipient: UserId;
  amount: string;
  status: MilestoneStatus;
  votes: Record<string, boolean>;
  created_at: number;
  completed_at?: number;
}

export interface DaoAgreement {
  id: string;
  title: string;
  description: string;
  creator: UserId;
  participants: string[];
  milestones: DaoMilestone[];
  voting_threshold: number;
  status: AgreementStatus;
  created_at: number;
  total_funding: string; // Use string for large numbers
  remaining_balance: string; // Use string for large numbers
}

export interface MilestoneVotingInfo {
  milestone_id: number;
  status: MilestoneStatus;
  approval_votes: number;
  rejection_votes: number;
  total_participants: number;
  required_votes: number;
  voting_threshold: number;
}

export enum DocumentStatus {
  Pending = 'Pending',
  PartiallySigned = 'PartiallySigned',
  FullySigned = 'FullySigned',
}

export enum PermissionLevel {
  Read = 'Read',
  Sign = 'Sign',
  Admin = 'Admin',
}

export interface ParticipantInfo {
  user_id: UserId;
  permission_level: PermissionLevel;
}

export interface ContextDetails {
  context_id: string;
  context_name: string;
  owner: UserId;
  is_private: boolean;
  participant_count: number;
  participants: ParticipantInfo[];
  document_count: number;
  created_at: number;
}

export interface DocumentInfo {
  id: string;
  name: string;
  hash: string;
  uploaded_by: UserId;
  uploaded_at: number;
  status: DocumentStatus;
  pdf_blob_id: string;
  size: number;
  embeddings?: number[];
  extracted_text?: string;
}

export interface Document {
  id: string;
  name: string;
  size: string;
  uploadedAt: string;
  status: DocumentStatus;
  uploadedBy: UserId;
  hash: string;
  pdfBlobId: string;
  file?: File;
  embeddings?: number[];
  extractedText?: string;
}

export interface Agreement {
  id: string;
  name: string;
  contextId: string;
  memberPublicKey: UserId;
  role: string;
  joinedAt: number;
  privateIdentity: UserId;
  sharedIdentity: UserId;
}

export interface ClientApi {
  createSignature(
    name: string,
    blobIdStr: string,
    dataSize: number,
  ): ApiResponse<number>;
  deleteSignature(signatureId: number): ApiResponse<void>;
  listSignatures(): ApiResponse<SignatureRecord[]>;

  joinSharedContext(
    contextId: string,
    sharedIdentity: UserId,
    name: string,
  ): ApiResponse<void>;
  joinDaoAgreementContext(
    contextId: string,
    sharedIdentity: UserId,
    name: string,
  ): ApiResponse<void>;
  listJoinedContexts(): ApiResponse<ContextMetadata[]>;
  leaveSharedContext(contextId: string): ApiResponse<void>;
  getContextDetails(
    contextId: string,
    agreementContextID?: string,
    agreementContextUserID?: string,
  ): ApiResponse<ContextDetails>;

  uploadDocument(
    contextId: string,
    name: string,
    hash: string,
    pdfBlobIdStr: string,
    fileSize: number,
    embeddings?: number[],
    extractedText?: string,
    chunks?: any[],
    agreementContextID?: string,
    agreementContextUserID?: string,
  ): ApiResponse<string>;
  deleteDocument(
    contextId: string,
    documentId: string,
    agreementContextID?: string,
    agreementContextUserID?: string,
  ): ApiResponse<void>;
  listDocuments(
    contextId: string,
    agreementContextID?: string,
    agreementContextUserID?: string,
  ): ApiResponse<DocumentInfo[]>;
  signDocument(
    contextId: string,
    documentId: string,
    pdfBlobIdStr: string,
    fileSize: number,
    newHash: string,
    signerId: string,
    agreementContextID?: string,
    agreementContextUserID?: string,
  ): ApiResponse<void>;
  addParticipant(
    contextId: string,
    userId: UserId,
    permission: PermissionLevel,
    agreementContextID?: string,
    agreementContextUserID?: string,
  ): ApiResponse<void>;
  setConsent(
    userId: UserId,
    documentId: string,
    agreementContextID?: string,
    agreementContextUserID?: string,
  ): ApiResponse<void>;
  hasConsented(
    userId: UserId,
    documentId: string,
    agreementContextID?: string,
    agreementContextUserID?: string,
  ): ApiResponse<boolean>;
  isDefaultPrivateContext(): ApiResponse<boolean>;
  searchDocumentByEmbedding(
    queryEmbedding: number[],
    documentId: string,
    agreementContextID?: string,
    agreementContextUserID?: string,
  ): ApiResponse<string>;

  initializeDaoContext(
    contextId: string,
    agreementContextID?: string,
    agreementContextUserID?: string,
  ): ApiResponse<void>;
  createDaoAgreement(
    agreementId: string,
    title: string,
    participants: UserId[],
    milestones: DaoMilestone[],
    votingThreshold: number,
    totalFunding: number,
    agreementContextID?: string,
    agreementContextUserID?: string,
  ): ApiResponse<string>;
  addMilestoneToAgreement(
    agreementId: string,
    milestone: DaoMilestone,
    agreementContextID?: string,
    agreementContextUserID?: string,
  ): ApiResponse<void>;
  fundDaoAgreement(
    agreementId: string,
    amount: number,
    agreementContextID?: string,
    agreementContextUserID?: string,
  ): ApiResponse<string>;
  voteOnMilestone(
    agreementId: string,
    milestoneId: number,
    approve: boolean,
    agreementContextID?: string,
    agreementContextUserID?: string,
  ): ApiResponse<string>;
  executeMilestone(
    agreementId: string,
    milestoneId: number,
    agreementContextID?: string,
    agreementContextUserID?: string,
  ): ApiResponse<string>;
  getDaoAgreement(
    agreementId: string,
    agreementContextID?: string,
    agreementContextUserID?: string,
  ): ApiResponse<DaoAgreement>;
  listDaoAgreements(
    agreementContextID?: string,
    agreementContextUserID?: string,
  ): ApiResponse<DaoAgreement[]>;
  getMilestoneDetails(
    agreementId: string,
    milestoneId: number,
    agreementContextID?: string,
    agreementContextUserID?: string,
  ): ApiResponse<DaoMilestone>;
  getMilestoneVotingStatus(
    agreementId: string,
    milestoneId: number,
    agreementContextID?: string,
    agreementContextUserID?: string,
  ): ApiResponse<MilestoneVotingInfo>;
  getContextType(
    agreementContextID?: string,
    agreementContextUserID?: string,
  ): ApiResponse<string>;
}
