/**
 * Validator API Client
 */

export interface ValidationIssue {
  code: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  fieldPath?: string;
}

export interface ValidationResult {
  ropiScore: number;
  issues: ValidationIssue[];
  summary: string;
}

/**
 * Call Validator API
 */
export async function callValidator(productId: string): Promise<ValidationResult> {
  const response = await fetch('/apiValidate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ productId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Call Validator API with product data directly
 */
export async function callValidatorWithProduct(product: any): Promise<ValidationResult> {
  const response = await fetch('/apiValidate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ product }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}