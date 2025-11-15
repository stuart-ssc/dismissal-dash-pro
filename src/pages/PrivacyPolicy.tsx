import { Card, CardContent } from "@/components/ui/card";
import { Mail, MapPin } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useSEO } from "@/hooks/useSEO";

const PrivacyPolicy = () => {
  const SEO = useSEO();
  const lastUpdated = "November 15, 2024";

  return (
    <>
      <SEO />
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10">
        <Navbar />
        
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <Card className="border-0 shadow-elevated">
            <CardContent className="p-8 md:p-12">
              <div className="prose prose-slate max-w-none">
                <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
                <p className="text-muted-foreground mb-8">Last Updated: {lastUpdated}</p>

                {/* Introduction */}
                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Introduction</h2>
                  <p className="text-foreground leading-relaxed mb-4">
                    DismissalPro, Inc. ("DismissalPro," "we," "our," or "us") is committed to protecting the privacy and security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our school dismissal management platform (the "Service").
                  </p>
                  <p className="text-foreground leading-relaxed">
                    This policy applies to information collected through our website, mobile applications, and any related services. By using DismissalPro, you agree to the collection and use of information in accordance with this policy.
                  </p>
                </section>

                {/* Information We Collect */}
                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Information We Collect</h2>
                  
                  <h3 className="text-xl font-semibold mb-3 mt-6">Account Information</h3>
                  <p className="text-foreground leading-relaxed mb-4">
                    When you create an account, we collect:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-foreground mb-4">
                    <li>Name (first and last)</li>
                    <li>Email address</li>
                    <li>School affiliation</li>
                    <li>Role/position at the school</li>
                    <li>Account credentials (encrypted)</li>
                  </ul>

                  <h3 className="text-xl font-semibold mb-3 mt-6">Student Information</h3>
                  <p className="text-foreground leading-relaxed mb-4">
                    DismissalPro only collects student information from authorized school administrators. We do not collect information directly from students under 18 years of age. Information may include:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-foreground mb-4">
                    <li>Student names</li>
                    <li>Grade levels</li>
                    <li>Classroom assignments</li>
                    <li>Transportation methods (bus, car rider, walker)</li>
                    <li>Parent/guardian contact information</li>
                    <li>Emergency contact details</li>
                    <li>Special transportation needs</li>
                  </ul>

                  <h3 className="text-xl font-semibold mb-3 mt-6">Usage Data</h3>
                  <p className="text-foreground leading-relaxed mb-4">
                    We automatically collect certain information when you use our Service:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-foreground mb-4">
                    <li>Log data (IP address, browser type, device information)</li>
                    <li>Usage patterns and feature interactions</li>
                    <li>Session duration and timestamps</li>
                    <li>Dismissal run data and timing</li>
                  </ul>

                  <h3 className="text-xl font-semibold mb-3 mt-6">Cookies and Tracking Technologies</h3>
                  <p className="text-foreground leading-relaxed">
                    We use cookies and similar tracking technologies to track activity on our Service and hold certain information. Cookies are files with small amounts of data which may include an anonymous unique identifier. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
                  </p>
                </section>

                {/* How We Use Information */}
                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">How We Use Your Information</h2>
                  <p className="text-foreground leading-relaxed mb-4">
                    We use the collected information for various purposes:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-foreground">
                    <li>To provide and maintain our dismissal management Service</li>
                    <li>To manage school dismissal processes and student transportation</li>
                    <li>To notify you about changes to our Service</li>
                    <li>To provide customer support and respond to inquiries</li>
                    <li>To monitor usage and improve our Service</li>
                    <li>To detect, prevent, and address technical issues</li>
                    <li>To send administrative information and updates</li>
                    <li>To comply with legal obligations and ensure student safety</li>
                  </ul>
                </section>

                {/* Data Sharing and Third Parties */}
                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Data Sharing and Third Parties</h2>
                  
                  <h3 className="text-xl font-semibold mb-3 mt-6">No Selling of Data</h3>
                  <p className="text-foreground leading-relaxed mb-4">
                    We do not sell, trade, or rent your personal information or student data to third parties.
                  </p>

                  <h3 className="text-xl font-semibold mb-3 mt-6">Service Providers</h3>
                  <p className="text-foreground leading-relaxed mb-4">
                    We may share information with trusted third-party service providers who assist us in operating our platform:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-foreground mb-4">
                    <li><strong>Supabase:</strong> Cloud hosting and database services (data stored on US-based servers)</li>
                    <li><strong>Infrastructure providers:</strong> For secure data storage and service delivery</li>
                  </ul>

                  <h3 className="text-xl font-semibold mb-3 mt-6">Infinite Campus Integration</h3>
                  <p className="text-foreground leading-relaxed mb-4">
                    If your school uses Infinite Campus integration, we access student data through read-only API connections. We do not modify or write data back to Infinite Campus. This integration allows automatic synchronization of student rosters and class information.
                  </p>

                  <h3 className="text-xl font-semibold mb-3 mt-6">Legal Requirements</h3>
                  <p className="text-foreground leading-relaxed">
                    We may disclose your information if required to do so by law or in response to valid requests by public authorities (e.g., a court or government agency).
                  </p>
                </section>

                {/* Data Security */}
                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Data Security</h2>
                  <p className="text-foreground leading-relaxed mb-4">
                    The security of your data is important to us. We implement industry-standard security measures:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-foreground mb-4">
                    <li>End-to-end encryption for data transmission</li>
                    <li>Secure, encrypted data storage</li>
                    <li>Access controls and authentication requirements</li>
                    <li>Regular security audits and updates</li>
                    <li>Employee training on data protection</li>
                  </ul>
                  <p className="text-foreground leading-relaxed">
                    However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your information, we cannot guarantee its absolute security.
                  </p>
                </section>

                {/* Data Retention */}
                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Data Retention</h2>
                  <p className="text-foreground leading-relaxed mb-4">
                    We retain your information for as long as necessary to provide our Service and fulfill the purposes outlined in this Privacy Policy:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-foreground mb-4">
                    <li><strong>Active Accounts:</strong> Data is retained for the duration of your active subscription</li>
                    <li><strong>After Cancellation:</strong> Data is retained for 60 days after subscription cancellation, then permanently deleted</li>
                    <li><strong>Unpaid Accounts:</strong> Data is retained for 90 days from signup (30 days after payment due date), then permanently deleted</li>
                    <li><strong>Legal Requirements:</strong> We may retain certain information when required by law or for legitimate business purposes</li>
                  </ul>
                  <p className="text-foreground leading-relaxed">
                    Upon deletion, data is permanently removed from our systems and cannot be recovered.
                  </p>
                </section>

                {/* FERPA Compliance */}
                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">FERPA Compliance</h2>
                  <p className="text-foreground leading-relaxed mb-4">
                    DismissalPro is designed to comply with the Family Educational Rights and Privacy Act (FERPA), 20 U.S.C. § 1232g. Schools maintain ownership and control of all student education records.
                  </p>
                  
                  <h3 className="text-xl font-semibold mb-3 mt-6">School Official Status</h3>
                  <p className="text-foreground leading-relaxed mb-4">
                    DismissalPro acts as a "school official" with legitimate educational interests in student information necessary to provide dismissal management services. We use student data solely for the purpose of providing our Service to schools.
                  </p>

                  <h3 className="text-xl font-semibold mb-3 mt-6">Parent Rights</h3>
                  <p className="text-foreground leading-relaxed">
                    Parents and eligible students have the right to inspect and review student education records maintained by the school. Requests to access, correct, or delete student information should be directed to your school administrator.
                  </p>
                </section>

                {/* Children's Privacy */}
                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Children's Privacy</h2>
                  <p className="text-foreground leading-relaxed mb-4">
                    Our Service is designed for use by authorized school staff members who are 18 years of age or older. We do not knowingly collect personal information directly from children under 18.
                  </p>
                  <p className="text-foreground leading-relaxed mb-4">
                    Student information is collected solely through authorized school administrators acting on behalf of the educational institution. Schools are responsible for obtaining any necessary parental consent and providing required notices under applicable laws, including COPPA (Children's Online Privacy Protection Act).
                  </p>
                  <p className="text-foreground leading-relaxed">
                    If you are a parent or guardian and believe your child's information has been collected inappropriately, please contact us immediately at legal@dismissalpro.io.
                  </p>
                </section>

                {/* Your Rights */}
                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Your Rights and Choices</h2>
                  <p className="text-foreground leading-relaxed mb-4">
                    You have certain rights regarding your personal information:
                  </p>
                  
                  <h3 className="text-xl font-semibold mb-3 mt-6">Access and Correction</h3>
                  <p className="text-foreground leading-relaxed mb-4">
                    You may access and update your account information at any time through your account settings. For student information, contact your school administrator.
                  </p>

                  <h3 className="text-xl font-semibold mb-3 mt-6">Data Deletion</h3>
                  <p className="text-foreground leading-relaxed mb-4">
                    You may request deletion of your account and associated data by contacting us at legal@dismissalpro.io. We will process deletion requests in accordance with our data retention policy.
                  </p>

                  <h3 className="text-xl font-semibold mb-3 mt-6">Data Portability</h3>
                  <p className="text-foreground leading-relaxed mb-4">
                    Upon request, we can provide your data in a commonly used, machine-readable format.
                  </p>

                  <h3 className="text-xl font-semibold mb-3 mt-6">Opt-Out of Communications</h3>
                  <p className="text-foreground leading-relaxed">
                    You may opt out of receiving promotional emails by following the unsubscribe link in those emails. You cannot opt out of service-related communications necessary for account management.
                  </p>
                </section>

                {/* State-Specific Rights */}
                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">State-Specific Privacy Rights</h2>
                  
                  <h3 className="text-xl font-semibold mb-3 mt-6">Kentucky Residents</h3>
                  <p className="text-foreground leading-relaxed mb-4">
                    DismissalPro is incorporated in Kentucky and committed to complying with all applicable Kentucky state privacy laws and regulations.
                  </p>

                  <h3 className="text-xl font-semibold mb-3 mt-6">Other State Laws</h3>
                  <p className="text-foreground leading-relaxed">
                    Residents of certain states may have additional privacy rights under state law. If you have questions about state-specific privacy rights, please contact us at legal@dismissalpro.io.
                  </p>
                </section>

                {/* Cookies and Tracking */}
                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Cookies and Tracking Technologies</h2>
                  
                  <h3 className="text-xl font-semibold mb-3 mt-6">Types of Cookies We Use</h3>
                  <ul className="list-disc pl-6 space-y-2 text-foreground mb-4">
                    <li><strong>Essential Cookies:</strong> Necessary for the Service to function (authentication, security, session management)</li>
                    <li><strong>Analytics Cookies:</strong> Help us understand how users interact with our Service to improve functionality</li>
                  </ul>

                  <h3 className="text-xl font-semibold mb-3 mt-6">Managing Cookies</h3>
                  <p className="text-foreground leading-relaxed">
                    You can control and/or delete cookies as you wish through your browser settings. However, disabling essential cookies may impact your ability to use certain features of our Service.
                  </p>
                </section>

                {/* Data Storage */}
                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Data Storage and Location</h2>
                  <p className="text-foreground leading-relaxed mb-4">
                    Your data is stored on secure cloud servers in the United States via Supabase (supabase.com). All data is encrypted both in transit and at rest.
                  </p>
                  <p className="text-foreground leading-relaxed">
                    DismissalPro is a US-only service. We do not transfer data outside the United States.
                  </p>
                </section>

                {/* Data Breach Notification */}
                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Data Breach Notification</h2>
                  <p className="text-foreground leading-relaxed">
                    In the event of a data breach that affects personal information, we will notify affected users and schools within 72 hours of discovery, in accordance with applicable laws. Notifications will include the nature of the breach, types of information involved, and steps being taken to address the situation.
                  </p>
                </section>

                {/* Changes to Privacy Policy */}
                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Changes to This Privacy Policy</h2>
                  <p className="text-foreground leading-relaxed mb-4">
                    We may update our Privacy Policy from time to time. We will notify you of any changes by:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-foreground mb-4">
                    <li>Posting the new Privacy Policy on this page</li>
                    <li>Updating the "Last Updated" date at the top</li>
                    <li>Sending an email notification for material changes</li>
                  </ul>
                  <p className="text-foreground leading-relaxed">
                    Changes become effective immediately upon posting. Your continued use of the Service after changes are posted constitutes acceptance of the updated policy.
                  </p>
                </section>

                {/* Contact Information */}
                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
                  <p className="text-foreground leading-relaxed mb-4">
                    If you have any questions about this Privacy Policy or our data practices, please contact us:
                  </p>
                  
                  <div className="bg-muted/50 rounded-lg p-6 space-y-3">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-primary" />
                      <div>
                        <div className="font-semibold">Email</div>
                        <a href="mailto:legal@dismissalpro.io" className="text-primary hover:underline">
                          legal@dismissalpro.io
                        </a>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-primary" />
                      <div>
                        <div className="font-semibold">Mailing Address</div>
                        <div className="text-muted-foreground">
                          DismissalPro, Inc.<br />
                          1042 Rockbridge Rd<br />
                          Lexington, KY 40515
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Legal Disclaimer */}
                <section className="mb-8 bg-muted/30 rounded-lg p-6">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    <strong>Legal Disclaimer:</strong> This Privacy Policy is provided for informational purposes and does not constitute legal advice. Schools should consult with their own legal counsel to ensure compliance with all applicable federal, state, and local laws regarding student data privacy, including but not limited to FERPA, COPPA, and state-specific student privacy laws.
                  </p>
                </section>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Footer />
      </div>
    </>
  );
};

export default PrivacyPolicy;
