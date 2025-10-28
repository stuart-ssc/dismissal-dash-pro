import { Text } from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';
import { EmailLayout } from '../email-components/EmailLayout.tsx';
import { EmailHeader } from '../email-components/EmailHeader.tsx';
import { EmailFooter } from '../email-components/EmailFooter.tsx';
import { EmailButton } from '../email-components/EmailButton.tsx';
import { CodeBlock } from '../email-components/CodeBlock.tsx';
import { styles } from '../email-components/styles.ts';

interface ConfirmationEmailProps {
  supabaseUrl: string;
  emailActionType: string;
  redirectTo: string;
  tokenHash: string;
  token: string;
}

export const ConfirmationEmail = ({
  token,
  supabaseUrl,
  emailActionType,
  redirectTo,
  tokenHash,
}: ConfirmationEmailProps) => (
  <EmailLayout preview="Welcome to Dismissal Pro - Confirm your email to get started">
    <EmailHeader title="Welcome to Dismissal Pro!" showLogo={true} logoVariant="full" />
    
    <Text style={styles.text}>
      Thank you for signing up! We're excited to help you streamline your school's dismissal process.
    </Text>
    
    <Text style={styles.text}>
      To complete your registration and access your account, please confirm your email address by clicking the button below:
    </Text>
    
    <EmailButton href={`${supabaseUrl}/auth/v1/verify?token=${tokenHash}&type=${emailActionType}&redirect_to=${redirectTo}`}>
      Confirm Email Address
    </EmailButton>
    
    <Text style={styles.text}>
      Or copy and paste this confirmation code:
    </Text>
    <CodeBlock>{token}</CodeBlock>
    
    <Text style={styles.footerText}>
      This link will expire in 24 hours. If you didn't create an account with Dismissal Pro, you can safely ignore this email.
    </Text>
    
    <EmailFooter />
  </EmailLayout>
);

export default ConfirmationEmail;
