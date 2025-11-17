/**
 * AI Workflow Panel - Orchestrates Smart Detect → Validator → AI Description Engine
 */

import React, { useState, useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { newToLegacy, stripUndefined } from '../../utils/schemaAdapter';
import SmartDetectPanel from './SmartDetectPanel';
import ValidationPanel from './ValidationPanel';
import DescriptionPanel from './DescriptionPanel';
import { ValidationIssue } from '../../api/validator';
import { SmartDetectSuggestion } from '../../api/smartDetect';

interface AIWorkflowPanelProps {
  productId: string;
  productData: any;
  onProductUpdate: (updates: any) => void;
  isOpen: boolean;
  onClose: () => void;
  showToast?: (message: string, type: 'success' | 'error') => void;
}

const AIWorkflowPanel: React.FC<AIWorkflowPanelProps> = ({
  productId,
  productData,
  onProductUpdate,
  isOpen,
  onClose,
  showToast = () => {}, // Default no-op if not provided
}) => {
  const [activeStep, setActiveStep] = useState<'detect' | 'validate' | 'describe'>('detect');
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  // Reset workflow when product changes
  useEffect(() => {
    if (productId) {
      setActiveStep('detect');
      setCompletedSteps(new Set());
    }
  }, [productId]);

  const handleApplySuggestion = (fieldPath: string, value: any) => {
    // Apply single suggestion to product data
    const updates = setNestedValue({}, fieldPath, value);
    onProductUpdate(updates);
    
    // Mark detect step as completed
    setCompletedSteps(prev => new Set([...prev, 'detect']));
  };

  const handleApplyAllSuggestions = (suggestions: SmartDetectSuggestion[]) => {
    // Apply all suggestions to product data
    const updates: any = {};
    suggestions.forEach(suggestion => {
      setNestedValue(updates, suggestion.fieldPath, suggestion.suggestedValue);
    });
    
    onProductUpdate(updates);
    
    // Mark detect step as completed and move to validation
    setCompletedSteps(prev => new Set([...prev, 'detect']));
    setActiveStep('validate');
  };

  const handleIssueClick = (issue: ValidationIssue) => {
    // Focus on the field with the issue
    console.log('Focus on field:', issue.fieldPath);
    // Could emit an event to highlight the field in the main editor
  };

  const handleDescriptionUpdate = async (description: string, seoData?: any) => {
    // Build nested updates using canonical schema
    const updates: any = {
      descriptive: {
        description,
        metaName: seoData?.title || undefined,
        metaDescription: seoData?.metaDescription || undefined,
        keywords: seoData?.keywords || undefined,
      },
      ai: {
        descriptionHtml: description,
      }
    };
    
    // Update UI instantly
    onProductUpdate(updates);
    
    // Persist to Firestore with auto-save
    try {
      // Merge updates with existing product data
      const merged = applyNestedUpdate(productData, updates);
      
      // Convert to legacy format and strip undefined values
      const legacyData = stripUndefined(newToLegacy(merged));
      
      // Persist to Firestore
      await setDoc(doc(db, 'products', productId), legacyData, { merge: true });
      
      showToast('Saved', 'success');
    } catch (error) {
      console.error('Failed to save description:', error);
      showToast('Save failed', 'error');
    }
    
    // Mark describe step as completed
    setCompletedSteps(prev => new Set([...prev, 'describe']));
  };
  
  // Helper to apply nested updates to product data
  const applyNestedUpdate = (base: any, updates: any): any => {
    const result = { ...base };
    for (const [key, value] of Object.entries(updates)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = { ...(result[key] || {}), ...value };
      } else {
        result[key] = value;
      }
    }
    return result;
  };

  // Helper function to set nested object values
  const setNestedValue = (obj: any, path: string, value: any) => {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
    return obj;
  };

  const getStepStatus = (step: string) => {
    if (completedSteps.has(step)) return 'completed';
    if (activeStep === step) return 'active';
    return 'pending';
  };

  const getStepIcon = (step: string) => {
    const status = getStepStatus(step);
    
    switch (status) {
      case 'completed':
        return '✅';
      case 'active':
        return '🔄';
      case 'pending':
        return '⏳';
      default:
        return '•';
    }
  };

  const stepTitles = {
    detect: 'Smart Detect',
    validate: 'Quality Check',
    describe: 'AI Description',
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-1/2 bg-white border-l border-gray-200 shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">AI Workflow Assistant</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl"
        >
          ×
        </button>
      </div>

      {/* Workflow Steps */}
      <div className="flex border-b border-gray-200">
        {(['detect', 'validate', 'describe'] as const).map((step, index) => {
          const status = getStepStatus(step);
          
          return (
            <button
              key={step}
              onClick={() => setActiveStep(step)}
              className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                status === 'active'
                  ? 'border-indigo-500 text-indigo-600'
                  : status === 'completed'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span>{getStepIcon(step)}</span>
                <span>{stepTitles[step]}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {activeStep === 'detect' && (
            <SmartDetectPanel
              productId={productId}
              onApplySuggestion={handleApplySuggestion}
              onApplyAll={handleApplyAllSuggestions}
            />
          )}

          {activeStep === 'validate' && (
            <ValidationPanel
              productId={productId}
              onIssueClick={handleIssueClick}
            />
          )}

          {activeStep === 'describe' && (
            <DescriptionPanel
              productId={productId}
              productData={productData}
              currentDescription={productData?.description}
              onDescriptionUpdate={handleDescriptionUpdate}
            />
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Product: {productData?.name || productId}
          </div>
          
          <div className="flex gap-2">
            {activeStep !== 'detect' && (
              <button
                onClick={() => {
                  const steps = ['detect', 'validate', 'describe'];
                  const currentIndex = steps.indexOf(activeStep);
                  if (currentIndex > 0) {
                    setActiveStep(steps[currentIndex - 1] as any);
                  }
                }}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Previous
              </button>
            )}
            
            {activeStep !== 'describe' && (
              <button
                onClick={() => {
                  const steps = ['detect', 'validate', 'describe'];
                  const currentIndex = steps.indexOf(activeStep);
                  if (currentIndex < steps.length - 1) {
                    setActiveStep(steps[currentIndex + 1] as any);
                  }
                }}
                className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIWorkflowPanel;