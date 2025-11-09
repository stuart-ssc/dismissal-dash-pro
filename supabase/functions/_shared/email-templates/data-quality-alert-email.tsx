import { Text, Section, Hr, Heading } from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';
import { EmailLayout } from '../email-components/EmailLayout.tsx';
import { EmailHeader } from '../email-components/EmailHeader.tsx';
import { EmailButton } from '../email-components/EmailButton.tsx';
import { EmailFooter } from '../email-components/EmailFooter.tsx';
import { styles, brandColors } from '../email-components/styles.ts';

interface Issue {
  category: string;
  metric: string;
  actual_value: number;
  threshold: number;
  severity: 'warning' | 'critical';
}

interface DataQualityAlertEmailProps {
  schoolName: string;
  alertType: 'threshold_breach' | 'weekly_summary';
  severity: 'info' | 'warning' | 'critical';
  currentScore: number;
  currentGrade: string;
  issues: Issue[];
  previousScore?: number;
  weekStartDate?: string;
  weekEndDate?: string;
  appUrl: string;
}

export const DataQualityAlertEmail = ({
  schoolName,
  alertType,
  severity,
  currentScore,
  currentGrade,
  issues,
  previousScore,
  weekStartDate,
  weekEndDate,
  appUrl,
}: DataQualityAlertEmailProps) => {
  const isWeeklySummary = alertType === 'weekly_summary';
  const scoreChange = previousScore ? currentScore - previousScore : null;
  
  const severityColors = {
    info: brandColors.info,
    warning: '#f59e0b',
    critical: brandColors.danger,
  };
  
  const gradeColors = {
    'A': brandColors.success,
    'B': brandColors.info,
    'C': '#f59e0b',
    'D': '#f97316',
    'F': brandColors.danger,
  };

  return (
    <EmailLayout preview={`Data Quality ${isWeeklySummary ? 'Weekly Summary' : 'Alert'} for ${schoolName}`}>
      <EmailHeader 
        title={isWeeklySummary ? '📊 Weekly Data Quality Summary' : '⚠️ Data Quality Alert'}
        logoVariant="mark"
      />
      
      <Text style={styles.text}>
        {isWeeklySummary ? (
          <>Your weekly data quality summary for <strong>{schoolName}</strong> ({weekStartDate} - {weekEndDate}).</>
        ) : (
          <>Data quality for <strong>{schoolName}</strong> has dropped below your configured threshold.</>
        )}
      </Text>

      {/* Current Score Card */}
      <Section style={{
        backgroundColor: '#f9fafb',
        border: `2px solid ${severityColors[severity]}`,
        borderRadius: '12px',
        padding: '24px',
        marginTop: '20px',
        marginBottom: '20px',
        textAlign: 'center',
      }}>
        <Text style={{
          fontSize: '14px',
          color: brandColors.textSecondary,
          margin: '0 0 8px 0',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          Current Data Quality
        </Text>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
          <Text style={{
            fontSize: '48px',
            fontWeight: '700',
            color: gradeColors[currentGrade as keyof typeof gradeColors] || brandColors.text,
            margin: '0',
            lineHeight: '1',
          }}>
            {currentGrade}
          </Text>
          
          <div style={{ textAlign: 'left' }}>
            <Text style={{
              fontSize: '32px',
              fontWeight: '600',
              color: brandColors.text,
              margin: '0',
              lineHeight: '1.2',
            }}>
              {currentScore.toFixed(1)}%
            </Text>
            
            {scoreChange !== null && (
              <Text style={{
                fontSize: '14px',
                color: scoreChange >= 0 ? brandColors.success : brandColors.danger,
                margin: '4px 0 0 0',
                fontWeight: '600',
              }}>
                {scoreChange >= 0 ? '↑' : '↓'} {Math.abs(scoreChange).toFixed(1)}% from last week
              </Text>
            )}
          </div>
        </div>
      </Section>

      {/* Issues Detected */}
      {issues.length > 0 && (
        <>
          <Heading style={{ ...styles.h2, marginTop: '24px', marginBottom: '16px' }}>
            {isWeeklySummary ? 'Areas Needing Attention' : 'Issues Detected'}
          </Heading>
          
          {issues.map((issue, index) => (
            <Section key={index} style={{
              backgroundColor: issue.severity === 'critical' ? '#fef2f2' : '#fffbeb',
              border: `1px solid ${issue.severity === 'critical' ? brandColors.danger : '#f59e0b'}`,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '12px',
            }}>
              <table style={{ width: '100%' }}>
                <tbody>
                  <tr>
                    <td style={{ paddingBottom: '8px' }}>
                      <Text style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: brandColors.text,
                        margin: '0',
                      }}>
                        {issue.category}: {issue.metric}
                      </Text>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <Text style={{
                        fontSize: '13px',
                        color: brandColors.textSecondary,
                        margin: '0',
                      }}>
                        Current: <strong style={{ color: brandColors.text }}>{issue.actual_value.toFixed(1)}%</strong>
                        {' '} | Target: <strong style={{ color: brandColors.text }}>{issue.threshold.toFixed(1)}%</strong>
                      </Text>
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>
          ))}
        </>
      )}

      {/* Action Button */}
      <EmailButton 
        href={`${appUrl}/dashboard/integrations/ic-data-quality`}
        gradient={`linear-gradient(135deg, ${brandColors.primary} 0%, ${brandColors.primaryDark} 100%)`}
      >
        View Detailed Data Quality Report
      </EmailButton>

      <Hr style={{ borderColor: brandColors.border, margin: '24px 0' }} />

      <Text style={{...styles.text, fontSize: '13px', color: brandColors.textSecondary }}>
        {isWeeklySummary ? (
          <>This is your automated weekly data quality summary. You can adjust notification preferences in your dashboard settings.</>
        ) : (
          <>This alert was triggered because your data quality score fell below your configured threshold. Take action to improve data completeness and prevent issues during dismissal operations.</>
        )}
      </Text>

      <EmailFooter customText="Dismissal Pro - Automated Data Quality Monitoring" />
    </EmailLayout>
  );
};

export default DataQualityAlertEmail;
