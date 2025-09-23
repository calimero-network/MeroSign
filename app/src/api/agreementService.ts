import { type ApiResponse } from '@calimero-network/calimero-client';
import { ContextApiDataSource } from './dataSource/nodeApiDataSource';
import { ClientApiDataSource } from './dataSource/ClientApiDataSource';
import { DocumentService } from './documentService';
import { Agreement } from './clientApi';
import { CreateContextProps, CreateContextResponse } from './nodeApi';

export class AgreementService {
  private contextApi: ContextApiDataSource;
  private clientApi: ClientApiDataSource;
  private documentService: DocumentService;

  constructor(app?: any) {
    this.contextApi = new ContextApiDataSource(app);
    this.clientApi = new ClientApiDataSource(app);
    this.documentService = new DocumentService();
  }

  async createAgreement(name: string): ApiResponse<Agreement> {
    try {
      const contextProps: CreateContextProps = {
        is_private: false, // Shared context
        context_name: name,
      };

      const contextResponse = await this.contextApi.createContext(contextProps);

      if (contextResponse.error) {
        return {
          data: null,
          error: contextResponse.error,
        };
      }

      const contextData = contextResponse.data as CreateContextResponse;

      const joinResponse = await this.clientApi.joinSharedContext(
        contextData.contextId,
        contextData.executorId,
        name,
      );

      if (joinResponse.error) {
        console.error('Failed to join created context:', joinResponse.error);
      }

      const agreement: Agreement = {
        id: contextData.contextId,
        name,
        contextId: contextData.contextId,
        memberPublicKey: contextData.executorId,
        role: 'Owner',
        joinedAt: Date.now(),
        privateIdentity: contextData.executorId,
        sharedIdentity: contextData.executorId,
      };

      return {
        data: agreement,
        error: null,
      };
    } catch (error) {
      console.error('createAgreement failed:', error);
      let errorMessage = 'An unexpected error occurred during createAgreement';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      return {
        data: null,
        error: {
          code: 500,
          message: errorMessage,
        },
      };
    }
  }

  async createDaoAgreementContext(name: string): ApiResponse<Agreement> {
    try {
      const contextProps: CreateContextProps = {
        is_private: false,
        context_name: name,
        agreement_type: 'DaoAgreement',
        description: `DAO Agreement: ${name}`,
      } as any;

      const contextResponse = await this.contextApi.createContext(contextProps);

      if (contextResponse.error) {
        return {
          data: null,
          error: contextResponse.error,
        };
      }

      const contextData = contextResponse.data as CreateContextResponse;
      const contextId = contextData.contextId;
      const userId = contextData.memberPublicKey || contextData.executorId;

      const initResponse = await this.clientApi.initializeDaoContext(
        contextId,
        contextId,
        userId,
      );
      if (initResponse.error) {
        throw new Error(
          `Failed to initialize DAO context: ${initResponse.error.message}`,
        );
      }

      const joinResponse = await this.clientApi.joinDaoAgreementContext(
        contextId,
        userId,
        name,
      );
      if (joinResponse.error) {
        throw new Error(
          `Failed to join DAO context: ${joinResponse.error.message}`,
        );
      }

      const agreement: Agreement = {
        id: contextData.contextId,
        name,
        contextId: contextData.contextId,
        memberPublicKey: contextData.executorId,
        role: 'Owner',
        joinedAt: Date.now(),
        privateIdentity: contextData.executorId,
        sharedIdentity: contextData.executorId,
      };

      return {
        data: agreement,
        error: null,
      };
    } catch (error) {
      console.error('createDaoAgreementContext failed:', error);
      let errorMessage =
        'An unexpected error occurred during createDaoAgreementContext';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      return {
        data: null,
        error: {
          code: 500,
          message: errorMessage,
        },
      };
    }
  }

