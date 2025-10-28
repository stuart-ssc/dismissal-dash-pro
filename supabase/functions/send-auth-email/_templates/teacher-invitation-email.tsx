import { Text } from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';
import { EmailLayout } from '../_shared/EmailLayout.tsx';
import { EmailHeader } from '../_shared/EmailHeader.tsx';
import { EmailFooter } from '../_shared/EmailFooter.tsx';
import { EmailButton } from '../_shared/EmailButton.tsx';
import { styles, brandColors } from '../_shared/styles.ts';

interface TeacherInvitationEmailProps {
  firstName: string;
  lastName: string;
  schoolName: string;
  inviteUrl: string;
  schoolPrimaryColor?: string;
  schoolSecondaryColor?: string;
}

export const TeacherInvitationEmail = ({
  firstName,
  lastName,
  schoolName,
  inviteUrl,
  schoolPrimaryColor,
  schoolSecondaryColor,
}: TeacherInvitationEmailProps) => {
  const gradient = schoolPrimaryColor && schoolSecondaryColor 
    ? `linear-gradient(135deg, ${schoolPrimaryColor}, ${schoolSecondaryColor})`
    : undefined;

  return (
    <EmailLayout preview={`Welcome to ${schoolName} - Complete your teacher account setup`}>
      <EmailHeader title={`Welcome to ${schoolName}!`} />
      
      <Text style={styles.text}>
        Dear {firstName} {lastName},
      </Text>
      
      <Text style={styles.text}>
        You have been invited to join <strong>{schoolName}</strong> as a teacher on Dismissal Pro, 
        our school dismissal management platform.
      </Text>
      
      <Text style={styles.text}>
        To complete your account setup and start managing your classes, please click the button below:
      </Text>
      
      <EmailButton href={inviteUrl} gradient={gradient}>
        Complete Account Setup
      </EmailButton>
      
      <div style={{
        backgroundColor: brandColors.gray50,
        padding: '15px',
        borderRadius: '6px',
        margin: '20px 0',
      }}>
        <Text style={{ ...styles.text, margin: 0, fontSize: '14px', color: brandColors.gray700 }}>
          <strong>⏰ This invitation expires in 24 hours</strong> for security purposes.
        </Text>
      </div>
      
      <Text style={styles.text}>
        Once you complete your setup, you'll be able to:
      </Text>
      
      <ul style={{ color: brandColors.gray700, fontSize: '16px', lineHeight: '24px', margin: '0 0 20px', fontFamily: styles.text.fontFamily }}>
        <li>Manage your class rosters</li>
        <li>Monitor student dismissal</li>
        <li>Access dismissal modes and reports</li>
      </ul>
      
      <Text style={styles.text}>
        If you have any questions, please contact your school administrator.
      </Text>
      
      <EmailFooter customText={`Best regards,\nThe ${schoolName} Team`} />
      
      <Text style={styles.footerText}>
        If you didn't expect this invitation, you can safely ignore this email.
        This invitation will expire automatically in 24 hours.
      </Text>
    </EmailLayout>
  );
};

export default TeacherInvitationEmail;
