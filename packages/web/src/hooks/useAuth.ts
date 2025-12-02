/**
 * Convenience re-export of useAuth hook from AuthProvider
 * 
 * Allows importing useAuth directly:
 * ```tsx
 * import { useAuth } from '@/hooks/useAuth';
 * ```
 * 
 * Instead of:
 * ```tsx
 * import { useAuth } from '@/contexts/AuthProvider';
 * ```
 */

export { useAuth } from '../contexts/AuthProvider';