  async createCompleteDaoAgreement(
    agreementName: string,
    participants: string[],
    milestones: any[],
    totalFunding: number,
    votingThreshold: number = 75,
    uploadedDocuments: File[] = [],
  ): ApiResponse<{ agreement: Agreement; agreementId: string }> {
    try {
      const contextResponse =
        await this.createDaoAgreementContext(agreementName);

      if (contextResponse.error) {
        return {
          data: null,
          error: contextResponse.error,
        };
      }

      const agreement = contextResponse.data!;
      const contextId = agreement.contextId;
      const userId = agreement.memberPublicKey;

      const formattedMilestones = milestones.map((milestone, index) => ({
        id: index + 1,
        title: milestone.title,
        description: milestone.description || '',
        milestone_type:
          milestone.type === 'manual'
            ? 'ManualApproval'
            : milestone.type === 'document'
              ? 'DocumentSignature'
              : milestone.type === 'time'
                ? 'TimeRelease'
                : 'ManualApproval',
        recipient: milestone.recipients?.[0] || userId,
        amount: parseFloat(milestone.amount) * 1000000,
        status: 'Pending',
        votes: {},
        created_at: Date.now() * 1000000,
        completed_at: null,
      }));

      const participantIds = [
        userId,
        ...participants.filter((id) => id !== userId),
      ];

      const agreementId = `dao_${contextId}_${Date.now()}`;

      const createResponse = await this.clientApi.createDaoAgreement(
        agreementId,
        agreementName,
        participantIds,
        formattedMilestones,
        votingThreshold,
        totalFunding * 1000000,
        contextId,
        userId,
      );

      if (createResponse.error) {
        throw new Error(createResponse.error.message);
      }

      // Step 5: Upload documents if any
      if (uploadedDocuments.length > 0) {
        const uploadErrors: string[] = [];

        for (const file of uploadedDocuments) {
          try {
            console.log(`Uploading document ${file.name} to DAO context...`);

            const uploadResponse = await this.documentService.uploadDocument(
              contextId,
              file.name,
              file,
              contextId, // agreementContextID
              userId, // agreementContextUserID
              (progress) => {
                console.log(`Upload progress for ${file.name}: ${progress}%`);
              },
              (embeddingProgress) => {
                console.log(
                  `Embedding progress for ${file.name}: ${embeddingProgress}%`,
                );
              },
              () => {
                console.log(`Starting storage for ${file.name}`);
              },
            );

            if (uploadResponse.error) {
              const errorMsg = `Failed to upload document ${file.name}: ${uploadResponse.error.message || 'Unknown error'}`;
              console.error(errorMsg);
              uploadErrors.push(errorMsg);
            } else {
              console.log(
                `Document ${file.name} uploaded successfully to DAO context with ID: ${uploadResponse.data}`,
              );
            }
          } catch (docError) {
            const errorMsg = `Failed to upload document ${file.name}: ${docError instanceof Error ? docError.message : 'Unknown error'}`;
            console.error(errorMsg);
            uploadErrors.push(errorMsg);
          }
        }

        if (uploadErrors.length > 0) {
          throw new Error(
            `Document upload failures: ${uploadErrors.join('; ')}`,
          );
        }
      }

      return {
        data: {
          agreement,
          agreementId,
        },
        error: null,
      };
    } catch (error) {
      console.error('createCompleteDaoAgreement failed:', error);
      let errorMessage =
        'An unexpected error occurred during DAO agreement creation';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      return {
        data: null,
        error: {
          code: 500,
          message: errorMessage,
        },
      };
    }
  }

