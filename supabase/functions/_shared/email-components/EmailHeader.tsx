import { Heading } from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';
import { styles } from './styles.ts';

interface EmailHeaderProps {
  title: string;
}

export const EmailHeader = ({ title }: EmailHeaderProps) => (
  <div style={styles.logoContainer}>
    <Heading style={styles.h1}>{title}</Heading>
  </div>
);

export default EmailHeader;
