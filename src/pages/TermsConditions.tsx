import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Mail, MapPin } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useSEO } from "@/hooks/useSEO";

const TermsConditions = () => {
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
                <h1 className="text-4xl font-bold mb-2">Terms and Conditions</h1>
                <p className="text-muted-foreground mb-8">Last Updated: {lastUpdated}</p>

                {/* Introduction */}
                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Acceptance of Terms</h2>
                  <p className="text-foreground leading-relaxed mb-4">
                    These Terms and Conditions ("Terms") govern your access to and use of the DismissalPro school dismissal management platform ("Service") provided by DismissalPro, Inc. ("DismissalPro," "we," "our," or "us").
                  </p>
                  <p className="text-foreground leading-relaxed mb-4">
                    By accessing or using our Service, you agree to be bound by these Terms. If you do not agree to these Terms, you may not access or use the Service.
                  </p>
                  <p className="text-foreground leading-relaxed">
                    These Terms constitute a legally binding agreement between you (and the school or organization you represent) and DismissalPro, Inc.
                  </p>
                </section>

                {/* Definitions */}
                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Definitions</h2>
                  <ul className="list-disc pl-6 space-y-2 text-foreground">
                    <li><strong>"Service"</strong> refers to the DismissalPro platform, including the website, mobile applications, and all related services.</li>
                    <li><strong>"User"</strong> refers to any individual who accesses or uses the Service.</li>
                    <li><strong>"School"</strong> refers to the educational institution subscribing to the Service.</li>
                    <li><strong>"Student Data"</strong> refers to any information relating to students that is collected or processed through the Service.</li>
                    <li><strong>"Authorized User"</strong> refers to school staff members who have been granted access to the Service by their school.</li>
                  </ul>
                </section>

                {/* Account Registration */}
                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Account Registration and Eligibility</h2>
                  
                  <h3 className="text-xl font-semibold mb-3 mt-6">Eligibility Requirements</h3>
                  <p className="text-foreground leading-relaxed mb-4">
                    To use the Service, you must:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-foreground mb-4">
                    <li>Be at least 18 years of age</li>
                    <li>Be an authorized staff member of a school or educational institution</li>
                    <li>Have the legal authority to bind your school to these Terms</li>
                    <li>Be located in the United States</li>
                  </ul>

                  <h3 className="text-xl font-semibold mb-3 mt-6">Account Security</h3>
                  <p className="text-foreground leading-relaxed mb-4">
                    You are responsible for:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-foreground mb-4">
                    <li>Maintaining the confidentiality of your account credentials</li>
                    <li>All activities that occur under your account</li>
                    <li>Notifying us immediately of any unauthorized access</li>
                    <li>Ensuring account information remains accurate and current</li>
                  </ul>

                  <h3 className="text-xl font-semibold mb-3 mt-6">Account Information</h3>
                  <p className="text-foreground leading-relaxed">
                    You agree to provide accurate, current, and complete information during registration and to update such information to maintain its accuracy. We reserve the right to suspend or terminate accounts that contain inaccurate or incomplete information.
                  </p>
                </section>

                {/* Service Description */}
                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Service Description</h2>
                  <p className="text-foreground leading-relaxed mb-4">
                    DismissalPro provides a cloud-based school dismissal management platform designed to help schools organize and streamline their student dismissal processes. The Service includes:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-foreground mb-4">
                    <li>Student roster management</li>
                    <li>Transportation assignment and tracking</li>
                    <li>Dismissal run management (bus, car line, walker)</li>
                    <li>Special event and field trip transportation management</li>
                    <li>Integration with Infinite Campus student information systems</li>
                    <li>Reporting and analytics tools</li>
                    <li>Multi-user access and permissions</li>
                  </ul>
                  <p className="text-foreground leading-relaxed">
                    The Service is available exclusively to schools and educational institutions located in the United States.
                  </p>
                </section>

                {/* Subscription and Pricing */}
                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Subscription and Pricing</h2>
                  
                  <h3 className="text-xl font-semibold mb-3 mt-6">Subscription Model</h3>
                  <p className="text-foreground leading-relaxed mb-4">
                    DismissalPro operates on an annual subscription basis. Current pricing and plan details are available on our website at dismissalpro.io/pricing.
                  </p>

                  <h3 className="text-xl font-semibold mb-3 mt-6">Pricing Changes</h3>
                  <p className="text-foreground leading-relaxed mb-4">
                    We reserve the right to modify our pricing at any time. Price changes will not affect your current subscription period but will apply upon renewal. We will provide notice of any price changes before your subscription renews.
                  </p>

                  <h3 className="text-xl font-semibold mb-3 mt-6">Payment Terms</h3>
                  <ul className="list-disc pl-6 space-y-2 text-foreground mb-4">
                    <li>Payment is due annually in advance</li>
                    <li>Subscriptions automatically renew unless cancelled</li>
                    <li>All fees are non-refundable except as specified in our Refund Policy</li>
                    <li>You are responsible for all applicable taxes</li>
                  </ul>

                  <h3 className="text-xl font-semibold mb-3 mt-6">Free Trial</h3>
                  <p className="text-foreground leading-relaxed">
                    We may offer a free trial period for new users. During the trial, you have full access to the Service. If you do not cancel before the trial ends, you will be charged for the subscription.
                  </p>
                </section>

                {/* Refund Policy */}
                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Refund Policy</h2>
                  <p className="text-foreground leading-relaxed mb-4">
                    We offer a limited refund policy:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-foreground mb-4">
                    <li><strong>30-Day Partial Refund:</strong> You may request a 50% refund within 30 days of your initial payment</li>
                    <li>Refunds must be requested in writing to legal@dismissalpro.io</li>
                    <li>Refunds are processed within 10 business days of approval</li>
                    <li>After 30 days, all fees are non-refundable</li>
                  </ul>
                  <p className="text-foreground leading-relaxed">
                    Refunds are not available for renewals, only for initial subscriptions. We reserve the right to deny refund requests that we determine to be fraudulent or abusive.
                  </p>
                </section>

                {/* Data and Privacy */}
                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Data and Privacy</h2>
                  
                  <h3 className="text-xl font-semibold mb-3 mt-6">Privacy Policy</h3>
                  <p className="text-foreground leading-relaxed mb-4">
                    Your use of the Service is also governed by our Privacy Policy, which is incorporated into these Terms by reference. Please review our <Link to="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link> to understand our data practices.
                  </p>

                  <h3 className="text-xl font-semibold mb-3 mt-6">Your Responsibilities for Student Data</h3>
                  <p className="text-foreground leading-relaxed mb-4">
                    As the school or educational institution, you are responsible for:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-foreground mb-4">
                    <li>Ensuring you have the legal right to provide student data to DismissalPro</li>
                    <li>Obtaining any necessary parental consent as required by law</li>
                    <li>Providing required notices to parents and students</li>
                    <li>Maintaining the accuracy of student data</li>
                    <li>Complying with all applicable privacy laws, including FERPA and COPPA</li>
                  </ul>

                  <h3 className="text-xl font-semibold mb-3 mt-6">FERPA Compliance</h3>
                  <p className="text-foreground leading-relaxed mb-4">
                    The school maintains ownership and control of all student education records. DismissalPro acts as a "school official" with legitimate educational interests for purposes of FERPA. We will:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-foreground">
                    <li>Use student data only for providing the Service</li>
                    <li>Not disclose student data except as permitted by FERPA or as directed by the school</li>
                    <li>Maintain reasonable security measures to protect student data</li>
                    <li>Assist schools in responding to parent requests regarding student records</li>
                  </ul>
                </section>

                {/* Acceptable Use */}
                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Acceptable Use Policy</h2>
                  
                  <h3 className="text-xl font-semibold mb-3 mt-6">Prohibited Activities</h3>
                  <p className="text-foreground leading-relaxed mb-4">
                    You agree not to:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-foreground mb-4">
                    <li>Use the Service for any unlawful purpose or in violation of these Terms</li>
                    <li>Access or attempt to access accounts, systems, or networks without authorization</li>
                    <li>Misuse, abuse, or improperly handle student data</li>
                    <li>Share student data with unauthorized third parties</li>
                    <li>Use the Service in any way that could damage, disable, or impair the Service</li>
                    <li>Introduce viruses, malware, or other harmful code</li>
                    <li>Reverse engineer, decompile, or disassemble the Service</li>
                    <li>Share your account credentials with unauthorized individuals</li>
                    <li>Use automated systems to access the Service without our written permission</li>
                    <li>Remove or alter any proprietary notices or labels</li>
                  </ul>

                  <h3 className="text-xl font-semibold mb-3 mt-6">Consequences of Violations</h3>
                  <p className="text-foreground leading-relaxed">
                    Violations of this Acceptable Use Policy may result in immediate suspension or termination of your account without refund, and we may report violations to appropriate law enforcement authorities.
                  </p>
                </section>

                {/* Intellectual Property */}
                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Intellectual Property Rights</h2>
                  
                  <h3 className="text-xl font-semibold mb-3 mt-6">DismissalPro's Ownership</h3>
                  <p className="text-foreground leading-relaxed mb-4">
                    The Service and its entire contents, features, and functionality (including but not limited to all information, software, code, text, displays, graphics, photographs, video, audio, design, presentation, selection, and arrangement) are owned by DismissalPro, Inc., its licensors, or other providers of such material and are protected by United States and international copyright, trademark, patent, trade secret, and other intellectual property laws.
                  </p>

                  <h3 className="text-xl font-semibold mb-3 mt-6">Limited License</h3>
                  <p className="text-foreground leading-relaxed mb-4">
                    Subject to these Terms, we grant you a limited, non-exclusive, non-transferable, revocable license to access and use the Service solely for your internal school dismissal management purposes.
                  </p>

                  <h3 className="text-xl font-semibold mb-3 mt-6">Your Data</h3>
                  <p className="text-foreground leading-relaxed">
                    You retain all ownership rights to the student and school data you provide to the Service. By using the Service, you grant us a limited license to use, store, and process your data solely for the purpose of providing the Service to you.
                  </p>
                </section>

                {/* Third-Party Integrations */}
                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Third-Party Integrations</h2>
                  
                  <h3 className="text-xl font-semibold mb-3 mt-6">Infinite Campus Integration</h3>
                  <p className="text-foreground leading-relaxed mb-4">
                    If you choose to integrate DismissalPro with Infinite Campus:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-foreground mb-4">
                    <li>You are responsible for maintaining your Infinite Campus account and credentials</li>
                    <li>DismissalPro accesses Infinite Campus data through read-only API connections</li>
                    <li>We do not modify or write data back to Infinite Campus</li>
                    <li>You must comply with Infinite Campus's terms of service</li>
                    <li>Integration availability depends on Infinite Campus's service availability</li>
                  </ul>

                  <h3 className="text-xl font-semibold mb-3 mt-6">Third-Party Services</h3>
                  <p className="text-foreground leading-relaxed">
                    The Service may contain links to or integrate with third-party services. We are not responsible for the content, privacy policies, or practices of third-party services. Your use of third-party services is at your own risk and subject to their terms and conditions.
                  </p>
                </section>

                {/* Service Modifications */}
                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Service Modifications and Availability</h2>
                  <p className="text-foreground leading-relaxed mb-4">
                    We reserve the right to:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-foreground mb-4">
                    <li>Modify, update, or discontinue any aspect of the Service at any time</li>
                    <li>Change features, functionality, or content</li>
                    <li>Perform maintenance that may temporarily interrupt service</li>
                  </ul>
                  <p className="text-foreground leading-relaxed">
                    We will provide reasonable notice of material changes that significantly impact the Service's core functionality. The Service may occasionally be unavailable due to maintenance, updates, or circumstances beyond our control.
                  </p>
                </section>

                {/* Termination */}
                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Termination</h2>
                  
                  <h3 className="text-xl font-semibold mb-3 mt-6">Your Right to Cancel</h3>
                  <p className="text-foreground leading-relaxed mb-4">
                    You may cancel your subscription at any time by:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-foreground mb-4">
                    <li>Accessing your account settings and following the cancellation process</li>
                    <li>Contacting us at legal@dismissalpro.io</li>
                  </ul>
                  <p className="text-foreground leading-relaxed mb-4">
                    Cancellation will take effect at the end of your current subscription period. You will retain access to the Service until that date.
                  </p>

                  <h3 className="text-xl font-semibold mb-3 mt-6">Our Right to Suspend or Terminate</h3>
                  <p className="text-foreground leading-relaxed mb-4">
                    We may suspend or terminate your access to the Service immediately, without prior notice or liability, for any reason, including:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-foreground mb-4">
                    <li>Breach of these Terms</li>
                    <li>Non-payment of fees</li>
                    <li>Fraudulent or illegal activity</li>
                    <li>Actions that harm DismissalPro or other users</li>
                  </ul>

                  <h3 className="text-xl font-semibold mb-3 mt-6">Effects of Termination</h3>
                  <p className="text-foreground leading-relaxed mb-4">
                    Upon termination:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-foreground mb-4">
                    <li>Your right to access and use the Service immediately ceases</li>
                    <li>You must cease all use of the Service</li>
                    <li>Data will be retained for 60 days after cancellation, then permanently deleted</li>
                    <li>You may request a data export before permanent deletion</li>
                    <li>Unpaid accounts will be deleted 90 days from signup (30 days after payment due date)</li>
                  </ul>

                  <h3 className="text-xl font-semibold mb-3 mt-6">Survival</h3>
                  <p className="text-foreground leading-relaxed">
                    Sections of these Terms that by their nature should survive termination will survive, including provisions regarding intellectual property, disclaimers, limitations of liability, and dispute resolution.
                  </p>
                </section>

                {/* Disclaimers */}
                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Disclaimers</h2>
                  <p className="text-foreground leading-relaxed mb-4">
                    THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, OR NON-INFRINGEMENT.
                  </p>
                  <p className="text-foreground leading-relaxed mb-4">
                    We do not warrant that:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-foreground mb-4">
                    <li>The Service will be uninterrupted, secure, or error-free</li>
                    <li>Defects will be corrected</li>
                    <li>The Service is free of viruses or harmful components</li>
                    <li>Results obtained from the Service will be accurate or reliable</li>
                  </ul>
                  <p className="text-foreground leading-relaxed mb-4">
                    <strong>Important:</strong> DismissalPro is a tool to assist with dismissal management, but schools remain solely responsible for student safety and supervision. The Service does not replace proper adult supervision or safety protocols.
                  </p>
                  <p className="text-foreground leading-relaxed">
                    You are responsible for verifying the accuracy of all data entered into the Service and for implementing appropriate safety procedures at your school.
                  </p>
                </section>

                {/* Limitation of Liability */}
                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Limitation of Liability</h2>
                  <p className="text-foreground leading-relaxed mb-4">
                    TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL DISMISSALPRO, INC., ITS AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, OR LICENSORS BE LIABLE FOR:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-foreground mb-4">
                    <li>ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES</li>
                    <li>LOSS OF PROFITS, REVENUE, DATA, OR USE</li>
                    <li>BUSINESS INTERRUPTION</li>
                    <li>STUDENT SAFETY INCIDENTS</li>
                  </ul>
                  <p className="text-foreground leading-relaxed mb-4">
                    WHETHER BASED ON WARRANTY, CONTRACT, TORT (INCLUDING NEGLIGENCE), OR ANY OTHER LEGAL THEORY, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
                  </p>
                  <p className="text-foreground leading-relaxed mb-4">
                    OUR TOTAL LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF OR RELATED TO THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE AMOUNT YOU PAID TO US FOR THE SERVICE DURING THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
                  </p>
                  <p className="text-foreground leading-relaxed">
                    Some jurisdictions do not allow the exclusion or limitation of certain warranties or damages, so some of the above limitations may not apply to you.
                  </p>
                </section>

                {/* Indemnification */}
                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Indemnification</h2>
                  <p className="text-foreground leading-relaxed">
                    You agree to indemnify, defend, and hold harmless DismissalPro, Inc., its affiliates, officers, directors, employees, agents, and licensors from and against any claims, liabilities, damages, losses, costs, expenses, or fees (including reasonable attorneys' fees) arising from:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-foreground mt-4">
                    <li>Your use or misuse of the Service</li>
                    <li>Your violation of these Terms</li>
                    <li>Your violation of any rights of another party</li>
                    <li>Your violation of any law or regulation</li>
                    <li>Student data you provide or how you use the Service</li>
                    <li>Any failure to obtain necessary consents or provide required notices</li>
                  </ul>
                </section>

                {/* Governing Law */}
                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Governing Law and Dispute Resolution</h2>
                  
                  <h3 className="text-xl font-semibold mb-3 mt-6">Governing Law</h3>
                  <p className="text-foreground leading-relaxed mb-4">
                    These Terms shall be governed by and construed in accordance with the laws of the Commonwealth of Kentucky, without regard to its conflict of law provisions.
                  </p>

                  <h3 className="text-xl font-semibold mb-3 mt-6">Dispute Resolution</h3>
                  <p className="text-foreground leading-relaxed mb-4">
                    Any dispute arising out of or relating to these Terms or the Service shall be resolved through:
                  </p>
                  <ol className="list-decimal pl-6 space-y-2 text-foreground mb-4">
                    <li><strong>Informal Resolution:</strong> First, contact us at legal@dismissalpro.io to attempt to resolve the dispute informally</li>
                    <li><strong>Mediation:</strong> If informal resolution fails, the parties agree to attempt mediation before pursuing litigation</li>
                    <li><strong>Jurisdiction:</strong> Any legal action must be brought in the state or federal courts located in Fayette County, Kentucky, and you consent to the exclusive jurisdiction of such courts</li>
                  </ol>

                  <h3 className="text-xl font-semibold mb-3 mt-6">Waiver of Class Actions</h3>
                  <p className="text-foreground leading-relaxed">
                    You agree that any dispute resolution proceedings will be conducted only on an individual basis and not in a class, consolidated, or representative action.
                  </p>
                </section>

                {/* General Provisions */}
                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">General Provisions</h2>
                  
                  <h3 className="text-xl font-semibold mb-3 mt-6">Entire Agreement</h3>
                  <p className="text-foreground leading-relaxed mb-4">
                    These Terms, together with our Privacy Policy, constitute the entire agreement between you and DismissalPro regarding the Service and supersede all prior agreements and understandings.
                  </p>

                  <h3 className="text-xl font-semibold mb-3 mt-6">Severability</h3>
                  <p className="text-foreground leading-relaxed mb-4">
                    If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions will remain in full force and effect.
                  </p>

                  <h3 className="text-xl font-semibold mb-3 mt-6">Waiver</h3>
                  <p className="text-foreground leading-relaxed mb-4">
                    Our failure to enforce any right or provision of these Terms will not be deemed a waiver of such right or provision.
                  </p>

                  <h3 className="text-xl font-semibold mb-3 mt-6">Assignment</h3>
                  <p className="text-foreground leading-relaxed mb-4">
                    You may not assign or transfer these Terms or your account without our prior written consent. We may assign these Terms without restriction.
                  </p>

                  <h3 className="text-xl font-semibold mb-3 mt-6">Force Majeure</h3>
                  <p className="text-foreground leading-relaxed">
                    We shall not be liable for any failure or delay in performance due to circumstances beyond our reasonable control, including acts of God, natural disasters, war, terrorism, labor disputes, or internet service failures.
                  </p>
                </section>

                {/* Changes to Terms */}
                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Changes to These Terms</h2>
                  <p className="text-foreground leading-relaxed mb-4">
                    We reserve the right to modify these Terms at any time. We will notify you of material changes by:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-foreground mb-4">
                    <li>Posting the updated Terms on our website</li>
                    <li>Updating the "Last Updated" date at the top</li>
                    <li>Sending email notification for material changes</li>
                  </ul>
                  <p className="text-foreground leading-relaxed mb-4">
                    Changes will become effective immediately upon posting for new users, or 30 days after posting for existing users.
                  </p>
                  <p className="text-foreground leading-relaxed">
                    Your continued use of the Service after the effective date of revised Terms constitutes acceptance of the changes. If you do not agree to the modified Terms, you must stop using the Service and cancel your subscription.
                  </p>
                </section>

                {/* Contact Information */}
                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Contact Information</h2>
                  <p className="text-foreground leading-relaxed mb-4">
                    If you have any questions about these Terms, please contact us:
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
                    <strong>Legal Disclaimer:</strong> These Terms and Conditions are provided for informational purposes and do not constitute legal advice. Schools should consult with their own legal counsel to ensure compliance with all applicable federal, state, and local laws. By using the Service, you acknowledge that you have read, understood, and agree to be bound by these Terms.
                  </p>
                </section>

                {/* Acknowledgment */}
                <section className="mb-8 bg-primary/10 rounded-lg p-6">
                  <h2 className="text-xl font-semibold mb-3">Acknowledgment of Terms</h2>
                  <p className="text-foreground leading-relaxed">
                    BY USING THE SERVICE, YOU ACKNOWLEDGE THAT YOU HAVE READ THESE TERMS AND CONDITIONS, UNDERSTAND THEM, AND AGREE TO BE BOUND BY THEM. IF YOU DO NOT AGREE TO THESE TERMS, YOU MAY NOT ACCESS OR USE THE SERVICE.
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

export default TermsConditions;
