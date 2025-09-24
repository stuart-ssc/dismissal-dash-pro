/**
 * Production-safe logging utility
 * Removes console logging in production builds and provides structured logging
 */

const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

interface LogData {
  message: string;
  data?: any;
  error?: Error;
  userId?: string;
  action?: string;
}

class SecureLogger {
  private shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
    // In production, only log warnings and errors
    if (isProduction) {
      return level === 'warn' || level === 'error';
    }
    return isDevelopment;
  }

  private sanitizeData(data?: any): any {
    if (!data) return undefined;
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'key', 'secret', 'auth', 'session'];
    
    if (typeof data === 'object') {
      const sanitized = { ...data };
      for (const field of sensitiveFields) {
        if (field in sanitized) {
          sanitized[field] = '[REDACTED]';
        }
      }
      return sanitized;
    }
    
    return data;
  }

  debug(logData: LogData): void {
    if (!this.shouldLog('debug')) return;
    
    console.log(`[DEBUG] ${logData.message}`, this.sanitizeData(logData.data));
  }

  info(logData: LogData): void {
    if (!this.shouldLog('info')) return;
    
    console.info(`[INFO] ${logData.message}`, this.sanitizeData(logData.data));
  }

  warn(logData: LogData): void {
    if (!this.shouldLog('warn')) return;
    
    console.warn(`[WARN] ${logData.message}`, this.sanitizeData(logData.data));
  }

  error(logData: LogData): void {
    if (!this.shouldLog('error')) return;
    
    console.error(`[ERROR] ${logData.message}`, this.sanitizeData(logData.data), logData.error);
    
    // In production, you might want to send errors to a monitoring service
    if (isProduction && logData.error) {
      // TODO: Integrate with error monitoring service (e.g., Sentry)
      this.reportError(logData);
    }
  }

  private reportError(logData: LogData): void {
    // Placeholder for error reporting service integration
    // This could send to Sentry, LogRocket, or another monitoring service
    try {
      // Example: Send to monitoring service
      // monitoringService.reportError({
      //   message: logData.message,
      //   error: logData.error,
      //   userId: logData.userId,
      //   action: logData.action,
      //   timestamp: new Date().toISOString()
      // });
    } catch (reportingError) {
      // Don't let error reporting break the app
      console.error('Failed to report error:', reportingError);
    }
  }

  // Security-focused logging for audit trails
  security(action: string, userId?: string, details?: any): void {
    const logData: LogData = {
      message: `Security Event: ${action}`,
      data: this.sanitizeData(details),
      userId,
      action
    };

    this.info(logData);
    
    // In production, always report security events
    if (isProduction) {
      this.reportSecurityEvent(action, userId, details);
    }
  }

  private reportSecurityEvent(action: string, userId?: string, details?: any): void {
    // Placeholder for security event reporting
    // This should integrate with your security monitoring system
    try {
      // Example: Send to security monitoring
      // securityMonitoring.reportEvent({
      //   action,
      //   userId,
      //   details: this.sanitizeData(details),
      //   timestamp: new Date().toISOString(),
      //   severity: 'info'
      // });
    } catch (error) {
      console.error('Failed to report security event:', error);
    }
  }
}

export const logger = new SecureLogger();

// Helper functions for easy migration from console.log
export const debuglog = (message: string, data?: any) => logger.debug({ message, data });
export const infolog = (message: string, data?: any) => logger.info({ message, data });
export const warnlog = (message: string, data?: any) => logger.warn({ message, data });
export const errorlog = (message: string, error?: Error, data?: any) => logger.error({ message, error, data });
export const securitylog = (action: string, userId?: string, details?: any) => logger.security(action, userId, details);