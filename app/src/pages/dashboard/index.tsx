import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCalimero, apiClient } from '@calimero-network/calimero-client';
import {
  FileText,
  Search,
  Plus,
  ArrowRight,
  Layers,
  X,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Key,
  Copy,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Card, CardContent } from '../../components/ui';
import { MobileLayout } from '../../components/MobileLayout';
import { useTheme } from '../../contexts/ThemeContext';
import { AgreementService } from '../../api/agreementService';
import { ContextApiDataSource } from '../../api/dataSource/nodeApiDataSource';
import { ClientApiDataSource } from '../../api/dataSource/ClientApiDataSource';
import { Agreement } from '../../api/clientApi';
import CreateAgreementTypeModal from './components/CreateAgreementTypeModal';
import DaoCreateModal from './components/DaoCreateModal';

type NotificationType = 'success' | 'error';
interface NotificationState {
  message: string;
  type: NotificationType;
}

const NotificationPopup: React.FC<{
  notification: NotificationState;
}> = ({ notification }) => (
  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={`relative p-8 rounded-2xl shadow-2xl border w-full max-w-sm text-center ${
        notification.type === 'success'
          ? 'bg-green-100 border-green-300 text-green-900 dark:bg-gray-800 dark:border-green-600 dark:text-green-200'
          : 'bg-red-100 border-red-300 text-red-900 dark:bg-gray-800 dark:border-red-600 dark:text-red-200'
      }`}
    >
      <div className="flex flex-col items-center justify-center">
        {notification.type === 'success' ? (
          <CheckCircle2 className="w-16 h-16 mb-5 text-green-500" />
        ) : (
          <AlertCircle className="w-16 h-16 mb-5 text-red-500" />
        )}
        <p className="text-lg font-medium">{notification.message}</p>
      </div>
    </motion.div>
  </div>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const { mode } = useTheme();
  const { app } = useCalimero();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showAgreementTypeModal, setShowAgreementTypeModal] = useState(false);
  const [showDaoCreateModal, setShowDaoCreateModal] = useState(false);
  const [agreementName, setAgreementName] = useState('');
  const [invitationPayload, setInvitationPayload] = useState('');
  const [contextName, setContextName] = useState('');
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinProgress, setJoinProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [generatedIdentity, setGeneratedIdentity] = useState<string>('');
  const [generatingIdentity, setGeneratingIdentity] = useState(false);
  const [notification, setNotification] = useState<NotificationState | null>(
    null,
  );

  const [daoStep, setDaoStep] = useState(1);
  const [daoAgreementName, setDaoAgreementName] = useState('');
  const [daoParticipants, setDaoParticipants] = useState<any[]>([]);
  const [currentParticipant, setCurrentParticipant] = useState({
    contextId: '',
    invitationPayload: '',
    icpId: '',
  });
  const [milestoneType, setMilestoneType] = useState('');
  const [milestoneDescription, setMilestoneDescription] = useState('');
  const [uploadedDocuments, setUploadedDocuments] = useState<File[]>([]);
  const [totalFunding, setTotalFunding] = useState('');
  const [milestones, setMilestones] = useState<any[]>([]);
  const [currentMilestone, setCurrentMilestone] = useState({
    id: 0,
    title: '',
    description: '',
    amount: '',
    recipients: [],
    type: 'manual',
  });
  const [daoAgreementCreated, setDaoAgreementCreated] = useState(false);
  const [daoContextId, setDaoContextId] = useState('');
  const [generatingInvitationPayload, setGeneratingInvitationPayload] =
    useState(false);

  const agreementService = useMemo(() => new AgreementService(app), [app]);
  const nodeApiService = useMemo(() => new ContextApiDataSource(app), [app]);
  const clientApiService = useMemo(() => new ClientApiDataSource(app), [app]);

  const showNotification = useCallback(
    (message: string, type: NotificationType) => {
      setNotification({ message, type });
      setTimeout(() => {
        setNotification(null);
      }, 2000);
    },
    [],
  );

  const loadAgreements = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await agreementService.listAgreements();

      if (response.error) {
        console.error('Dashboard: Error from listAgreements:', response.error);
        setError(response.error.message);
        setAgreements([]);
      } else {
        setAgreements(response.data || []);
      }
    } catch (err) {
      console.error('Failed to load agreements:', err);
      setError('Failed to load agreements');
      setAgreements([]);
    } finally {
      setLoading(false);
    }
  }, [agreementService]);

  useEffect(() => {
    if (app) {
      loadAgreements();
    }
  }, [app, loadAgreements]);

  const stats = [
    {
      label: 'Active Agreements',
      value: agreements.length,
      icon: Layers,
      color: 'text-blue-600',
      bg: 'bg-blue-100 dark:bg-blue-900/20',
    },
  ];

  const filteredContexts = agreements.filter((agreement) => {
    if (!agreement.name) {
      return false;
    }
    const matchesSearch = agreement.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  const handleCreateAgreement = async () => {
    if (!agreementName.trim()) return;

    try {
      setCreating(true);
      setError(null);

      const response = await agreementService.createAgreement(
        agreementName.trim(),
      );

      if (response.error) {
        setError(response.error.message);
        return;
      }

      showNotification('Agreement created successfully!', 'success');
      setShowCreateModal(false);
      setAgreementName('');

      await loadAgreements();
    } catch (err) {
      console.error('Failed to create agreement:', err);
      setError('Failed to create agreement');
    } finally {
      setCreating(false);
    }
  };

  const handleAgreementTypeSelection = (type: 'default' | 'dao') => {
    setShowAgreementTypeModal(false);
    if (type === 'default') {
      setShowCreateModal(true);
    } else {
      setShowDaoCreateModal(true);
    }
  };

  const generateInvitationPayload = useCallback(
    async (contextId: string, invitee: string) => {
      try {
        setGeneratingInvitationPayload(true);
        setError(null);

        if (!daoContextId) {
          setError(
            'DAO context not created yet. Please complete step 1 first.',
          );
          return;
        }

        const agreementContextUserID = localStorage.getItem(
          'tempDaoContextUserID',
        );

        if (!agreementContextUserID) {
          setError('User ID not found. Please ensure you are logged in.');
          return;
        }

        const response = await nodeApiService.inviteToContext({
          contextId: daoContextId, // Use the DAO context ID instead of the passed contextId
          invitee: invitee.trim(),
          inviter: agreementContextUserID, // Use the current user as inviter
        });

        if (response.error) {
          console.error('Generate invitation payload error:', response.error);
          setError(
            response.error.message || 'Failed to generate invitation payload',
          );
          return;
        }

        if (!response.data) {
          setError('No invitation payload data received');
          return;
        }

        const invitationPayload = response.data;
        if (!invitationPayload) {
          setError('Invalid invitation payload response');
          return;
        }

        setCurrentParticipant((prev) => ({
          ...prev,
          invitationPayload: invitationPayload,
        }));

        showNotification(
          'Invitation payload generated successfully!',
          'success',
        );
      } catch (err) {
        console.error('Failed to generate invitation payload:', err);
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Failed to generate invitation payload';
        setError(errorMessage);
      } finally {
        setGeneratingInvitationPayload(false);
      }
    },
    [
      nodeApiService,
      showNotification,
      setCurrentParticipant,
      setError,
      setGeneratingInvitationPayload,
      daoContextId,
    ],
  );

  const copyInvitationPayload = async (payload: string) => {
    try {
      await navigator.clipboard.writeText(payload);
      showNotification('Invitation payload copied to clipboard!', 'success');
    } catch (err) {
      console.error('Failed to copy invitation payload:', err);
      showNotification('Failed to copy invitation payload', 'error');
    }
  };

  const addCurrentParticipant = () => {
    if (currentParticipant.contextId && currentParticipant.icpId) {
      setDaoParticipants((prev) => [...prev, { ...currentParticipant }]);
      setCurrentParticipant({
        contextId: '',
        invitationPayload: '',
        icpId: '',
      });
    }
  };

  const removeParticipant = (index: number) => {
    setDaoParticipants((prev) => prev.filter((_, i) => i !== index));
  };

  const handleNextStep = async () => {
    if (daoStep === 1 && !daoAgreementCreated) {
      try {
        setCreating(true);
        setError(null);

        if (!daoAgreementName.trim()) {
          setError('Please enter an agreement name');
          return;
        }

        const createResponse =
          await agreementService.createDaoAgreementContext(daoAgreementName);

        if (createResponse.error) {
          throw new Error(createResponse.error.message);
        }

        if (createResponse.data) {
          const agreement = createResponse.data;
          const contextId = agreement.contextId;
          const userId = agreement.memberPublicKey;

          localStorage.setItem('tempDaoContextID', contextId);
          localStorage.setItem('tempDaoContextUserID', userId);
          localStorage.setItem('tempDaoAgreementName', daoAgreementName);

          setDaoContextId(contextId);
          setDaoAgreementCreated(true);

          showNotification(
            'DAO agreement context created successfully!',
            'success',
          );

          setTimeout(async () => {
            await loadAgreements();
          }, 500);
        }

        setDaoStep(2);
      } catch (err) {
        console.error('Failed to create DAO context:', err);
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Failed to create DAO agreement context';
        setError(errorMessage);
      } finally {
        setCreating(false);
      }
    } else {
      setDaoStep((prev) => prev + 1);
    }
  };

  const handlePrevStep = () => {
    setDaoStep((prev) => prev - 1);
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (files) {
      const newFiles = Array.from(files);

      setUploadedDocuments((prev) => [...prev, ...newFiles]);
    }
  };

  const removeDocument = (index: number) => {
    setUploadedDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  const canProceedToNextStep = () => {
    switch (daoStep) {
      case 1:
        return daoAgreementName.trim() !== '';
      case 2:
        return daoParticipants.length >= 0; // Participants are optional, creator is included by default
      case 3:
        return true; // Documents are optional
      case 4:
        return totalFunding.trim() !== '' && parseFloat(totalFunding) > 0;
      case 5:
        const totalMilestoneAmount = milestones.reduce(
          (sum, m) => sum + parseFloat(m.amount || '0'),
          0,
        );
        const funding = parseFloat(totalFunding || '0');
        return milestones.length > 0 && totalMilestoneAmount <= funding;
      case 6:
        return true;
      default:
        return false;
    }
  };

  const handleCreateDaoAgreement = async () => {
    try {
      setCreating(true);
      setError(null);

      if (!daoAgreementName.trim()) {
        setError('Agreement name is required');
        return;
      }

      if (!totalFunding || parseFloat(totalFunding) <= 0) {
        setError('Valid total funding amount is required');
        return;
      }

      if (milestones.length === 0) {
        setError('At least one milestone is required');
        return;
      }

      const participantIds = daoParticipants
        .map((p) => p.icpId)
        .filter((id) => id); // Filter out empty IDs

      const createResponse = await agreementService.createCompleteDaoAgreement(
        daoAgreementName,
        participantIds,
        milestones,
        parseFloat(totalFunding), // Pass as number, service will handle conversion
        75, // Default voting threshold of 75%
        uploadedDocuments, // Pass uploaded documents
      );

      if (createResponse.error) {
        throw new Error(createResponse.error.message);
      }

      const { agreement } = createResponse.data!;

      localStorage.setItem('agreementContextID', agreement.contextId);
      localStorage.setItem('agreementContextUserID', agreement.memberPublicKey);

      localStorage.removeItem('tempDaoContextID');
      localStorage.removeItem('tempDaoContextUserID');
      localStorage.removeItem('tempDaoAgreementName');

      showNotification('DAO Agreement created successfully!', 'success');
      setShowDaoCreateModal(false);
      resetDaoForm();

      setTimeout(async () => {
        await loadAgreements();
      }, 1000);
    } catch (err) {
      console.error('Failed to create DAO agreement:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create DAO agreement';
      setError(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  const resetDaoForm = () => {
    setDaoStep(1);
    setDaoAgreementName('');
    setDaoParticipants([]);
    setCurrentParticipant({ contextId: '', invitationPayload: '', icpId: '' });
    setUploadedDocuments([]);
    setTotalFunding('');
    setMilestones([]);
    setCurrentMilestone({
      id: 0,
      title: '',
      description: '',
      amount: '',
      recipients: [],
      type: 'manual',
    });
    setDaoAgreementCreated(false);
    setDaoContextId('');
    setError(null);

    localStorage.removeItem('tempDaoContextID');
    localStorage.removeItem('tempDaoContextUserID');
    localStorage.removeItem('tempDaoAgreementName');
  };

  const addMilestone = () => {
    if (currentMilestone.title && currentMilestone.amount) {
      const newMilestone = {
        ...currentMilestone,
        id: Date.now(),
      };
      setMilestones((prev) => [...prev, newMilestone]);
      setCurrentMilestone({
        id: 0,
        title: '',
        description: '',
        amount: '',
        recipients: [],
        type: 'manual',
      });
    }
  };

  const removeMilestone = (id: number) => {
    setMilestones((prev) => prev.filter((m) => m.id !== id));
  };

  const handleJoinAgreement = async () => {
    if (!invitationPayload.trim()) {
      setError('Please enter a valid invitation payload');
      return;
    }
    if (!contextName.trim()) {
      setError('Please enter the context name you are joining');
      return;
    }

    const payload = invitationPayload.trim();

    if (payload.length < 10) {
      setError('Invitation payload appears to be invalid (too short)');
      return;
    }

    try {
      setJoining(true);
      setError(null);
      setJoinProgress('Joining context...');

      const joinResponse = await nodeApiService.joinContext({
        invitationPayload: payload,
      });

      if (joinResponse.error) {
        console.error('Join context error:', joinResponse.error);
        setError(joinResponse.error.message || 'Failed to join context');
        setJoining(false);
        return;
      }

      setJoinProgress('Storing context information...');
      if (!joinResponse.data) {
        setError('No data received from join context response');
        setJoining(false);
        return;
      }

      const { contextId, memberPublicKey } = joinResponse.data;
      if (!contextId || !memberPublicKey) {
        setError('Invalid join context response data');
        setJoining(false);
        return;
      }

      localStorage.setItem('agreementContextID', contextId);
      localStorage.setItem('agreementContextUserID', memberPublicKey);

      setJoinProgress('Joining shared context...');

      const joinSharedResponse = await clientApiService.joinSharedContext(
        contextId,
        memberPublicKey,
        contextName.trim(),
      );

      if (joinSharedResponse.error) {
        console.error('Join shared context error:', joinSharedResponse.error);
        setError(
          'Failed to join shared context: ' + joinSharedResponse.error.message,
        );
        setJoining(false);
        return;
      }

      setJoinProgress('Finalizing...');
      setShowJoinModal(false);
      setInvitationPayload('');
      setContextName('');
      setGeneratedIdentity('');

      await loadAgreements();

      showNotification('Successfully joined agreement!', 'success');
    } catch (err) {
      console.error('Failed to join agreement:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to join agreement';
      setError(errorMessage);
    } finally {
      setJoining(false);
      setJoinProgress('');
    }
  };

  const handleGenerateIdentity = async () => {
    try {
      setGeneratingIdentity(true);
      setError(null);

      const identityResponse = await apiClient.node().createNewIdentity();

      if (identityResponse.error) {
        setError(
          'Failed to generate identity: ' + identityResponse.error.message,
        );
        return;
      }

      if (identityResponse.data) {
        const identity = identityResponse.data as any;
        const identityId =
          identity.publicKey || identity.id || JSON.stringify(identity);
        setGeneratedIdentity(identityId);
        showNotification('Identity generated successfully!', 'success');
      } else {
        setError('No identity data received');
      }
    } catch (err) {
      console.error('Failed to generate identity:', err);
      setError('Failed to generate identity');
    } finally {
      setGeneratingIdentity(false);
    }
  };

  const handleCopyIdentity = async () => {
    if (generatedIdentity) {
      try {
        await navigator.clipboard.writeText(generatedIdentity);
        showNotification('Identity copied to clipboard!', 'success');
      } catch (err) {
        console.error('Failed to copy identity:', err);
        showNotification('Failed to copy identity', 'error');
      }
    }
  };

  const handleAgreementClick = (agreement: Agreement) => {
    localStorage.setItem('agreementContextID', agreement.contextId);
    localStorage.setItem('agreementContextUserID', agreement.sharedIdentity);

    navigate('/agreement');
  };

  return (
    <MobileLayout>
      <AnimatePresence>
        {notification && <NotificationPopup notification={notification} />}
      </AnimatePresence>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Header */}
        <motion.section variants={itemVariants} className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
              Dashboard
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage your agreements and documents
            </p>
          </div>

          {/* Button and Stats Row */}
          <div className="flex flex-col sm:flex-row items-stretch gap-3 sm:gap-4">
            <div className="flex gap-2 w-full sm:w-auto flex-shrink-0">
              <Button
                onClick={() => setShowAgreementTypeModal(true)}
                className="group dark:text-black h-[52px] px-4 w-full sm:w-auto flex-1 sm:flex-none min-w-0"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Agreement
              </Button>
              <Button
                onClick={() => setShowJoinModal(true)}
                variant="outline"
                className="group h-[52px] px-4 w-full sm:w-auto flex-1 sm:flex-none min-w-0"
                size="sm"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Join Agreement
              </Button>
            </div>

            <div className="flex-1">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <Card
                    key={index}
                    className="p-3 hover:shadow-lg transition-all duration-300 w-full h-[52px]"
                  >
                    <div className="flex items-center gap-3 h-full">
                      <div
                        className={`p-2 rounded-full ${stat.bg} flex-shrink-0`}
                      >
                        <Icon className={`w-4 h-4 ${stat.color}`} />
                      </div>
                      <div className="flex min-w-0 gap-2 justify-between items-center">
                        <div className="text-lg sm:text-xl font-bold text-foreground">
                          {stat.value}
                        </div>
                        <div className="text-s text-muted-foreground truncate">
                          {stat.label}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </motion.section>

        {/* Search */}
        <motion.section variants={itemVariants} className="px-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search agreements ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 sm:py-3 text-sm sm:text-base border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300"
            />
          </div>
        </motion.section>

        {/* Context Cards */}
        <motion.section variants={itemVariants}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              Your Agreements
            </h2>
          </div>

          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">
                Loading agreements...
              </p>
            </div>
          )}

          {error && !loading && (
            <div className="text-center py-8">
              <p className="text-red-500 mb-4">{error}</p>
              <Button onClick={loadAgreements} variant="outline">
                Try Again
              </Button>
            </div>
          )}

          {!loading && !error && filteredContexts.length === 0 && (
            <div className="text-center py-8">
              <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No agreements found
              </h3>
              <p className="text-muted-foreground mb-4">
                Create your first agreement to get started with document
                management.
              </p>
            </div>
          )}

          {!loading && !error && filteredContexts.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredContexts.map((context) => (
                <motion.div
                  key={context.id}
                  whileHover={{ y: -2, scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <Card
                    className="group cursor-pointer h-full hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 border-border/50 hover:border-primary/20"
                    onClick={() => handleAgreementClick(context)}
                  >
                    <CardContent className="p-4 sm:p-6">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3 sm:mb-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm sm:text-base text-foreground mb-1 group-hover:text-primary transition-colors duration-300 line-clamp-1">
                            {context.name}
                          </h3>
                          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-2">
                            Context ID: {context.contextId.slice(0, 6)}...
                            {context.contextId.slice(-4)}
                          </p>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="space-y-2.5 sm:space-y-3">
                        {/* Footer */}
                        <div className="flex items-center justify-between pt-2 border-t border-border/50">
                          <span className="text-xs text-muted-foreground">
                            Joined:{' '}
                            {new Date(
                              context.joinedAt / 1000000,
                            ).toLocaleDateString()}
                          </span>
                          <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.section>
      </motion.div>

      {/* Create Agreement Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`rounded-lg p-6 w-full max-w-md border border-border shadow-2xl ${
              mode === 'dark' ? 'bg-gray-900' : 'bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                Create New Agreement
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowCreateModal(false);
                  setAgreementName('');
                  setError(null);
                }}
                className="p-1 h-auto w-auto"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="agreementName"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  Agreement Name
                </label>
                <input
                  id="agreementName"
                  type="text"
                  value={agreementName}
                  onChange={(e) => setAgreementName(e.target.value)}
                  placeholder="Enter agreement name..."
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  autoFocus
                />
              </div>

              {error && (
                <div className="p-3 bg-red-100 border border-red-300 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => {
                    setShowCreateModal(false);
                    setAgreementName('');
                    setError(null);
                  }}
                  variant="outline"
                  className="flex-1"
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateAgreement}
                  className="flex-1 dark:text-black"
                  disabled={!agreementName.trim() || creating}
                >
                  {creating ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Join Agreement Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`rounded-lg p-6 w-full max-w-md border border-border shadow-2xl ${
              mode === 'dark' ? 'bg-gray-900' : 'bg-white'
            }`}
          >
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">
                  Join Agreement
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowJoinModal(false);
                    setInvitationPayload('');
                    setContextName('');
                    setGeneratedIdentity('');
                    setError(null);
                    setJoinProgress('');
                  }}
                  className="p-1 h-auto w-auto"
                  disabled={joining}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div>
                <label
                  htmlFor="invitationPayload"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  Invitation Payload
                </label>
                <textarea
                  id="invitationPayload"
                  value={invitationPayload}
                  onChange={(e) => setInvitationPayload(e.target.value)}
                  placeholder="Paste the invitation payload you received..."
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                  rows={4}
                  disabled={joining}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter the invitation payload shared by the agreement owner
                </p>
              </div>
              <div>
                <label
                  htmlFor="contextName"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  Context Name
                </label>
                <input
                  id="contextName"
                  type="text"
                  value={contextName}
                  onChange={(e) => setContextName(e.target.value)}
                  placeholder="Enter the name of the context you are joining"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={joining}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This will be used as the name for the joined context
                </p>
              </div>

              {/* Identity Generation Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-foreground">
                    Identity
                  </label>
                  <Button
                    onClick={handleGenerateIdentity}
                    variant="outline"
                    size="sm"
                    disabled={joining || generatingIdentity}
                    className="h-8 px-3"
                  >
                    {generatingIdentity ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <Key className="w-3 h-3 mr-1" />
                        Generate Identity
                      </>
                    )}
                  </Button>
                </div>

                {generatedIdentity && (
                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        type="text"
                        value={generatedIdentity}
                        readOnly
                        className="w-full px-3 py-2 pr-10 border border-border rounded-lg bg-muted text-foreground font-mono text-sm"
                      />
                      <Button
                        onClick={handleCopyIdentity}
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Your generated identity. Click the copy button to copy it
                      to clipboard.
                    </p>
                  </div>
                )}

                {!generatedIdentity && (
                  <p className="text-xs text-muted-foreground">
                    Generate a new identity. This is sending your identity to
                    other users for creating invitation payload for you to join
                    agreements.
                  </p>
                )}
              </div>

              {error && (
                <div className="p-3 bg-red-100 border border-red-300 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => {
                    setShowJoinModal(false);
                    setInvitationPayload('');
                    setContextName('');
                    setGeneratedIdentity('');
                    setError(null);
                    setJoinProgress('');
                  }}
                  variant="outline"
                  className="flex-1"
                  disabled={joining}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleJoinAgreement}
                  className="flex-1 dark:text-black"
                  disabled={
                    !invitationPayload.trim() || !contextName.trim() || joining
                  }
                >
                  {joining ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                      {joinProgress || 'Joining...'}
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Join Agreement
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Agreement Type Selection Modal */}
      <CreateAgreementTypeModal
        showModal={showAgreementTypeModal}
        setShowModal={setShowAgreementTypeModal}
        onSelectType={handleAgreementTypeSelection}
        mode={mode}
      />

      {/* DAO Create Modal */}
      <DaoCreateModal
        showDaoCreateModal={showDaoCreateModal}
        setShowDaoCreateModal={setShowDaoCreateModal}
        daoStep={daoStep}
        setDaoStep={setDaoStep}
        daoAgreementName={daoAgreementName}
        setDaoAgreementName={setDaoAgreementName}
        daoParticipants={daoParticipants}
        setDaoParticipants={setDaoParticipants}
        currentParticipant={currentParticipant}
        setCurrentParticipant={setCurrentParticipant}
        milestoneType={milestoneType}
        setMilestoneType={setMilestoneType}
        milestoneDescription={milestoneDescription}
        setMilestoneDescription={setMilestoneDescription}
        uploadedDocuments={uploadedDocuments}
        setUploadedDocuments={setUploadedDocuments}
        totalFunding={totalFunding}
        setTotalFunding={setTotalFunding}
        milestones={milestones}
        setMilestones={setMilestones}
        currentMilestone={currentMilestone}
        setCurrentMilestone={setCurrentMilestone}
        mode={mode}
        error={error}
        creating={creating}
        daoAgreementCreated={daoAgreementCreated}
        daoContextId={daoContextId}
        generatingInvitationPayload={generatingInvitationPayload}
        generateInvitationPayload={generateInvitationPayload}
        copyInvitationPayload={copyInvitationPayload}
        addCurrentParticipant={addCurrentParticipant}
        removeParticipant={removeParticipant}
        handleNextStep={handleNextStep}
        handlePrevStep={handlePrevStep}
        handleFileUpload={handleFileUpload}
        removeDocument={removeDocument}
        canProceedToNextStep={canProceedToNextStep}
        handleCreateDaoAgreement={handleCreateDaoAgreement}
        resetDaoForm={resetDaoForm}
        addMilestone={addMilestone}
        removeMilestone={removeMilestone}
      />
    </MobileLayout>
  );
}
