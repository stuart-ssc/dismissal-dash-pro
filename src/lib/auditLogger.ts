/**
 * Audit logging for security-sensitive operations
 * Tracks access to student data and other sensitive operations
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from './logger';

export type AuditAction = 
  | 'STUDENT_VIEWED'
  | 'STUDENT_CREATED' 
  | 'STUDENT_UPDATED'
  | 'STUDENT_DELETED'
  | 'TEACHER_VIEWED'
  | 'TEACHER_CREATED'
  | 'TEACHER_UPDATED'
  | 'TEACHER_DELETED'
  | 'CLASS_VIEWED'
  | 'CLASS_CREATED'
  | 'CLASS_UPDATED'
  | 'CLASS_DELETED'
  | 'DISMISSAL_STARTED'
  | 'DISMISSAL_COMPLETED'
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'USER_ROLE_CHANGED'
  | 'SCHOOL_IMPERSONATION'
  | 'SETTINGS_CHANGED'
  | 'DATA_EXPORT'
  | 'BULK_IMPORT';

interface AuditLogEntry {
  action: AuditAction;
  tableName: string;
  recordId?: string;
  userId?: string;
  details?: Record<string, any>;
  timestamp?: string;
}

class AuditLogger {
  /**
   * Log an audit event to the database
   */
  async logEvent(entry: AuditLogEntry): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const auditEntry = {
        table_name: entry.tableName,
        record_id: entry.recordId,
        action: entry.action,
        user_id: entry.userId || user?.id,
        timestamp: entry.timestamp || new Date().toISOString(),
        details: entry.details ? JSON.stringify(this.sanitizeDetails(entry.details)) : null
      };

      const { error } = await supabase
        .from('audit_logs')
        .insert(auditEntry);

      if (error) {
        logger.warn({
          message: 'Failed to write audit log',
          data: { error: error.message, entry: auditEntry }
        });
      }
    } catch (error) {
      logger.error({
        message: 'Audit logging error',
        error: error instanceof Error ? error : new Error(String(error)),
        data: { entry }
      });
    }
  }

  /**
   * Remove sensitive information from audit details
   */
  private sanitizeDetails(details: Record<string, any>): Record<string, any> {
    const sanitized = { ...details };
    const sensitiveFields = ['password', 'token', 'key', 'secret', 'auth', 'session', 'contact_info'];
    
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Log student data access
   */
  async logStudentAccess(action: 'VIEWED' | 'CREATED' | 'UPDATED' | 'DELETED', studentId: string, details?: Record<string, any>): Promise<void> {
    await this.logEvent({
      action: `STUDENT_${action}` as AuditAction,
      tableName: 'students',
      recordId: studentId,
      details
    });

    // Also log to security logger for immediate monitoring
    logger.security(`Student ${action.toLowerCase()}`, undefined, { studentId, ...details });
  }

  /**
   * Log teacher data access
   */
  async logTeacherAccess(action: 'VIEWED' | 'CREATED' | 'UPDATED' | 'DELETED', teacherId: string, details?: Record<string, any>): Promise<void> {
    await this.logEvent({
      action: `TEACHER_${action}` as AuditAction,
      tableName: 'teachers',
      recordId: teacherId,
      details
    });

    logger.security(`Teacher ${action.toLowerCase()}`, undefined, { teacherId, ...details });
  }

  /**
   * Log authentication events
   */
  async logAuth(action: 'LOGIN' | 'LOGOUT', userId?: string, details?: Record<string, any>): Promise<void> {
    await this.logEvent({
      action: `USER_${action}` as AuditAction,
      tableName: 'profiles',
      recordId: userId,
      userId,
      details
    });

    logger.security(`User ${action.toLowerCase()}`, userId, details);
  }

  /**
   * Log dismissal operations
   */
  async logDismissal(action: 'STARTED' | 'COMPLETED', dismissalRunId: string, details?: Record<string, any>): Promise<void> {
    await this.logEvent({
      action: `DISMISSAL_${action}` as AuditAction,
      tableName: 'dismissal_runs',
      recordId: dismissalRunId,
      details
    });

    logger.security(`Dismissal ${action.toLowerCase()}`, undefined, { dismissalRunId, ...details });
  }

  /**
   * Log school impersonation events
   */
  async logImpersonation(schoolId: string, details?: Record<string, any>): Promise<void> {
    await this.logEvent({
      action: 'SCHOOL_IMPERSONATION',
      tableName: 'schools',
      recordId: schoolId,
      details
    });

    logger.security('School impersonation', undefined, { schoolId, ...details });
  }

  /**
   * Log settings changes
   */
  async logSettingsChange(setting: string, oldValue?: any, newValue?: any): Promise<void> {
    await this.logEvent({
      action: 'SETTINGS_CHANGED',
      tableName: 'schools',
      details: {
        setting,
        oldValue: this.sanitizeDetails({ value: oldValue }).value,
        newValue: this.sanitizeDetails({ value: newValue }).value
      }
    });

    logger.security('Settings changed', undefined, { setting });
  }

  /**
   * Log bulk data operations
   */
  async logBulkOperation(action: 'EXPORT' | 'IMPORT', tableName: string, recordCount: number, details?: Record<string, any>): Promise<void> {
    await this.logEvent({
      action: action === 'EXPORT' ? 'DATA_EXPORT' : 'BULK_IMPORT',
      tableName,
      details: {
        recordCount,
        ...details
      }
    });

    logger.security(`Bulk ${action.toLowerCase()}`, undefined, { tableName, recordCount, ...details });
  }
}

export const auditLogger = new AuditLogger();

// Helper functions for easy use in components
export const logStudentViewed = (studentId: string) => auditLogger.logStudentAccess('VIEWED', studentId);
export const logStudentCreated = (studentId: string, details?: Record<string, any>) => auditLogger.logStudentAccess('CREATED', studentId, details);
export const logStudentUpdated = (studentId: string, details?: Record<string, any>) => auditLogger.logStudentAccess('UPDATED', studentId, details);
export const logStudentDeleted = (studentId: string) => auditLogger.logStudentAccess('DELETED', studentId);

export const logTeacherViewed = (teacherId: string) => auditLogger.logTeacherAccess('VIEWED', teacherId);
export const logTeacherCreated = (teacherId: string, details?: Record<string, any>) => auditLogger.logTeacherAccess('CREATED', teacherId, details);
export const logTeacherUpdated = (teacherId: string, details?: Record<string, any>) => auditLogger.logTeacherAccess('UPDATED', teacherId, details);
export const logTeacherDeleted = (teacherId: string) => auditLogger.logTeacherAccess('DELETED', teacherId);

export const logUserLogin = (userId: string) => auditLogger.logAuth('LOGIN', userId);
export const logUserLogout = (userId: string) => auditLogger.logAuth('LOGOUT', userId);