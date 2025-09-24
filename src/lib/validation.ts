/**
 * Enhanced input validation schemas using Zod
 * Provides comprehensive validation for all user inputs
 */

import { z } from 'zod';

// Common validation patterns
const emailSchema = z.string()
  .email('Please enter a valid email address')
  .max(255, 'Email must be less than 255 characters')
  .trim();

const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password must be less than 128 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number');

const nameSchema = z.string()
  .trim()
  .min(1, 'This field is required')
  .max(100, 'Name must be less than 100 characters')
  .regex(/^[a-zA-Z\s\-'\.]+$/, 'Name can only contain letters, spaces, hyphens, apostrophes, and periods');

const phoneSchema = z.string()
  .trim()
  .min(10, 'Phone number must be at least 10 digits')
  .max(20, 'Phone number must be less than 20 characters')
  .regex(/^[\+]?[1-9][\d\s\-\(\)]{0,19}$/, 'Please enter a valid phone number');

// Authentication schemas
export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
});

export const signUpSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  schoolId: z.string().min(1, 'Please select a school'),
  role: z.enum(['school_admin', 'teacher'], { errorMap: () => ({ message: 'Please select a valid role' }) })
});

// Student schemas
export const studentSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  studentId: z.string()
    .trim()
    .max(50, 'Student ID must be less than 50 characters')
    .optional(),
  gradeLevel: z.string()
    .trim()
    .min(1, 'Grade level is required')
    .max(20, 'Grade level must be less than 20 characters'),
  parentGuardianName: nameSchema.optional(),
  contactInfo: z.string()
    .trim()
    .max(500, 'Contact info must be less than 500 characters')
    .optional(),
  specialNotes: z.string()
    .trim()
    .max(1000, 'Special notes must be less than 1000 characters')
    .optional(),
  dismissalGroup: z.string()
    .trim()
    .max(100, 'Dismissal group must be less than 100 characters')
    .optional()
});

// Teacher schemas
export const teacherSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema
});

// Class schemas
export const classSchema = z.object({
  className: z.string()
    .trim()
    .min(1, 'Class name is required')
    .max(100, 'Class name must be less than 100 characters'),
  gradeLevel: z.string()
    .trim()
    .max(20, 'Grade level must be less than 20 characters')
    .optional(),
  roomNumber: z.string()
    .trim()
    .max(20, 'Room number must be less than 20 characters')
    .optional()
});

// School settings schemas
export const schoolInfoSchema = z.object({
  schoolName: z.string()
    .trim()
    .min(1, 'School name is required')
    .max(200, 'School name must be less than 200 characters'),
  schoolDistrict: z.string()
    .trim()
    .max(200, 'District name must be less than 200 characters')
    .optional(),
  streetAddress: z.string()
    .trim()
    .max(200, 'Address must be less than 200 characters')
    .optional(),
  city: z.string()
    .trim()
    .max(100, 'City must be less than 100 characters')
    .optional(),
  state: z.string()
    .trim()
    .max(50, 'State must be less than 50 characters')
    .optional(),
  zipcode: z.string()
    .trim()
    .max(10, 'ZIP code must be less than 10 characters')
    .optional(),
  phoneNumber: phoneSchema.optional(),
  primaryColor: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Please enter a valid hex color code')
    .optional(),
  secondaryColor: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Please enter a valid hex color code')
    .optional()
});

export const dismissalSettingsSchema = z.object({
  dismissalTime: z.string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time (HH:MM)')
    .optional(),
  preparationTimeMinutes: z.number()
    .min(1, 'Preparation time must be at least 1 minute')
    .max(60, 'Preparation time must be less than 60 minutes')
    .optional(),
  timezone: z.string()
    .min(1, 'Timezone is required')
    .optional(),
  autoDismissalEnabled: z.boolean().optional(),
  busesEnabled: z.boolean().optional(),
  carLinesEnabled: z.boolean().optional(),
  walkersEnabled: z.boolean().optional(),
  afterSchoolActivitiesEnabled: z.boolean().optional()
});

