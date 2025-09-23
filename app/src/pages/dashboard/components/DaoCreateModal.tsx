import React from 'react';
import { motion } from 'framer-motion';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  Plus,
  Upload,
  FileText,
  Copy,
} from 'lucide-react';
import { Button } from '../../../components/ui';

interface Participant {
  contextId: string;
  invitationPayload: string;
  icpId: string;
}

interface DaoCreateModalProps {
  showDaoCreateModal: boolean;
  setShowDaoCreateModal: (show: boolean) => void;
  daoStep: number;
  setDaoStep: (step: number) => void;
  daoAgreementName: string;
  setDaoAgreementName: (name: string) => void;
  daoParticipants: Participant[];
  setDaoParticipants: React.Dispatch<React.SetStateAction<Participant[]>>;
  currentParticipant: Participant;
  setCurrentParticipant: React.Dispatch<React.SetStateAction<Participant>>;
  milestoneType: string;
  setMilestoneType: (type: string) => void;
  milestoneDescription: string;
  setMilestoneDescription: (desc: string) => void;
  uploadedDocuments: File[];
  setUploadedDocuments: React.Dispatch<React.SetStateAction<File[]>>;
  totalFunding: string;
  setTotalFunding: (amount: string) => void;
  milestones: any[];
  setMilestones: React.Dispatch<React.SetStateAction<any[]>>;
  currentMilestone: any;
  setCurrentMilestone: React.Dispatch<React.SetStateAction<any>>;
  mode: string;
  error: string | null;
  creating: boolean;
  daoAgreementCreated: boolean;
  daoContextId: string;
  generatingInvitationPayload: boolean;
  generateInvitationPayload: (
    contextId: string,
    invitee: string,
  ) => Promise<void>;
  copyInvitationPayload: (payload: string) => void;
  addCurrentParticipant: () => void;
  removeParticipant: (index: number) => void;
  handleNextStep: () => void;
  handlePrevStep: () => void;
  handleFileUpload: (files: FileList | null) => void;
  removeDocument: (index: number) => void;
  canProceedToNextStep: () => boolean;
  handleCreateDaoAgreement: () => Promise<void>;
  resetDaoForm: () => void;
  addMilestone: () => void;
  removeMilestone: (id: number) => void;
}

