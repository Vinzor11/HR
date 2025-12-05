import { FormData } from './types';
import { validateEmployeeData } from '@/utils/csForm212Validation';

/**
 * Comprehensive CS Form 212 compliant validation
 * Uses the shared validation utility
 */
export const validateForm = (data: FormData): { [key: string]: string } => {
  const result = validateEmployeeData(data);
  return result.errors;
};