export const notificationSettingsSchema = z.object({
  emailNotificationsEnabled: z.boolean(),
  smsNotificationsEnabled: z.boolean(),
  parentNotificationsEnabled: z.boolean(),
  emergencyAlertsEnabled: z.boolean()
});

export const securitySettingsSchema = z.object({
  twoFactorRequired: z.boolean(),
  sessionTimeoutEnabled: z.boolean(),
  auditLogsEnabled: z.boolean()
});

// Transportation schemas
export const busSchema = z.object({
  busNumber: z.string()
    .trim()
    .min(1, 'Bus number is required')
    .max(20, 'Bus number must be less than 20 characters'),
  driverFirstName: nameSchema,
  driverLastName: nameSchema
});

export const carLineSchema = z.object({
  lineName: z.string()
    .trim()
    .min(1, 'Line name is required')
    .max(100, 'Line name must be less than 100 characters'),
  color: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Please select a valid color'),
  pickupLocation: z.string()
    .trim()
    .min(1, 'Pickup location is required')
    .max(200, 'Pickup location must be less than 200 characters')
});

export const walkerLocationSchema = z.object({
  locationName: z.string()
    .trim()
    .min(1, 'Location name is required')
    .max(100, 'Location name must be less than 100 characters'),
  isDefault: z.boolean().optional()
});

export const afterSchoolActivitySchema = z.object({
  activityName: z.string()
    .trim()
    .min(1, 'Activity name is required')
    .max(100, 'Activity name must be less than 100 characters'),
  description: z.string()
    .trim()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  supervisorName: nameSchema.optional(),
  location: z.string()
    .trim()
    .max(100, 'Location must be less than 100 characters')
    .optional(),
  capacity: z.number()
    .min(1, 'Capacity must be at least 1')
    .max(1000, 'Capacity must be less than 1000')
    .optional()
});

// Dismissal plan schemas
export const dismissalPlanSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Plan name is required')
    .max(100, 'Plan name must be less than 100 characters'),
  description: z.string()
    .trim()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  dismissalTime: z.string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time (HH:MM)')
    .optional(),
  startDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Please enter a valid date (YYYY-MM-DD)')
    .optional(),
  endDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Please enter a valid date (YYYY-MM-DD)')
    .optional(),
  isDefault: z.boolean().optional()
});

// URL validation for external links
export const urlSchema = z.string()
  .url('Please enter a valid URL')
  .max(2000, 'URL must be less than 2000 characters');

// File upload validation
export const fileSchema = z.object({
  name: z.string().min(1, 'File name is required'),
  size: z.number().max(5 * 1024 * 1024, 'File size must be less than 5MB'),
  type: z.string().refine(
    (type) => ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(type),
    'File must be a valid image (JPEG, PNG, GIF, or WebP)'
  )
});

// Export type inference helpers
export type SignInFormData = z.infer<typeof signInSchema>;
export type SignUpFormData = z.infer<typeof signUpSchema>;
export type StudentFormData = z.infer<typeof studentSchema>;
export type TeacherFormData = z.infer<typeof teacherSchema>;
export type ClassFormData = z.infer<typeof classSchema>;
export type SchoolInfoFormData = z.infer<typeof schoolInfoSchema>;
export type DismissalSettingsFormData = z.infer<typeof dismissalSettingsSchema>;
export type NotificationSettingsFormData = z.infer<typeof notificationSettingsSchema>;
export type SecuritySettingsFormData = z.infer<typeof securitySettingsSchema>;
export type BusFormData = z.infer<typeof busSchema>;
export type CarLineFormData = z.infer<typeof carLineSchema>;
export type WalkerLocationFormData = z.infer<typeof walkerLocationSchema>;
export type AfterSchoolActivityFormData = z.infer<typeof afterSchoolActivitySchema>;
export type DismissalPlanFormData = z.infer<typeof dismissalPlanSchema>;