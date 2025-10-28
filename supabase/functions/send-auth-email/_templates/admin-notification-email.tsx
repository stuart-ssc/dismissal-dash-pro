import { Text, Heading, Link } from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';
import { EmailLayout } from '../_shared/EmailLayout.tsx';
import { brandColors } from '../_shared/styles.ts';

interface AdminNotificationEmailProps {
  schoolName: string;
  schoolId: number;
  schoolCity?: string;
  schoolState?: string;
  schoolDistrict?: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: string;
  userId: string;
  signupTime: string;
}

export const AdminNotificationEmail = ({
  schoolName,
  schoolId,
  schoolCity,
  schoolState,
  schoolDistrict,
  firstName,
  lastName,
  email,
  roles,
  userId,
  signupTime,
}: AdminNotificationEmailProps) => {
  const infoBoxStyle = {
    backgroundColor: '#EFF6FF',
    padding: '20px',
    borderRadius: '8px',
    margin: '20px 0',
  };

  const headingStyle = {
    marginTop: '0',
    color: brandColors.gray700,
    fontSize: '18px',
    fontWeight: '600',
  };

  const textStyle = {
    margin: '8px 0',
    color: brandColors.gray700,
    fontSize: '15px',
    lineHeight: '22px',
  };

  return (
    <EmailLayout preview={`🎉 New School Signup: ${schoolName}`}>
      <div style={{
        background: `linear-gradient(135deg, ${brandColors.navyDeep}, ${brandColors.blueBright})`,
        padding: '30px',
        textAlign: 'center' as const,
        borderRadius: '8px 8px 0 0',
        marginBottom: '30px',
      }}>
        <Heading style={{
          color: '#ffffff',
          fontSize: '28px',
          fontWeight: '600',
          margin: '0',
        }}>
          🎉 New School Signup
        </Heading>
      </div>

      <Text style={textStyle}>
        A new school has its first user signup!
      </Text>

      <div style={infoBoxStyle}>
        <Heading as="h3" style={headingStyle}>School Details</Heading>
        <Text style={textStyle}><strong>School Name:</strong> {schoolName || 'Not set'}</Text>
        <Text style={textStyle}><strong>School ID:</strong> {schoolId}</Text>
        <Text style={textStyle}><strong>Location:</strong> {schoolCity || 'Unknown'}, {schoolState || 'Unknown'}</Text>
        <Text style={textStyle}><strong>District:</strong> {schoolDistrict || 'Not set'}</Text>
      </div>

      <div style={{ ...infoBoxStyle, backgroundColor: '#F0FDF4' }}>
        <Heading as="h3" style={headingStyle}>User Details</Heading>
        <Text style={textStyle}><strong>Name:</strong> {firstName} {lastName}</Text>
        <Text style={textStyle}><strong>Email:</strong> {email}</Text>
        <Text style={textStyle}><strong>Role(s):</strong> {roles}</Text>
        <Text style={textStyle}><strong>User ID:</strong> {userId}</Text>
        <Text style={textStyle}><strong>Signup Time:</strong> {signupTime}</Text>
      </div>

      <div style={{ textAlign: 'center' as const, margin: '30px 0' }}>
        <Link
          href="https://lwbmtirzntexaxdlhgsk.supabase.co/project/lwbmtirzntexaxdlhgsk/auth/users"
          target="_blank"
          style={{
            backgroundColor: brandColors.blueBright,
            color: '#ffffff',
            padding: '12px 24px',
            textDecoration: 'none',
            borderRadius: '6px',
            display: 'inline-block',
            fontWeight: '600',
          }}
        >
          View in Supabase Admin
        </Link>
      </div>

      <Text style={{ ...textStyle, color: brandColors.gray500, fontSize: '14px', marginTop: '30px' }}>
        This notification was sent because this is the first user to sign up for this school.
      </Text>
    </EmailLayout>
  );
};

export default AdminNotificationEmail;
