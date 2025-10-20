/**
 * Shared error handling utilities for edge functions
 * Prevents sensitive information leakage in error responses
 */

export interface SecureErrorResponse {
  error: string;
  code: string;
  requestId: string;
}

/**
 * Generates a unique request ID for error tracking
 */
export function generateRequestId(): string {
  return crypto.randomUUID();
}

/**
 * Logs detailed error information server-side
 * Returns generic error message for client
 */
export function handleEdgeFunctionError(
  error: unknown,
  context: string,
  requestId?: string
): SecureErrorResponse {
  const id = requestId || generateRequestId();
  
  // Log detailed error server-side for debugging
  console.error(`[${context}] Error (Request ID: ${id}):`, {
    error: error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : error,
    timestamp: new Date().toISOString(),
    context
  });

  // Return generic error to client
  return {
    error: 'Operation failed',
    code: getErrorCode(context),
    requestId: id
  };
}

/**
 * Gets a generic error code based on context
 */
function getErrorCode(context: string): string {
  const contextMap: Record<string, string> = {
    'import-roster': 'IMPORT_ERROR',
    'delete-user': 'DELETE_ERROR',
    'create-user': 'CREATE_ERROR',
    'complete-mode': 'COMPLETION_ERROR',
    'delete-dismissal': 'DELETE_ERROR',
    'end-session': 'SESSION_ERROR',
    'reset-run': 'RESET_ERROR',
    'email-change': 'EMAIL_CHANGE_ERROR',
    'invite-teacher': 'INVITE_ERROR'
  };
  
  return contextMap[context] || 'OPERATION_ERROR';
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  error: unknown,
  context: string,
  status: number = 500,
  corsHeaders: Record<string, string> = {}
): Response {
  const secureError = handleEdgeFunctionError(error, context);
  
  return new Response(
    JSON.stringify(secureError),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    }
  );
}

/**
 * Sanitizes database error messages
 * Removes sensitive schema information
 */
export function sanitizeDatabaseError(error: any): string {
  // Remove any mention of table names, column names, or constraints
  const message = error?.message || 'Database operation failed';
  
  // Log full details server-side
  console.error('Database error details:', {
    code: error?.code,
    message: error?.message,
    details: error?.details,
    hint: error?.hint
  });
  
  // Return generic message
  return 'Database operation failed';
}
