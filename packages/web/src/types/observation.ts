/**
 * Observation Types for ROPI AOSS
 * 
 * Type definitions for the Observations feature.
 * 
 * Related Notion docs:
 * - Workflow W1 — Observations: https://www.notion.so/2b845ee1ec5a81b5a4a6d3ea439ec277
 * - Observations Overview: https://www.notion.so/2b845ee1ec5a81e1aeeae43318b38039
 * - Product Completion Workflows: https://www.notion.so/2ba45ee1ec5a80698690f9492961ed8b
 */

export type ObservationSeverity = 'low' | 'medium' | 'high';
export type ObservationStatus = 'open' | 'resolved';

export interface ObservationCreator {
  uid: string;
  name: string;
}

export interface Observation {
  id: string;
  productId: string;
  title: string;
  body: string;
  severity: ObservationSeverity;
  status: ObservationStatus;
  linkedField?: string | null;
  images?: string[]; // Storage paths or data URLs
  createdBy: ObservationCreator;
  createdAt: Date;
  resolvedBy?: ObservationCreator | null;
  resolvedAt?: Date | null;
}

export interface CreateObservationInput {
  productId: string;
  title: string;
  body: string;
  severity: ObservationSeverity;
  linkedField?: string | null;
  images?: string[];
  createdBy: ObservationCreator;
}