  // List all agreements (joined contexts)
  async listAgreements(): ApiResponse<Agreement[]> {
    try {
      const contextsResponse = await this.clientApi.listJoinedContexts();

      if (contextsResponse.error) {
        console.error(
          'AgreementService: Error from clientApi:',
          contextsResponse.error,
        );
        return {
          data: null,
          error: contextsResponse.error,
        };
      }

      let contextsArray: any[] = [];
      const responseData = contextsResponse.data;

      if (Array.isArray(responseData)) {
        contextsArray = responseData;
      } else if (responseData && Array.isArray(responseData.output)) {
        contextsArray = responseData.output;
      } else if (responseData && Array.isArray(responseData.result)) {
        contextsArray = responseData.result;
      } else {
        console.error(
          'AgreementService: Invalid contexts data, expected array but got:',
          typeof responseData,
          responseData,
        );
        return {
          data: [],
          error: null,
        };
      }

      const agreements: Agreement[] = contextsArray.map((context: any) => {
        if (context.contextId) {
          return {
            id: context.contextId,
            name:
              context.context_name ||
              `Agreement ${context.contextId.slice(0, 8)}...`,
            contextId: context.contextId,
            memberPublicKey: context.executorId,
            role: context.role || ' ',
            joinedAt: context.joinedAt || ' ',
            privateIdentity: context.executorId,
            sharedIdentity: context.executorId,
          };
        }

        // Handle old API structure (fallback)
        return {
          id: context.context_id,
          name: context.context_name,
          contextId: context.context_id,
          memberPublicKey: context.shared_identity,
          role: context.role,
          joinedAt: context.joined_at,
          privateIdentity: context.private_identity,
          sharedIdentity: context.shared_identity,
        };
      });

      return {
        data: agreements,
        error: null,
      };
    } catch (error) {
      console.error('listAgreements failed:', error);
      let errorMessage = 'An unexpected error occurred during listAgreements';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      return {
        data: null,
        error: {
          code: 500,
          message: errorMessage,
        },
      };
    }
  }

  // Leave an agreement (shared context)
  // async leaveAgreement(agreementId: string): ApiResponse<void> {
  //   try {
  //     return await this.clientApi.leaveSharedContext(agreementId);
  //   } catch (error) {
  //     console.error('leaveAgreement failed:', error);
  //     let errorMessage = 'An unexpected error occurred during leaveAgreement';
  //     if (error instanceof Error) {
  //       errorMessage = error.message;
  //     } else if (typeof error === 'string') {
  //       errorMessage = error;
  //     }
  //     return {
  //       data: null,
  //       error: {
  //         code: 500,
  //         message: errorMessage,
  //       },
  //     };
  //   }
  // }

  // Invite someone to an agreement
  async inviteToAgreement(
    agreementId: string,
    inviteeId: string,
    inviterId: string,
  ): ApiResponse<string> {
    try {
      return await this.contextApi.inviteToContext({
        contextId: agreementId,
        invitee: inviteeId,
        inviter: inviterId,
      });
    } catch (error) {
      console.error('inviteToAgreement failed:', error);
      let errorMessage =
        'An unexpected error occurred during inviteToAgreement';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      return {
        data: null,
        error: {
          code: 500,
          message: errorMessage,
        },
      };
    }
  }

  // Join an agreement using invitation payload
  async joinAgreement(invitationPayload: string): ApiResponse<string> {
    try {
      const joinResponse = await this.contextApi.joinContext({
        invitationPayload,
      });

      if (joinResponse.error) {
        return {
          data: null,
          error: joinResponse.error,
        };
      }

      const contextId = joinResponse.data?.contextId || '';

      return {
        data: contextId,
        error: null,
      };
    } catch (error) {
      console.error('joinAgreement failed:', error);
      let errorMessage = 'An unexpected error occurred during joinAgreement';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      return {
        data: null,
        error: {
          code: 500,
          message: errorMessage,
        },
      };
    }
  }

  // Verify if a context exists and is joined
  async verifyAgreement(agreementId: string): ApiResponse<boolean> {
    try {
      const verifyResponse = await this.contextApi.verifyContext({
        contextId: agreementId,
      });

      if (verifyResponse.error) {
        return {
          data: null,
          error: verifyResponse.error,
        };
      }

      return {
        data: verifyResponse.data?.joined || false,
        error: null,
      };
    } catch (error) {
      console.error('verifyAgreement failed:', error);
      let errorMessage = 'An unexpected error occurred during verifyAgreement';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      return {
        data: null,
        error: {
          code: 500,
          message: errorMessage,
        },
      };
    }
  }
}
