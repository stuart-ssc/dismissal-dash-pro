import { Link } from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';
import { styles } from './styles.ts';

interface EmailButtonProps {
  href: string;
  children: React.ReactNode;
  backgroundColor?: string;
  gradient?: string;
}

export const EmailButton = ({ href, children, backgroundColor, gradient }: EmailButtonProps) => {
  const buttonStyle = {
    ...styles.button,
    ...(gradient ? { background: gradient } : {}),
    ...(backgroundColor && !gradient ? { backgroundColor } : {}),
  };

  return (
    <Link
      href={href}
      target="_blank"
      style={buttonStyle}
    >
      {children}
    </Link>
  );
};

export default EmailButton;
