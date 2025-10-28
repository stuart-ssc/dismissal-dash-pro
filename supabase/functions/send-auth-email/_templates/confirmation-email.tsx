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
  <Html>
    <Head>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap');
      `}</style>
    </Head>
    <Preview>Welcome to Dismissal Pro - Confirm your email to get started</Preview>
    <Body style={main}>
      <Container style={container}>
        <div style={logoContainer}>
          <Heading style={h1}>Welcome to Dismissal Pro!</Heading>
        </div>
        
        <Text style={text}>
          Thank you for signing up! We're excited to help you streamline your school's dismissal process.
        </Text>
        
        <Text style={text}>
          To complete your registration and access your account, please confirm your email address by clicking the button below:
        </Text>
        
        <Link
          href={`${supabaseUrl}/auth/v1/verify?token=${tokenHash}&type=${emailActionType}&redirect_to=${redirectTo}`}
          target="_blank"
          style={button}
        >
          Confirm Email Address
        </Link>
        
        <Text style={text}>
          Or copy and paste this confirmation code:
        </Text>
        <code style={code}>{token}</code>
        
        <Text style={footerText}>
          This link will expire in 24 hours. If you didn't create an account with Dismissal Pro, you can safely ignore this email.
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

export default ConfirmationEmail;

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
  background: 'linear-gradient(135deg, #011576 0%, #0184F7 100%)',
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
  fontFamily: "'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 20px',
  fontFamily: "'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const button = {
  backgroundColor: '#011576',
  borderRadius: '6px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '16px',
  fontWeight: '600',
  padding: '14px 40px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  margin: '20px 0',
  fontFamily: "'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
  fontFamily: "'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const footer = {
  color: '#6B7280',
  fontSize: '14px',
  lineHeight: '20px',
  marginTop: '30px',
  paddingTop: '20px',
  borderTop: '1px solid #E5E7EB',
  fontFamily: "'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};
