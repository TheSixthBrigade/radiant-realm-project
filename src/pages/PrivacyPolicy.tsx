import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import AnimatedBackground from "@/components/AnimatedBackground";
import { SEO, BreadcrumbSchema } from "@/components/SEO";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background relative">
      <SEO 
        title="Privacy Policy"
        description="Learn how Vectabase collects, uses, and protects your personal information. Our privacy policy covers data collection, cookies, third-party services, and your rights."
        url="/privacy"
        noIndex={false}
      />
      <BreadcrumbSchema items={[
        { name: 'Home', url: '/' },
        { name: 'Privacy Policy', url: '/privacy' }
      ]} />
      <AnimatedBackground />
      <div className="relative z-10">
        <Navigation />
        
        <div className="container mx-auto px-6 pt-24 pb-12">
          <div className="max-w-4xl mx-auto">
            <div className="bg-card border rounded-lg p-8 md:p-12">
              <h1 className="text-3xl font-bold mb-2 text-center">PRIVACY POLICY</h1>
              <p className="text-center text-muted-foreground mb-8">Effective Date: January 4, 2026</p>
              
              <div className="prose prose-invert max-w-none text-sm leading-relaxed space-y-6">
                <p>
                  This Privacy Policy describes how Vectabase ("Company," "we," "us," or "our") collects, uses, and shares information about you when you use our website, platform, Discord bot services, application programming interfaces, and related services (collectively, the "Services"). By accessing or using the Services, you agree to the collection, use, and disclosure of your information as described in this Privacy Policy.
                </p>

                <section>
                  <h2 className="text-lg font-semibold mb-3">1. INFORMATION WE COLLECT</h2>
                  
                  <p className="text-muted-foreground mb-3">
                    <strong>1.1. Information You Provide Directly.</strong> We collect information you provide directly to us, including: (a) account registration information such as email address, username, display name, and password; (b) profile information such as avatar images, biographical information, and linked social media accounts; (c) payment and transaction information processed through our third-party payment processors; (d) content you upload, post, or transmit through the Services, including products, scripts, images, and descriptions; (e) communications with us, including support requests, feedback, and correspondence; and (f) any other information you choose to provide.
                  </p>
                  
                  <p className="text-muted-foreground mb-3">
                    <strong>1.2. Information Collected Automatically.</strong> When you access or use the Services, we automatically collect certain information, including: (a) log information such as access times, pages viewed, IP address, and the page you visited before navigating to our Services; (b) device information such as hardware model, operating system and version, unique device identifiers, and browser type; (c) usage information such as features used, actions taken, and time spent on the Services; and (d) information collected through cookies, pixel tags, and similar technologies.
                  </p>
                  
                  <p className="text-muted-foreground">
                    <strong>1.3. Information from Third Parties.</strong> We may receive information about you from third parties, including: (a) Discord, including your Discord user ID, username, avatar, and server membership information when you use our Discord bot services; (b) Roblox, including your Roblox user ID, username, and group membership information when you use our whitelist verification services; (c) payment processors such as Stripe and PayPal, including transaction status and limited payment information; and (d) other users who may provide information about you in connection with their use of the Services.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">2. USE OF INFORMATION</h2>
                  <p className="text-muted-foreground mb-3">
                    We use the information we collect for various purposes, including to: (a) provide, maintain, and improve the Services; (b) process transactions and send related information, including purchase confirmations and invoices; (c) create and manage your account; (d) verify license keys and manage whitelist access; (e) send you technical notices, updates, security alerts, and administrative messages; (f) respond to your comments, questions, and requests, and provide customer service; (g) monitor and analyze trends, usage, and activities in connection with the Services; (h) detect, investigate, and prevent fraudulent transactions, abuse, and other illegal activities; (i) personalize and improve the Services and provide content or features that match your profile or interests; (j) enforce our Terms of Service and other policies; and (k) carry out any other purpose described to you at the time the information was collected.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">3. SHARING OF INFORMATION</h2>
                  <p className="text-muted-foreground mb-3">
                    We may share information about you as follows or as otherwise described in this Privacy Policy:
                  </p>
                  <p className="text-muted-foreground mb-3">
                    <strong>3.1. Service Providers.</strong> We share information with third-party vendors, consultants, and other service providers who need access to such information to carry out work on our behalf, including: (a) Supabase for database hosting and authentication services; (b) Stripe and PayPal for payment processing; (c) Discord for bot functionality; and (d) hosting and infrastructure providers.
                  </p>
                  <p className="text-muted-foreground mb-3">
                    <strong>3.2. Compliance with Laws.</strong> We may disclose information about you if we believe disclosure is in accordance with, or required by, any applicable law, regulation, or legal process, including lawful requests by public authorities to meet national security or law enforcement requirements.
                  </p>
                  <p className="text-muted-foreground mb-3">
                    <strong>3.3. Protection of Rights.</strong> We may disclose information about you if we believe your actions are inconsistent with our user agreements or policies, or to protect the rights, property, and safety of the Company, our users, or others.
                  </p>
                  <p className="text-muted-foreground mb-3">
                    <strong>3.4. Business Transfers.</strong> We may share or transfer information about you in connection with, or during negotiations of, any merger, sale of company assets, financing, or acquisition of all or a portion of our business by another company.
                  </p>
                  <p className="text-muted-foreground">
                    <strong>3.5. With Your Consent.</strong> We may share information about you with your consent or at your direction.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">4. DATA RETENTION</h2>
                  <p className="text-muted-foreground">
                    We retain information about you for as long as necessary to fulfill the purposes for which it was collected, including to satisfy any legal, accounting, or reporting requirements. To determine the appropriate retention period for personal information, we consider the amount, nature, and sensitivity of the information, the potential risk of harm from unauthorized use or disclosure, the purposes for which we process the information, whether we can achieve those purposes through other means, and applicable legal requirements. Upon account deletion, we will delete or anonymize your personal information within thirty (30) days, except where retention is required by law or for legitimate business purposes such as resolving disputes or enforcing our agreements.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">5. DATA SECURITY</h2>
                  <p className="text-muted-foreground">
                    We implement appropriate technical and organizational measures designed to protect the security of personal information we process. These measures include encryption of data in transit using TLS/SSL protocols, encryption of sensitive data at rest, password hashing using industry-standard algorithms, access controls and authentication requirements, and regular security assessments. However, no method of transmission over the Internet or method of electronic storage is completely secure. While we strive to use commercially acceptable means to protect your personal information, we cannot guarantee its absolute security.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">6. COOKIES AND TRACKING TECHNOLOGIES</h2>
                  <p className="text-muted-foreground mb-3">
                    We use cookies and similar tracking technologies to collect and store information about your interactions with the Services. Cookies are small data files stored on your device that help us improve the Services and your experience, see which areas and features of the Services are popular, and count visits.
                  </p>
                  <p className="text-muted-foreground">
                    We use the following types of cookies: (a) essential cookies, which are required for the operation of the Services and enable core functionality such as security, network management, and account authentication; (b) preference cookies, which enable the Services to remember information that changes the way the Services behave or look, such as your preferred language or region; and (c) analytics cookies, which allow us to recognize and count the number of visitors and see how visitors move around the Services. Most web browsers are set to accept cookies by default. You can usually choose to set your browser to remove or reject cookies, but this may affect the availability and functionality of the Services.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">7. YOUR RIGHTS AND CHOICES</h2>
                  <p className="text-muted-foreground mb-3">
                    Depending on your location, you may have certain rights regarding your personal information, including: (a) the right to access personal information we hold about you; (b) the right to request correction of inaccurate personal information; (c) the right to request deletion of your personal information; (d) the right to request restriction of processing of your personal information; (e) the right to data portability; and (f) the right to object to processing of your personal information.
                  </p>
                  <p className="text-muted-foreground">
                    To exercise any of these rights, please contact us through our Discord server by opening a support ticket. We will respond to your request within thirty (30) days. We may request specific information from you to help us confirm your identity and process your request. Note that we may retain certain information as required by law or for legitimate business purposes.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">8. CHILDREN'S PRIVACY AND AGE RESTRICTIONS</h2>
                  <p className="text-muted-foreground mb-3">
                    THE SERVICES ARE NOT INTENDED FOR AND MAY NOT BE USED BY CHILDREN UNDER THE AGE OF THIRTEEN (13). We do not knowingly collect, maintain, or use personal information from children under thirteen (13) years of age, and no part of the Services is directed to children under thirteen (13). In compliance with the Children's Online Privacy Protection Act ("COPPA"), if we learn that personal information of a child under thirteen (13) has been collected through the Services, we will take appropriate steps to delete this information as quickly as possible and terminate any associated account.
                  </p>
                  <p className="text-muted-foreground mb-3">
                    If you are a parent or guardian and you believe that your child under thirteen (13) has provided us with personal information or created an account on the Services, please contact us immediately through our Discord server so that we can take necessary action to remove such information and terminate the account.
                  </p>
                  <p className="text-muted-foreground">
                    Users between the ages of thirteen (13) and eighteen (18) may only use the Services with the consent and supervision of a parent or legal guardian who has reviewed and agreed to our Terms of Service and this Privacy Policy. The parent or legal guardian is responsible for the minor's use of the Services and any consequences thereof.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">9. INTERNATIONAL DATA TRANSFERS</h2>
                  <p className="text-muted-foreground">
                    Your information may be transferred to, and maintained on, computers located outside of your state, province, country, or other governmental jurisdiction where the data protection laws may differ from those of your jurisdiction. If you are located outside the United States and choose to provide information to us, please note that we transfer the information to the United States and process it there. Your consent to this Privacy Policy followed by your submission of such information represents your agreement to that transfer.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">10. THIRD-PARTY SERVICES</h2>
                  <p className="text-muted-foreground">
                    The Services may contain links to third-party websites, services, or applications that are not operated by us. This Privacy Policy does not apply to third-party services, and we are not responsible for the content, privacy policies, or practices of any third-party services. We encourage you to review the privacy policies of any third-party services you access.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">11. CHANGES TO THIS PRIVACY POLICY</h2>
                  <p className="text-muted-foreground">
                    We may update this Privacy Policy from time to time. If we make material changes, we will notify you by updating the date at the top of this policy and, in some cases, we may provide you with additional notice such as adding a statement to our website or sending you a notification. We encourage you to review this Privacy Policy periodically to stay informed about our information practices. Your continued use of the Services after any changes to this Privacy Policy constitutes your acceptance of such changes.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">12. CONTACT US</h2>
                  <p className="text-muted-foreground">
                    If you have any questions about this Privacy Policy or our privacy practices, please contact us through our Discord server by opening a support ticket, or through our <Link to="/contact" className="text-primary hover:underline">Contact Page</Link>.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">13. ADDITIONAL DISCLOSURES FOR CALIFORNIA RESIDENTS</h2>
                  <p className="text-muted-foreground mb-3">
                    If you are a California resident, you may have additional rights under the California Consumer Privacy Act ("CCPA"). These rights include: (a) the right to know what personal information we have collected about you, including the categories of personal information, the categories of sources from which the personal information is collected, the business or commercial purpose for collecting the personal information, and the categories of third parties with whom we share personal information; (b) the right to request deletion of your personal information; and (c) the right to opt-out of the sale of your personal information. We do not sell personal information as defined under the CCPA.
                  </p>
                  <p className="text-muted-foreground">
                    To exercise your rights under the CCPA, please contact us through our Discord server. We will not discriminate against you for exercising any of your CCPA rights.
                  </p>
                </section>

                <div className="border-t pt-6 mt-8">
                  <p className="text-muted-foreground mb-4">
                    This Privacy Policy should be read in conjunction with our <Link to="/tos" className="text-primary hover:underline">Terms of Service</Link>.
                  </p>
                  <p className="text-muted-foreground text-center text-xs">
                    BY USING THE SERVICES, YOU ACKNOWLEDGE THAT YOU HAVE READ AND UNDERSTOOD THIS PRIVACY POLICY.
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center mt-8">
              <Link to="/" className="text-primary hover:underline text-sm">← Return to Home</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
