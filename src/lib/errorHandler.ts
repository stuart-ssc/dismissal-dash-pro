/**
 * Secure error handling utilities
 * Prevents sensitive information leakage in error messages
 */

import { logger } from './logger';

export interface SecureError {
  message: string;
  code?: string;
  userMessage: string;
}

class ErrorHandler {
  /**
   * Converts any error into a secure error that's safe to show to users
   */
  toSecureError(error: unknown, context?: string): SecureError {
    const baseMessage = context ? `Error in ${context}` : 'An error occurred';
    
    // Default user-friendly message
    let userMessage = 'Something went wrong. Please try again.';
    let code: string | undefined;
    let message: string;

    if (error instanceof Error) {
      message = error.message;
      
      // Handle specific known error types with user-friendly messages
      if (this.isNetworkError(error)) {
        userMessage = 'Network connection error. Please check your internet connection.';
        code = 'NETWORK_ERROR';
      } else if (this.isAuthError(error)) {
        userMessage = 'Authentication failed. Please sign in again.';
        code = 'AUTH_ERROR';
      } else if (this.isValidationError(error)) {
        userMessage = 'Please check your input and try again.';
        code = 'VALIDATION_ERROR';
      } else if (this.isPermissionError(error)) {
        userMessage = 'You do not have permission to perform this action.';
        code = 'PERMISSION_ERROR';
      } else if (this.isNotFoundError(error)) {
        userMessage = 'The requested item was not found.';
        code = 'NOT_FOUND_ERROR';
      }
    } else if (typeof error === 'string') {
      message = error;
    } else {
      message = 'Unknown error occurred';
    }

    // Log the full error for debugging (will be sanitized by logger)
    logger.error({
      message: `${baseMessage}: ${message}`,
      error: error instanceof Error ? error : new Error(String(error)),
      data: { context, code }
    });

    return {
      message,
      code,
      userMessage
    };
  }

  private isNetworkError(error: Error): boolean {
    return error.message.toLowerCase().includes('network') ||
           error.message.toLowerCase().includes('fetch') ||
           error.message.toLowerCase().includes('connection');
  }

  private isAuthError(error: Error): boolean {
    return error.message.toLowerCase().includes('auth') ||
           error.message.toLowerCase().includes('unauthorized') ||
           error.message.toLowerCase().includes('token') ||
           error.message.toLowerCase().includes('session');
  }

  private isValidationError(error: Error): boolean {
    return error.message.toLowerCase().includes('validation') ||
           error.message.toLowerCase().includes('invalid') ||
           error.message.toLowerCase().includes('required');
  }

  private isPermissionError(error: Error): boolean {
    return error.message.toLowerCase().includes('permission') ||
           error.message.toLowerCase().includes('forbidden') ||
           error.message.toLowerCase().includes('access denied');
  }

  private isNotFoundError(error: Error): boolean {
    return error.message.toLowerCase().includes('not found') ||
           error.message.toLowerCase().includes('404');
  }

  /**
   * Global error boundary handler
   */
  handleGlobalError(error: Error, errorInfo?: any): void {
    logger.error({
      message: 'Unhandled application error',
      error,
      data: { errorInfo }
    });

    // In production, you might want to show a user-friendly error page
    // or redirect to a safe state
  }

  /**
   * Promise rejection handler
   */
  handleUnhandledRejection(event: PromiseRejectionEvent): void {
    logger.error({
      message: 'Unhandled promise rejection',
      error: new Error(String(event.reason)),
      data: { reason: event.reason }
    });

    // Prevent the default browser behavior of logging to console
    event.preventDefault();
  }
}

export const errorHandler = new ErrorHandler();

// Global error handlers
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    errorHandler.handleGlobalError(event.error);
  });

  window.addEventListener('unhandledrejection', (event) => {
    errorHandler.handleUnhandledRejection(event);
  });
}

// Helper function for components
export const handleError = (error: unknown, context?: string) => {
  return errorHandler.toSecureError(error, context);
};