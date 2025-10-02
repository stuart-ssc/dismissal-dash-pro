import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

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
  <Html>
    <Head />
    <Preview>Your secure sign-in link for Dismissal Pro</Preview>
    <Body style={main}>
      <Container style={container}>
        <div style={logoContainer}>
          <Heading style={h1}>Sign In to Dismissal Pro</Heading>
        </div>
        
        <Text style={text}>
          Click the button below to securely sign in to your Dismissal Pro account:
        </Text>
        
        <Link
          href={`${supabaseUrl}/auth/v1/verify?token=${tokenHash}&type=${emailActionType}&redirect_to=${redirectTo}`}
          target="_blank"
          style={button}
        >
          Sign In to Dismissal Pro
        </Link>
        
        <Text style={text}>
          Or use this one-time code:
        </Text>
        <code style={code}>{token}</code>
        
        <Text style={footerText}>
          This link will expire in 1 hour. If you didn't request this sign-in link, please ignore this email or contact your school administrator if you're concerned about your account security.
        </Text>
        
        <Text style={footer}>
          Best regards,
          <br />
          The Dismissal Pro Team
        </Text>
      </Container>
    </Body>
  </Html>
);

export default MagicLinkEmail;

const main = {
  backgroundColor: '#f3f4f6',
  padding: '40px 20px',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px',
  borderRadius: '8px',
  maxWidth: '600px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
};

const logoContainer = {
  background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
  padding: '30px',
  textAlign: 'center' as const,
  borderRadius: '8px 8px 0 0',
  marginBottom: '30px',
};

const h1 = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: '600',
  margin: '0',
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 20px',
};

const button = {
  backgroundColor: '#3B82F6',
  borderRadius: '6px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '16px',
  fontWeight: '600',
  padding: '14px 40px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  margin: '20px 0',
};

const code = {
  display: 'inline-block',
  padding: '16px',
  width: '100%',
  backgroundColor: '#f4f4f4',
  borderRadius: '5px',
  border: '1px solid #eee',
  color: '#333',
  fontSize: '18px',
  textAlign: 'center' as const,
  fontFamily: 'monospace',
  margin: '10px 0 20px',
};

const footerText = {
  color: '#6B7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '20px 0',
};

const footer = {
  color: '#6B7280',
  fontSize: '14px',
  lineHeight: '20px',
  marginTop: '30px',
  paddingTop: '20px',
  borderTop: '1px solid #E5E7EB',
};
