import React from 'react';
import { motion } from 'framer-motion';
import { X, FileText, Users, ArrowRight } from 'lucide-react';
import { Button } from '../../../components/ui';

interface CreateAgreementTypeModalProps {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  onSelectType: (type: 'default' | 'dao') => void;
  mode: string;
}

const CreateAgreementTypeModal: React.FC<CreateAgreementTypeModalProps> = ({
  showModal,
  setShowModal,
  onSelectType,
  mode,
}) => {
  if (!showModal) return null;

  const agreementTypes = [
    {
      type: 'default' as const,
      title: 'Default Agreement',
      description:
        'Traditional document-based agreement with basic signature workflow',
      icon: FileText,
      features: [
        'Document upload and management',
        'Digital signatures',
        'Audit trail Powered by ICP',
        'AI legal assistant',
      ],
      color: mode === 'dark' ? 'text-blue-400' : 'text-blue-600',
      bg: mode === 'dark' ? 'bg-blue-950/30' : 'bg-blue-50',
      iconBg: mode === 'dark' ? 'bg-blue-900/40' : 'bg-blue-100',
      border: mode === 'dark' ? 'border-blue-800/40' : 'border-blue-200/60',
      hover:
        mode === 'dark'
          ? 'hover:border-blue-700/60 hover:shadow-lg hover:shadow-blue-900/20'
          : 'hover:border-blue-300/80 hover:shadow-lg hover:shadow-blue-100/50',
    },
    {
      type: 'dao' as const,
      title: 'DAO Agreement',
      description:
        'Decentralized agreement with milestone-based funding and governance',
      icon: Users,
      features: [
        'Everything in Default Agreement',
        'Multi-participant governance',
        'Milestone-based funding',
        'Voting mechanisms',
      ],
      color: mode === 'dark' ? 'text-teal-400' : 'text-teal-600',
      bg: mode === 'dark' ? 'bg-teal-950/30' : 'bg-teal-50',
      iconBg: mode === 'dark' ? 'bg-teal-900/40' : 'bg-teal-100',
      border: mode === 'dark' ? 'border-teal-800/40' : 'border-teal-200/60',
      hover:
        mode === 'dark'
          ? 'hover:border-teal-700/60 hover:shadow-lg hover:shadow-teal-900/20'
          : 'hover:border-teal-300/80 hover:shadow-lg hover:shadow-teal-100/50',
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto min-h-screen">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className={`rounded-xl w-full max-w-5xl border border-border/50 shadow-2xl backdrop-blur-sm ${
          mode === 'dark' ? 'bg-gray-900/95' : 'bg-white/95'
        } max-h-[90vh] overflow-y-auto mt-12 sm:mt-0 mb-4 sm:mb-0`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border/50">
          <div className="space-y-1 flex-1 min-w-0">
            <h3 className="text-xl sm:text-2xl font-bold text-foreground">
              Choose Agreement Type
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Select the type of agreement you want to create to get started
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowModal(false)}
            className="p-2 h-auto w-auto hover:bg-muted/50 rounded-lg transition-colors ml-2 flex-shrink-0"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
            {agreementTypes.map((type) => {
              const Icon = type.icon;
              return (
                <motion.div
                  key={type.type}
                  whileHover={{ y: -4, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                  className={`group cursor-pointer border-2 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 transition-all duration-300 ${type.border} ${type.hover} ${type.bg} relative overflow-hidden`}
                  onClick={() => onSelectType(type.type)}
                >
                  {/* Subtle gradient overlay */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-br from-transparent via-transparent ${mode === 'dark' ? 'to-white/[0.02]' : 'to-black/[0.02]'} pointer-events-none`}
                  />

                  {/* Header Section */}
                  <div className="relative z-10 flex items-start gap-3 sm:gap-5 mb-4 sm:mb-6">
                    <div
                      className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl ${type.iconBg} flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}
                    >
                      <Icon className={`w-6 h-6 sm:w-8 sm:h-8 ${type.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-lg sm:text-xl font-bold text-foreground group-hover:text-primary transition-colors duration-300 mb-1 sm:mb-2">
                        {type.title}
                      </h4>
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        {type.description}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-2 transition-all duration-300 flex-shrink-0 mt-1" />
                  </div>

                  {/* Features Section */}
                  <div className="relative z-10 space-y-3 sm:space-y-4">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-1 h-1 rounded-full ${type.color.replace('text-', 'bg-')}`}
                      />
                      <h5 className="text-xs sm:text-sm font-semibold text-foreground">
                        Key Features
                      </h5>
                    </div>
                    <ul className="space-y-2 sm:space-y-3">
                      {type.features.map((feature, index) => (
                        <motion.li
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2 sm:gap-3 group-hover:text-foreground/80 transition-colors duration-300"
                        >
                          <div
                            className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${type.color.replace('text-', 'bg-')} flex-shrink-0 group-hover:scale-125 transition-transform duration-300`}
                          />
                          <span className="leading-relaxed">{feature}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>

                  {/* Action Hint */}
                  <div className="relative z-10 mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-border/30">
                    <div className="flex items-center justify-between text-xs text-muted-foreground group-hover:text-foreground/60 transition-colors duration-300">
                      <span>Click to select</span>
                      <div className="flex items-center gap-1">
                        <span>Get started</span>
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform duration-300" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0 p-4 sm:p-6 border-t border-border/50 bg-muted/20">
          <div className="text-xs text-muted-foreground text-center sm:text-left">
            Need help choosing? Contact support for guidance.
          </div>
          <Button
            onClick={() => setShowModal(false)}
            variant="outline"
            className="px-4 sm:px-6 hover:bg-muted/50 transition-colors w-full sm:w-auto"
          >
            Cancel
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default CreateAgreementTypeModal;
