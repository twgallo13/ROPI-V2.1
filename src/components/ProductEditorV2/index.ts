/**
 * ProductEditorV2 Integration - Enhanced editor with AI Workflow Panel
 */

export { default as SmartDetectPanel } from './SmartDetectPanel';
export { default as ValidationPanel } from './ValidationPanel';
export { default as DescriptionPanel } from './DescriptionPanel';
export { default as AIWorkflowPanel } from './AIWorkflowPanel';

export type { ValidationIssue } from '../../api/validator';
export type { SmartDetectSuggestion } from '../../api/smartDetect';
export type { AIDescribeResult, LayoutBlocks } from '../../api/aiDescribe';