const DaoCreateModal: React.FC<DaoCreateModalProps> = ({
  showDaoCreateModal,
  setShowDaoCreateModal,
  daoStep,
  setDaoStep,
  daoAgreementName,
  setDaoAgreementName,
  daoParticipants,
  setDaoParticipants,
  currentParticipant,
  setCurrentParticipant,
  milestoneType,
  setMilestoneType,
  milestoneDescription,
  setMilestoneDescription,
  uploadedDocuments,
  setUploadedDocuments,
  totalFunding,
  setTotalFunding,
  milestones,
  setMilestones,
  currentMilestone,
  setCurrentMilestone,
  mode,
  error,
  creating,
  daoAgreementCreated,
  daoContextId,
  generatingInvitationPayload,
  generateInvitationPayload,
  copyInvitationPayload,
  addCurrentParticipant,
  removeParticipant,
  handleNextStep,
  handlePrevStep,
  handleFileUpload,
  removeDocument,
  canProceedToNextStep,
  handleCreateDaoAgreement,
  resetDaoForm,
  addMilestone,
  removeMilestone,
}) => {
  if (!showDaoCreateModal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 pt-20 z-[9999]">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={`rounded-lg w-full max-w-6xl border border-border shadow-2xl max-h-[80vh] flex flex-col ${
          mode === 'dark' ? 'bg-gray-900' : 'bg-white'
        }`}
      >
        <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-foreground">
              Create DAO Agreement
            </h3>
            <div className="text-sm text-muted-foreground">
              Step {daoStep} of 6
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowDaoCreateModal(false);
              resetDaoForm();
            }}
            className="p-1 h-auto w-auto"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="p-6 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            {[1, 2, 3, 4, 5, 6].map((step) => (
              <div
                key={step}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step < daoStep
                    ? 'bg-green-500 text-white'
                    : step === daoStep
                      ? daoStep === 1 && daoAgreementCreated
                        ? 'bg-green-500 text-white'
                        : 'bg-primary text-white'
                      : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                }`}
              >
                {step < daoStep || (step === 1 && daoAgreementCreated) ? (
                  <Check className="w-4 h-4" />
                ) : (
                  step
                )}
              </div>
            ))}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{
                width: `${((daoStep - (daoStep === 1 && !daoAgreementCreated ? 0.5 : 0)) / 6) * 100}%`,
              }}
            ></div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>
              Name{' '}
              {daoAgreementCreated && (
                <Check className="w-3 h-3 inline ml-1 text-green-500" />
              )}
            </span>
            <span>Participants</span>
            <span>Documents</span>
            <span>Funding</span>
            <span>Milestones</span>
            <span>Review</span>
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Step 1: Agreement Name */}
            {daoStep === 1 && (
              <div className="space-y-4">
                <div className="text-center">
                  <h4 className="text-xl font-semibold text-foreground mb-2">
                    Agreement Name
                  </h4>
                  <p className="text-muted-foreground">
                    Enter a descriptive name for your DAO agreement
                  </p>
                </div>

                <div className="max-w-md mx-auto">
                  <label
                    htmlFor="daoAgreementName"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    Agreement Name *
                  </label>
                  <input
                    id="daoAgreementName"
                    type="text"
                    value={daoAgreementName}
                    onChange={(e) => setDaoAgreementName(e.target.value)}
                    placeholder="e.g., Website Development Project"
                    className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-center"
                    autoFocus
                    disabled={creating || daoAgreementCreated}
                  />
                </div>

                {/* Creation Status */}
                {creating && (
                  <div className="max-w-md mx-auto text-center">
                    <div className="flex items-center justify-center gap-2 text-primary">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                      <span>Creating DAO agreement context...</span>
                    </div>
                  </div>
                )}

                {daoAgreementCreated && daoContextId && (
                  <div className="max-w-md mx-auto">
                    <div className="p-3 bg-green-100 border border-green-300 rounded-lg">
                      <div className="flex items-center gap-2 text-green-800 mb-2">
                        <Check className="w-4 h-4" />
                        <span className="font-medium">
                          Agreement Context Created!
                        </span>
                      </div>
                      <div className="text-xs text-green-700 space-y-1">
                        <div>
                          Context ID: {daoContextId.slice(0, 8)}...
                          {daoContextId.slice(-8)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* Step 2: Add Participants */}
            {daoStep === 2 && (
              <div className="space-y-4">
                <div className="text-center">
                  <h4 className="text-xl font-semibold text-foreground mb-2">
                    Add Participants
                  </h4>
                  <p className="text-muted-foreground">
                    Add participants to your DAO agreement
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Side: Add Participant Form */}
                  <div className="space-y-4">
                    <div className="p-4 border border-border rounded-lg bg-background/50">
                      <h5 className="font-medium text-foreground mb-3">
                        Add New Participant
                      </h5>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">
                            User Context ID
                          </label>
                          <input
                            type="text"
                            value={currentParticipant.contextId}
                            onChange={(e) =>
                              setCurrentParticipant((prev) => ({
                                ...prev,
                                contextId: e.target.value,
                              }))
                            }
                            placeholder="Enter context ID"
                            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <div className="flex-1 relative">
                              <input
                                type="text"
                                value={
                                  generatingInvitationPayload
                                    ? 'Generating invitation payload...'
                                    : currentParticipant.invitationPayload
                                      ? `${currentParticipant.invitationPayload.slice(0, 20)}...${currentParticipant.invitationPayload.slice(-10)}`
                                      : ''
                                }
                                placeholder="Invitation payload will be generated"
                                className="w-full px-3 py-2 pr-10 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground"
                                readOnly
                              />
                              {currentParticipant.invitationPayload &&
                                !generatingInvitationPayload && (
                                  <Button
                                    onClick={() =>
                                      copyInvitationPayload(
                                        currentParticipant.invitationPayload,
                                      )
                                    }
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                                    title="Copy invitation payload"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                )}
                            </div>
                            <Button
                              onClick={() =>
                                generateInvitationPayload(
                                  currentParticipant.contextId,
                                  currentParticipant.contextId,
                                )
                              }
                              disabled={
                                !currentParticipant.contextId ||
                                generatingInvitationPayload
                              }
                              size="sm"
                              className={`dark:text-black disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              {generatingInvitationPayload ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1"></div>
                                  Generating...
                                </>
                              ) : (
                                'Generate'
                              )}
                            </Button>
                          </div>
                          {currentParticipant.invitationPayload &&
                            !generatingInvitationPayload && (
                              <div className="text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <span>
                                    Full payload generated (
                                    {
                                      currentParticipant.invitationPayload
                                        .length
                                    }{' '}
                                    chars)
                                  </span>
                                  <div
                                    className="cursor-pointer hover:text-foreground"
                                    onClick={() =>
                                      copyInvitationPayload(
                                        currentParticipant.invitationPayload,
                                      )
                                    }
                                    title="Copy full payload"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </div>
                                </div>
                              </div>
                            )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">
                            ICP Principal ID
                          </label>
                          <input
                            type="text"
                            value={currentParticipant.icpId}
                            onChange={(e) =>
                              setCurrentParticipant((prev) => ({
                                ...prev,
                                icpId: e.target.value,
                              }))
                            }
                            placeholder="Enter ICP Principal ID"
                            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          />
                        </div>

                        <Button
                          onClick={addCurrentParticipant}
                          disabled={
                            !currentParticipant.contextId ||
                            !currentParticipant.icpId
                          }
                          className={`w-full flex items-center gap-2 dark:text-black disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <Plus className="w-4 h-4" />
                          Add Participant
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Participants List */}
                  <div className="space-y-4">
                    <div className="p-4 border border-border rounded-lg bg-background/50">
                      <h5 className="font-medium text-foreground mb-3">
                        Added Participants ({daoParticipants.length})
                      </h5>
                      <div className="max-h-64 overflow-y-auto">
                        {daoParticipants.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <p>No participants added yet</p>
                            <p className="text-sm">
                              Add participants using the form on the left
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {daoParticipants.map((participant, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-3 border border-border rounded-lg"
                              >
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-foreground">
                                    {participant.contextId}
                                  </div>
                                  <div className="text-xs text-muted-foreground truncate">
                                    {participant.icpId}
                                  </div>
                                </div>
                                <Button
                                  onClick={() => removeParticipant(index)}
                                  variant="ghost"
                                  size="sm"
                                  className={`text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300`}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Step 3: Upload Documents */}
            {daoStep === 3 && (
              <div className="space-y-4">
                <div className="text-center">
                  <h4 className="text-xl font-semibold text-foreground mb-2">
                    Upload Documents
                  </h4>
                  <p className="text-muted-foreground">
                    Upload documents for your agreement (required for
                    document-based milestones)
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Side: Document Upload */}
                  <div className="space-y-4">
                    <div className="p-4 border border-border rounded-lg bg-background/50">
                      <h5 className="font-medium text-foreground mb-3">
                        Upload Documents
                      </h5>

                      {/* File Upload Area */}
                      <div
                        className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
                        onClick={() =>
                          document.getElementById('fileInput')?.click()
                        }
                      >
                        <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                        <h6 className="font-medium text-foreground mb-2">
                          Choose files to upload
                        </h6>
                        <p className="text-sm text-muted-foreground mb-3">
                          Select PDF, DOC, or TXT files (max 10MB each)
                        </p>
                        <Button variant="outline" className="dark:text-black">
                          Browse Files
                        </Button>
                      </div>

                      <input
                        id="fileInput"
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.txt"
                        onChange={(e) => handleFileUpload(e.target.files)}
                        className="hidden"
                      />
                    </div>
                  </div>

                  {/* Right Side: Uploaded Documents List */}
                  <div className="space-y-4">
                    <div className="p-4 border border-border rounded-lg bg-background/50">
                      <h5 className="font-medium text-foreground mb-3">
                        Uploaded Documents ({uploadedDocuments.length})
                      </h5>
                      <div className="max-h-64 overflow-y-auto">
                        {uploadedDocuments.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <p>No documents uploaded yet</p>
                            <p className="text-sm">
                              Upload documents using the form on the left
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {uploadedDocuments.map((file, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-3 border border-border rounded-lg"
                              >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-foreground truncate">
                                      {file.name}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {(file.size / 1024 / 1024).toFixed(2)} MB
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  onClick={() => removeDocument(index)}
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 flex-shrink-0"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Step 4: Funding Setup */}
            {daoStep === 4 && (
              <div className="space-y-4">
                <div className="text-center">
                  <h4 className="text-xl font-semibold text-foreground mb-2">
                    Agreement Funding
                  </h4>
                  <p className="text-muted-foreground">
                    Set the total funding amount for this agreement
                  </p>
                </div>

                <div className="max-w-md mx-auto space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Total Agreement Amount *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={totalFunding}
                        onChange={(e) => setTotalFunding(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-4 py-3 pl-8 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-center"
                        min="0"
                        step="0.01"
                      />
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                        ICP
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      This amount will be distributed across milestones
                    </p>
                  </div>
                </div>
              </div>
            )}
            {/* Step 5: Milestone Configuration */}
            {daoStep === 5 && (
              <div className="space-y-4">
                <div className="text-center">
                  <h4 className="text-xl font-semibold text-foreground mb-2">
                    Configure Milestones
                  </h4>
                  <p className="text-muted-foreground">
                    Set up milestones with conditions and funding distribution
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Side: Add Milestone Form */}
                  <div className="space-y-4">
                    <div className="p-4 border border-border rounded-lg bg-background/50">
                      <h5 className="font-medium text-foreground mb-3">
                        Add New Milestone
                      </h5>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">
                            Milestone Title *
                          </label>
                          <input
                            type="text"
                            value={currentMilestone.title}
                            onChange={(e) =>
                              setCurrentMilestone((prev: any) => ({
                                ...prev,
                                title: e.target.value,
                              }))
                            }
                            placeholder="e.g., Design Phase Completion"
                            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">
                            Description
                          </label>
                          <textarea
                            value={currentMilestone.description}
                            onChange={(e) =>
                              setCurrentMilestone((prev: any) => ({
                                ...prev,
                                description: e.target.value,
                              }))
                            }
                            placeholder="Describe the milestone requirements..."
                            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                            rows={2}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                              Amount (ICP) *
                            </label>
                            <input
                              type="number"
                              value={currentMilestone.amount}
                              onChange={(e) =>
                                setCurrentMilestone((prev: any) => ({
                                  ...prev,
                                  amount: e.target.value,
                                }))
                              }
                              placeholder="0.00"
                              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                              min="0"
                              step="0.01"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                              Recipients *
                            </label>
                            <div className="max-h-32 overflow-y-auto border border-border rounded-lg p-3 bg-background">
                              {daoParticipants.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                  No participants added yet. Add participants
                                  first.
                                </p>
                              ) : (
                                <div className="space-y-2">
                                  {daoParticipants.map((participant, index) => (
                                    <label
                                      key={index}
                                      className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={
                                          currentMilestone.recipients?.includes(
                                            participant.icpId,
                                          ) || false
                                        }
                                        onChange={(e) => {
                                          const isChecked = e.target.checked;
                                          setCurrentMilestone((prev: any) => ({
                                            ...prev,
                                            recipients: isChecked
                                              ? [
                                                  ...(prev.recipients || []),
                                                  participant.icpId,
                                                ]
                                              : (prev.recipients || []).filter(
                                                  (id: string) =>
                                                    id !== participant.icpId,
                                                ),
                                          }));
                                        }}
                                        className="w-4 h-4 text-primary border-border rounded focus:ring-primary focus:ring-2"
                                      />
                                      <div className="flex-1">
                                        <div className="text-sm font-medium text-foreground">
                                          {participant.contextId}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {participant.icpId.slice(0, 8)}...
                                          {participant.icpId.slice(-8)}
                                        </div>
                                      </div>
                                    </label>
                                  ))}
                                </div>
                              )}
                            </div>
                            {currentMilestone.recipients?.length > 0 && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {currentMilestone.recipients.length} recipient
                                {currentMilestone.recipients.length !== 1
                                  ? 's'
                                  : ''}{' '}
                                selected
                              </p>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">
                            Milestone Type *
                          </label>
                          <select
                            value={currentMilestone.type}
                            onChange={(e) =>
                              setCurrentMilestone((prev: any) => ({
                                ...prev,
                                type: e.target.value as any,
                              }))
                            }
                            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          >
                            <option value="manual">Manual Approval</option>
                            <option value="document">Document Signature</option>
                            <option value="time">Time-based</option>
                            <option value="voting">Voting</option>
                          </select>
                        </div>

                        {/* Document Selection for Document-based Milestones */}
                        {currentMilestone.type === 'document' && (
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                              Required Document *
                            </label>
                            {uploadedDocuments.length === 0 ? (
                              <div className="p-3 border border-border rounded-lg bg-muted/30">
                                <p className="text-sm text-muted-foreground">
                                  No documents uploaded yet. Upload documents in
                                  Step 3 to select them for milestones.
                                </p>
                              </div>
                            ) : (
                              <select
                                value={currentMilestone.documentId || ''}
                                onChange={(e) =>
                                  setCurrentMilestone((prev: any) => ({
                                    ...prev,
                                    documentId: e.target.value,
                                  }))
                                }
                                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                              >
                                <option value="">Select a document...</option>
                                {uploadedDocuments.map((file, index) => (
                                  <option key={index} value={index.toString()}>
                                    {file.name}
                                  </option>
                                ))}
                              </select>
                            )}
                            {currentMilestone.documentId && (
                              <p className="text-xs text-muted-foreground mt-1">
                                This milestone will be completed when the
                                selected document is signed by all required
                                parties.
                              </p>
                            )}
                          </div>
                        )}

                        {/* Time Configuration for Time-based Milestones */}
                        {currentMilestone.type === 'time' && (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                  Duration *
                                </label>
                                <input
                                  type="number"
                                  value={currentMilestone.timeDuration || ''}
                                  onChange={(e) =>
                                    setCurrentMilestone((prev: any) => ({
                                      ...prev,
                                      timeDuration: e.target.value,
                                    }))
                                  }
                                  placeholder="e.g., 7"
                                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                  min="1"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                  Time Unit *
                                </label>
                                <select
                                  value={currentMilestone.timeUnit || 'days'}
                                  onChange={(e) =>
                                    setCurrentMilestone((prev: any) => ({
                                      ...prev,
                                      timeUnit: e.target.value,
                                    }))
                                  }
                                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                >
                                  <option value="hours">Hours</option>
                                  <option value="days">Days</option>
                                  <option value="weeks">Weeks</option>
                                  <option value="months">Months</option>
                                </select>
                              </div>
                            </div>
                            {currentMilestone.timeDuration &&
                              currentMilestone.timeUnit && (
                                <p className="text-xs text-muted-foreground">
                                  This milestone will be automatically completed
                                  after {currentMilestone.timeDuration}{' '}
                                  {currentMilestone.timeUnit} from the agreement
                                  start date.
                                </p>
                              )}
                          </div>
                        )}

                        {/* Voting Configuration for Voting-based Milestones */}
                        {currentMilestone.type === 'voting' && (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                  Approval Threshold *
                                </label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    value={
                                      currentMilestone.votingThreshold || ''
                                    }
                                    onChange={(e) =>
                                      setCurrentMilestone((prev: any) => ({
                                        ...prev,
                                        votingThreshold: e.target.value,
                                      }))
                                    }
                                    placeholder="51"
                                    className="w-full px-3 py-2 pr-8 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                    min="1"
                                    max="100"
                                  />
                                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">
                                    %
                                  </span>
                                </div>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                  Voting Period *
                                </label>
                                <div className="flex gap-2">
                                  <input
                                    type="number"
                                    value={
                                      currentMilestone.votingDuration || ''
                                    }
                                    onChange={(e) =>
                                      setCurrentMilestone((prev: any) => ({
                                        ...prev,
                                        votingDuration: e.target.value,
                                      }))
                                    }
                                    placeholder="7"
                                    className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                    min="1"
                                  />
                                  <select
                                    value={
                                      currentMilestone.votingUnit || 'days'
                                    }
                                    onChange={(e) =>
                                      setCurrentMilestone((prev: any) => ({
                                        ...prev,
                                        votingUnit: e.target.value,
                                      }))
                                    }
                                    className="px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                  >
                                    <option value="hours">Hours</option>
                                    <option value="days">Days</option>
                                    <option value="weeks">Weeks</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                            {currentMilestone.votingThreshold &&
                              currentMilestone.votingDuration &&
                              currentMilestone.votingUnit && (
                                <p className="text-xs text-muted-foreground">
                                  This milestone requires{' '}
                                  {currentMilestone.votingThreshold}% approval
                                  from participants within{' '}
                                  {currentMilestone.votingDuration}{' '}
                                  {currentMilestone.votingUnit}.
                                </p>
                              )}
                          </div>
                        )}

                        <Button
                          onClick={addMilestone}
                          disabled={
                            !currentMilestone.title.trim() ||
                            !currentMilestone.amount ||
                            !currentMilestone.recipients?.length ||
                            (currentMilestone.type === 'document' &&
                              !currentMilestone.documentId) ||
                            (currentMilestone.type === 'time' &&
                              (!currentMilestone.timeDuration ||
                                !currentMilestone.timeUnit)) ||
                            (currentMilestone.type === 'voting' &&
                              (!currentMilestone.votingThreshold ||
                                !currentMilestone.votingDuration ||
                                !currentMilestone.votingUnit))
                          }
                          className="w-full dark:text-black"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Milestone
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Milestones List */}
                  <div className="space-y-4">
                    <div className="p-4 border border-border rounded-lg bg-background/50">
                      <h5 className="font-medium text-foreground mb-3">
                        Configured Milestones ({milestones.length})
                      </h5>
                      <div className="max-h-80 overflow-y-auto">
                        {milestones.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <p>No milestones configured yet</p>
                            <p className="text-sm">
                              Add milestones using the form on the left
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {milestones.map((milestone, index) => (
                              <div
                                key={milestone.id}
                                className="p-4 border border-border rounded-lg bg-background/50"
                              >
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1">
                                    <h5 className="font-medium text-foreground">
                                      {milestone.title}
                                    </h5>
                                    <p className="text-sm text-muted-foreground">
                                      {milestone.description}
                                    </p>
                                  </div>
                                  <Button
                                    onClick={() =>
                                      removeMilestone(milestone.id)
                                    }
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">
                                      Type:
                                    </span>
                                    <span className="ml-2 text-foreground capitalize">
                                      {milestone.type}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">
                                      Amount:
                                    </span>
                                    <span className="ml-2 text-foreground">
                                      {milestone.amount} ICP
                                    </span>
                                  </div>
                                </div>

                                {/* Type-specific configuration display */}
                                {milestone.type === 'document' &&
                                  milestone.documentId !== undefined && (
                                    <div className="mt-2 text-sm">
                                      <span className="text-muted-foreground">
                                        Required Document:
                                      </span>
                                      <span className="ml-2 text-foreground">
                                        {uploadedDocuments[
                                          parseInt(milestone.documentId)
                                        ]?.name || 'Unknown Document'}
                                      </span>
                                    </div>
                                  )}

                                {milestone.type === 'time' &&
                                  milestone.timeDuration &&
                                  milestone.timeUnit && (
                                    <div className="mt-2 text-sm">
                                      <span className="text-muted-foreground">
                                        Duration:
                                      </span>
                                      <span className="ml-2 text-foreground">
                                        {milestone.timeDuration}{' '}
                                        {milestone.timeUnit}
                                      </span>
                                    </div>
                                  )}

                                {milestone.type === 'voting' &&
                                  milestone.votingThreshold &&
                                  milestone.votingDuration &&
                                  milestone.votingUnit && (
                                    <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                                      <div>
                                        <span className="text-muted-foreground">
                                          Threshold:
                                        </span>
                                        <span className="ml-2 text-foreground">
                                          {milestone.votingThreshold}%
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">
                                          Voting Period:
                                        </span>
                                        <span className="ml-2 text-foreground">
                                          {milestone.votingDuration}{' '}
                                          {milestone.votingUnit}
                                        </span>
                                      </div>
                                    </div>
                                  )}

                                <div className="mt-2 text-sm">
                                  <span className="text-muted-foreground">
                                    Recipients:
                                  </span>
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {milestone.recipients?.length > 0 ? (
                                      milestone.recipients.map(
                                        (recipientId: string, idx: number) => {
                                          const participant =
                                            daoParticipants.find(
                                              (p) => p.icpId === recipientId,
                                            );
                                          return (
                                            <span
                                              key={idx}
                                              className="inline-block px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
                                            >
                                              {participant
                                                ? participant.contextId.slice(
                                                    0,
                                                    6,
                                                  )
                                                : recipientId.slice(0, 6)}
                                              ...
                                            </span>
                                          );
                                        },
                                      )
                                    ) : (
                                      <span className="text-muted-foreground text-xs">
                                        None
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Total Amount Validation */}
                    {milestones.length > 0 && (
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Total Milestone Amount:
                          </span>
                          <span className="text-foreground font-medium">
                            {milestones.reduce(
                              (sum, m) => sum + parseFloat(m.amount || '0'),
                              0,
                            )}{' '}
                            ICP
                          </span>
                        </div>
                        <div className="flex justify-between text-sm mt-1">
                          <span className="text-muted-foreground">
                            Agreement Total:
                          </span>
                          <span className="text-foreground font-medium">
                            {totalFunding} ICP
                          </span>
                        </div>
                        <div className="flex justify-between text-sm mt-2 pt-2 border-t border-border">
                          <span className="text-muted-foreground">
                            Remaining:
                          </span>
                          <span
                            className={`font-medium ${
                              parseFloat(totalFunding) -
                                milestones.reduce(
                                  (sum, m) => sum + parseFloat(m.amount || '0'),
                                  0,
                                ) >=
                              0
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}
                          >
                            {parseFloat(totalFunding) -
                              milestones.reduce(
                                (sum, m) => sum + parseFloat(m.amount || '0'),
                                0,
                              )}{' '}
                            ICP
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}{' '}
            {/* Step 6: Review & Create */}
            {daoStep === 6 && (
              <div className="space-y-4">
                <div className="text-center">
                  <h4 className="text-xl font-semibold text-foreground mb-2">
                    Review & Create
                  </h4>
                  <p className="text-muted-foreground">
                    Review your DAO agreement details
                  </p>
                </div>

                <div className="max-w-4xl mx-auto space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                      <div className="p-4 border border-border rounded-lg">
                        <h5 className="font-medium text-foreground mb-2">
                          Agreement Details
                        </h5>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Name:</span>
                            <span className="text-foreground">
                              {daoAgreementName}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Participants:
                            </span>
                            <span className="text-foreground">
                              {daoParticipants.length}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Documents:
                            </span>
                            <span className="text-foreground">
                              {uploadedDocuments.length}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Total Funding:
                            </span>
                            <span className="text-foreground">
                              {totalFunding || '0'} ICP
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Milestones:
                            </span>
                            <span className="text-foreground">
                              {milestones.length}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Documents Summary */}
                      {uploadedDocuments.length > 0 && (
                        <div className="p-4 border border-border rounded-lg">
                          <h5 className="font-medium text-foreground mb-3">
                            Documents ({uploadedDocuments.length})
                          </h5>
                          <div className="max-h-40 overflow-y-auto space-y-2">
                            {uploadedDocuments.map((file, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-3 text-sm"
                              >
                                <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                                <span className="text-foreground truncate">
                                  {file.name}
                                </span>
                                <span className="text-muted-foreground text-xs ml-auto">
                                  {(file.size / 1024 / 1024).toFixed(2)} MB
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                      {/* Milestones Summary */}
                      {milestones.length > 0 && (
                        <div className="p-4 border border-border rounded-lg">
                          <h5 className="font-medium text-foreground mb-3">
                            Milestone Summary
                          </h5>
                          <div className="max-h-64 overflow-y-auto space-y-3">
                            {milestones.map((milestone, index) => (
                              <div
                                key={milestone.id}
                                className="p-3 bg-muted/30 rounded-lg"
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <h6 className="font-medium text-foreground">
                                    {index + 1}. {milestone.title}
                                  </h6>
                                  <span className="text-sm font-medium text-primary">
                                    {milestone.amount} ICP
                                  </span>
                                </div>
                                {milestone.description && (
                                  <p className="text-sm text-muted-foreground mb-2">
                                    {milestone.description}
                                  </p>
                                )}

                                {/* Type-specific configuration in review */}
                                {milestone.type === 'document' &&
                                  milestone.documentId !== undefined && (
                                    <div className="text-xs text-muted-foreground mb-2">
                                      Document:{' '}
                                      {uploadedDocuments[
                                        parseInt(milestone.documentId)
                                      ]?.name || 'Unknown'}
                                    </div>
                                  )}

                                {milestone.type === 'time' &&
                                  milestone.timeDuration &&
                                  milestone.timeUnit && (
                                    <div className="text-xs text-muted-foreground mb-2">
                                      Duration: {milestone.timeDuration}{' '}
                                      {milestone.timeUnit}
                                    </div>
                                  )}

                                {milestone.type === 'voting' &&
                                  milestone.votingThreshold &&
                                  milestone.votingDuration &&
                                  milestone.votingUnit && (
                                    <div className="text-xs text-muted-foreground mb-2">
                                      Voting: {milestone.votingThreshold}%
                                      threshold, {milestone.votingDuration}{' '}
                                      {milestone.votingUnit} period
                                    </div>
                                  )}

                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>Type: {milestone.type}</span>
                                  <div className="text-right">
                                    <div>
                                      Recipients:{' '}
                                      {milestone.recipients?.length || 0}
                                    </div>
                                    {milestone.recipients?.length > 0 && (
                                      <div className="text-xs">
                                        {milestone.recipients.map(
                                          (
                                            recipientId: string,
                                            idx: number,
                                          ) => {
                                            const participant =
                                              daoParticipants.find(
                                                (p) => p.icpId === recipientId,
                                              );
                                            return (
                                              <span key={idx}>
                                                {participant
                                                  ? participant.contextId.slice(
                                                      0,
                                                      4,
                                                    )
                                                  : recipientId.slice(0, 4)}
                                                ...
                                                {idx <
                                                milestone.recipients.length - 1
                                                  ? ', '
                                                  : ''}
                                              </span>
                                            );
                                          },
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Funding Distribution Summary */}
                          <div className="mt-4 pt-3 border-t border-border">
                            <div className="flex justify-between text-sm font-medium">
                              <span className="text-muted-foreground">
                                Total Allocated:
                              </span>
                              <span className="text-foreground">
                                {milestones.reduce(
                                  (sum, m) => sum + parseFloat(m.amount || '0'),
                                  0,
                                )}{' '}
                                ICP
                              </span>
                            </div>
                            <div className="flex justify-between text-sm mt-1">
                              <span className="text-muted-foreground">
                                Agreement Total:
                              </span>
                              <span className="text-foreground">
                                {totalFunding} ICP
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {error && (
              <div className="p-3 bg-red-100 border border-red-300 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-3 p-6 border-t border-border flex-shrink-0">
          <Button
            onClick={handlePrevStep}
            variant="outline"
            className={`flex items-center gap-2 ${mode === 'dark' ? 'bg-gray-900' : 'bg-white'}`}
            disabled={daoStep === 1}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>

          <div className="flex-1"></div>

          {daoStep < 6 ? (
            <Button
              onClick={handleNextStep}
              disabled={!canProceedToNextStep()}
              className={`flex items-center gap-2 dark:text-black disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleCreateDaoAgreement}
              disabled={creating}
              className={`flex items-center gap-2 dark:text-black disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {creating ? 'Creating...' : 'Create Agreement'}
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default DaoCreateModal;
