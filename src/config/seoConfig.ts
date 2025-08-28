export interface SEOConfig {
  title: string;
  description: string;
  keywords: string;
  robots?: string;
}

export const seoConfig: Record<string, SEOConfig> = {
  // Dashboard Pages (all should be noindex)
  '/dashboard': {
    title: 'Dashboard',
    description: 'Manage your school dismissals efficiently with Dismissal Pro dashboard. View real-time dismissal data, students count, and performance analytics.',
    keywords: 'school dismissal, dashboard, student management, real-time analytics, dismissal tracking',
    robots: 'noindex, nofollow'
  },
  '/dashboard/people': {
    title: 'People Management',
    description: 'Manage students, teachers, and staff with Dismissal Pro\'s comprehensive people management system. Add, edit, and organize all school personnel and students efficiently.',
    keywords: 'people management, student management, teacher management, staff administration, school personnel, user management',
    robots: 'noindex, nofollow'
  },
  '/dashboard/classes': {
    title: 'Classes',
    description: 'Organize and manage your school classes with Dismissal Pro. View class rosters, assign teachers, and streamline classroom dismissal processes.',
    keywords: 'class management, classroom organization, teacher assignments, student rosters, school classes',
    robots: 'noindex, nofollow'
  },
  '/dashboard/transportation': {
    title: 'Transportation',
    description: 'Manage school transportation including buses, car lines, and walker locations. Organize efficient dismissal routes and track student transportation assignments.',
    keywords: 'school transportation, bus management, car lines, walker locations, student transportation, dismissal routes',
    robots: 'noindex, nofollow'
  },
  '/dashboard/dismissals': {
    title: 'Dismissals',
    description: 'Monitor and manage school dismissal runs. Track dismissal progress, view completion status, and analyze dismissal performance metrics.',
    keywords: 'school dismissal, dismissal runs, dismissal tracking, dismissal analytics, student pickup',
    robots: 'noindex, nofollow'
  },
  '/dashboard/dismissal-plans': {
    title: 'Dismissal Plans',
    description: 'Create and manage dismissal plans for your school. Schedule dismissals, set timing preferences, and organize dismissal procedures.',
    keywords: 'dismissal plans, dismissal scheduling, school dismissal timing, dismissal procedures, dismissal organization',
    robots: 'noindex, nofollow'
  },
  '/dashboard/settings': {
    title: 'Settings',
    description: 'Configure your school\'s dismissal system preferences. Customize notifications, security settings, and dismissal parameters.',
    keywords: 'school settings, dismissal configuration, notification settings, security preferences, system configuration',
    robots: 'noindex, nofollow'
  },
  '/dashboard/car-lines': {
    title: 'Car Lines',
    description: 'Manage car line pickup locations and assignments. Organize efficient car line dismissal processes and track student car line assignments.',
    keywords: 'car lines, car pickup, parent pickup, car line management, student car assignments',
    robots: 'noindex, nofollow'
  },
  '/dashboard/walker-locations': {
    title: 'Walker Locations',
    description: 'Manage walker dismissal locations and organize safe walking routes. Track student walker assignments and dismissal locations.',
    keywords: 'walker locations, walking dismissal, student walkers, safe routes, walker management',
    robots: 'noindex, nofollow'
  },
  '/dashboard/import': {
    title: 'Import Data',
    description: 'Import student and staff data into Dismissal Pro. Bulk upload rosters, transportation assignments, and school information.',
    keywords: 'data import, bulk upload, student roster import, staff import, school data management',
    robots: 'noindex, nofollow'
  },

  // Dismissal Mode Pages (all should be noindex)
  '/dashboard/dismissal/classroom': {
    title: 'Classroom Mode',
    description: 'Manage classroom-based dismissal process. Release students by classroom and track dismissal progress in real-time.',
    keywords: 'classroom dismissal, classroom mode, student release, classroom management, dismissal process',
    robots: 'noindex, nofollow'
  },
  '/dashboard/dismissal/bus': {
    title: 'Bus Mode',
    description: 'Manage bus dismissal operations. Call buses, track student boarding, and ensure efficient bus dismissal procedures.',
    keywords: 'bus dismissal, bus mode, student transportation, bus operations, bus tracking',
    robots: 'noindex, nofollow'
  },
  '/dashboard/dismissal/car-line': {
    title: 'Car Line Mode',
    description: 'Manage car line dismissal operations. Organize parent pickup, track car line progress, and ensure smooth car line dismissal.',
    keywords: 'car line dismissal, parent pickup, car line operations, pickup management, car line tracking',
    robots: 'noindex, nofollow'
  },
  '/dashboard/dismissal/walker': {
    title: 'Walker Mode',
    description: 'Manage walker dismissal operations. Release walkers by location and ensure safe walker dismissal procedures.',
    keywords: 'walker dismissal, walker mode, walking dismissal, walker safety, walker management',
    robots: 'noindex, nofollow'
  },

  // Admin Pages
  '/admin': {
    title: 'System Administration',
    description: 'System administration dashboard for Dismissal Pro. Manage schools, users, and system-wide settings.',
    keywords: 'system administration, admin dashboard, school management, user administration, system settings',
    robots: 'noindex, nofollow'
  },
  '/admin/schools': {
    title: 'Schools Management',
    description: 'Manage schools in the Dismissal Pro system. Add, edit, and configure school settings and preferences.',
    keywords: 'school management, school administration, school configuration, multi-school management',
    robots: 'noindex, nofollow'
  },
  '/admin/users': {
    title: 'User Management',
    description: 'Manage users across all schools in Dismissal Pro. Create, edit, and assign user roles and permissions.',
    keywords: 'user management, user administration, role management, user permissions, system users',
    robots: 'noindex, nofollow'
  },
  '/admin/dismissal-groups': {
    title: 'Dismissal Groups',
    description: 'Configure dismissal groups and categories for efficient student organization and dismissal management.',
    keywords: 'dismissal groups, student groups, dismissal categories, group management, student organization',
    robots: 'noindex, nofollow'
  },
  '/admin/settings': {
    title: 'System Settings',
    description: 'Configure system-wide settings for Dismissal Pro. Manage global preferences and system parameters.',
    keywords: 'system settings, global settings, system configuration, admin settings, system preferences',
    robots: 'noindex, nofollow'
  },

  // Public Pages
  '/': {
    title: 'School Dismissal Management System',
    description: 'Streamline your school\'s dismissal process with Dismissal Pro. Efficient student pickup management, real-time tracking, and seamless coordination.',
    keywords: 'school dismissal, student pickup, dismissal management, school safety, parent coordination, student transportation'
  },
  '/auth': {
    title: 'Sign In',
    description: 'Sign in to Dismissal Pro to access your school\'s dismissal management system. Secure authentication for teachers and administrators.',
    keywords: 'sign in, login, authentication, school access, dismissal pro login'
  }
};

export function getSEOConfig(pathname: string): SEOConfig | null {
  return seoConfig[pathname] || null;
}