import { Text } from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';
import { EmailLayout } from '../email-components/EmailLayout.tsx';
import { EmailHeader } from '../email-components/EmailHeader.tsx';
import { EmailFooter } from '../email-components/EmailFooter.tsx';
import { EmailButton } from '../email-components/EmailButton.tsx';
import { CodeBlock } from '../email-components/CodeBlock.tsx';
import { styles } from '../email-components/styles.ts';

interface MagicLinkEmailProps {
  supabaseUrl: string;
  emailActionType: string;
  redirectTo: string;
  tokenHash: string;
  token: string;
}

export const MagicLinkEmail = ({
  token,
  supabaseUrl,
  emailActionType,
  redirectTo,
  tokenHash,
}: MagicLinkEmailProps) => (
  <EmailLayout preview="Your secure sign-in link for Dismissal Pro">
    <EmailHeader title="Sign In to Dismissal Pro" />
    
    <Text style={styles.text}>
      Click the button below to securely sign in to your Dismissal Pro account:
    </Text>
    
    <EmailButton href={`${supabaseUrl}/auth/v1/verify?token=${tokenHash}&type=${emailActionType}&redirect_to=${redirectTo}`}>
      Sign In to Dismissal Pro
    </EmailButton>
    
    <Text style={styles.text}>
      Or use this one-time code:
    </Text>
    <CodeBlock>{token}</CodeBlock>
    
    <Text style={styles.footerText}>
      This link will expire in 1 hour. If you didn't request this sign-in link, please ignore this email or contact your school administrator if you're concerned about your account security.
    </Text>
    
    <EmailFooter />
  </EmailLayout>
);

export default MagicLinkEmail;
