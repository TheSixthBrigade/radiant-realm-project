import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import AnimatedBackground from "@/components/AnimatedBackground";
import { SEO, BreadcrumbSchema } from "@/components/SEO";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background relative">
      <SEO 
        title="Terms of Service"
        description="Read the Vectabase Terms of Service. Learn about user agreements, marketplace policies, code obfuscation services, whitelist systems, and your rights and responsibilities."
        url="/tos"
        noIndex={false}
      />
      <BreadcrumbSchema items={[
        { name: 'Home', url: '/' },
        { name: 'Terms of Service', url: '/tos' }
      ]} />
      <AnimatedBackground />
      <div className="relative z-10">
        <Navigation />
        
        <div className="container mx-auto px-6 pt-24 pb-12">
          <div className="max-w-4xl mx-auto">
            <div className="bg-card border rounded-lg p-8 md:p-12">
              <h1 className="text-3xl font-bold mb-2 text-center">TERMS OF SERVICE</h1>
              <p className="text-center text-muted-foreground mb-8">Effective Date: January 4, 2026</p>
              
              <div className="prose prose-invert max-w-none text-sm leading-relaxed space-y-6">
                <p>
                  PLEASE READ THESE TERMS OF SERVICE CAREFULLY BEFORE USING THE SERVICES OFFERED BY VECTABASE. BY ACCESSING OR USING THE SERVICES IN ANY MANNER, YOU AGREE TO BE BOUND BY THESE TERMS. IF YOU DO NOT ACCEPT ALL OF THESE TERMS, YOU MAY NOT USE THE SERVICES.
                </p>

                <section>
                  <h2 className="text-lg font-semibold mb-3">1. ACCEPTANCE OF TERMS</h2>
                  <p className="text-muted-foreground mb-3">
                    1.1. These Terms of Service ("Terms," "Agreement") constitute a legally binding agreement between you ("User," "you," "your") and Vectabase ("Company," "we," "us," "our") governing your access to and use of the Vectabase website, platform, Discord bot services, application programming interfaces, code obfuscation tools, whitelist management systems, digital marketplace, and all related services (collectively, the "Services").
                  </p>
                  <p className="text-muted-foreground mb-3">
                    1.2. By creating an account, accessing the Services, purchasing or selling products through the marketplace, utilizing our developer tools, or otherwise interacting with any component of the Services, you represent and warrant that: (a) YOU ARE AT LEAST THIRTEEN (13) YEARS OF AGE—users under thirteen (13) are strictly prohibited from using the Services and any account belonging to a user under thirteen (13) will be immediately terminated upon discovery; (b) if you are between the ages of thirteen (13) and eighteen (18), you have obtained verifiable parental or legal guardian consent to use the Services and your parent or legal guardian has reviewed and agreed to these Terms; (c) you have the legal capacity to enter into this Agreement; and (d) your use of the Services does not violate any applicable law or regulation, including but not limited to the Children's Online Privacy Protection Act ("COPPA").
                  </p>
                  <p className="text-muted-foreground">
                    1.3. We reserve the right to modify these Terms at any time in our sole discretion. Modifications shall be effective immediately upon posting to the Services. Your continued use of the Services following the posting of modified Terms constitutes your binding acceptance of such modifications.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">2. DESCRIPTION OF SERVICES</h2>
                  <p className="text-muted-foreground mb-3">
                    2.1. Vectabase operates a multi-faceted platform providing: (a) a digital marketplace facilitating transactions between independent sellers and buyers of digital products, scripts, game assets, and related materials; (b) code obfuscation services designed to transform source code into functionally equivalent but less readable forms; (c) whitelist management services including a Discord bot integration enabling license key validation and access control through Roblox group membership verification; (d) application programming interfaces for third-party integration; and (e) related documentation and developer resources.
                  </p>
                  <p className="text-muted-foreground">
                    2.2. The Company reserves the right, in its sole discretion, to modify, suspend, discontinue, or terminate any aspect of the Services, temporarily or permanently, at any time and without prior notice or liability to you.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">3. USER ACCOUNTS AND REGISTRATION</h2>
                  <p className="text-muted-foreground mb-3">
                    3.1. To access certain features of the Services, you must register for an account. You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate, current, and complete.
                  </p>
                  <p className="text-muted-foreground mb-3">
                    3.2. You are solely responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to immediately notify the Company of any unauthorized use of your account or any other breach of security.
                  </p>
                  <p className="text-muted-foreground">
                    3.3. The Company reserves the right to suspend or terminate your account, refuse any and all current or future use of the Services, or limit your access to the Services, for any reason at any time, including but not limited to violation of these Terms.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">4. PROHIBITED CONDUCT</h2>
                  <p className="text-muted-foreground mb-3">
                    4.1. You agree not to engage in any of the following prohibited activities: (a) uploading, transmitting, or distributing any content that contains malware, viruses, trojan horses, worms, time bombs, cancelbots, or other harmful or malicious code; (b) distributing, selling, or offering for sale any content that infringes upon the intellectual property rights, privacy rights, or other proprietary rights of any third party; (c) engaging in any fraudulent, deceptive, or misleading conduct; (d) harassing, threatening, intimidating, or abusing any other user or Company personnel; (e) attempting to gain unauthorized access to the Services, other user accounts, or computer systems or networks connected to the Services; (f) using the Services for any purpose that is unlawful or prohibited by these Terms; (g) interfering with or disrupting the integrity or performance of the Services; (h) attempting to reverse engineer, decompile, disassemble, or otherwise derive the source code of any software comprising or in any way making up a part of the Services; (i) using any automated means, including robots, crawlers, or scrapers, to access the Services without our express written permission; (j) creating multiple accounts to circumvent account restrictions, bans, or suspensions; or (k) impersonating any person or entity, or falsely stating or otherwise misrepresenting your affiliation with a person or entity.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">5. CODE OBFUSCATION SERVICES</h2>
                  <p className="text-muted-foreground mb-3">
                    5.1. The code obfuscation services are provided on an "as is" and "as available" basis. By utilizing the obfuscation services, you represent and warrant that you are the owner of, or have obtained all necessary rights and permissions to obfuscate, any code submitted to the Services.
                  </p>
                  <p className="text-muted-foreground mb-3">
                    5.2. YOU ACKNOWLEDGE AND AGREE THAT: (a) no obfuscation technique provides absolute protection against reverse engineering or decompilation; (b) the Company makes no representations or warranties regarding the effectiveness, security, or impenetrability of any obfuscation applied to your code; (c) the Company shall not be liable for any unauthorized access to, reverse engineering of, or derivation of your original source code from obfuscated output; and (d) you shall not use the obfuscation services to conceal malicious code or to circumvent the terms of service of any third-party platform.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">6. WHITELIST SYSTEM AND DISCORD BOT SERVICES</h2>
                  <p className="text-muted-foreground mb-3">
                    6.1. The whitelist management system and Discord bot services are provided to facilitate access control for digital products. You acknowledge that: (a) you are solely responsible for the configuration and management of your whitelist settings; (b) the Company is not responsible for unauthorized access resulting from misconfiguration or user error; (c) license keys are intended for single use unless expressly stated otherwise; and (d) the Company bears no responsibility for lost, stolen, shared, or compromised license keys.
                  </p>
                  <p className="text-muted-foreground mb-3">
                    6.2. Your use of the Discord bot services is subject to Discord's Terms of Service and Community Guidelines. Your use of Roblox group-based whitelisting is subject to Roblox's Terms of Use. Violation of any third-party platform's terms may result in suspension or termination of your access to the Services.
                  </p>
                  <p className="text-muted-foreground">
                    6.3. The Company does not guarantee uninterrupted availability of the Discord bot or whitelist services. Service interruptions may occur due to maintenance, updates, technical issues, or circumstances beyond our reasonable control.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">7. MARKETPLACE TRANSACTIONS</h2>
                  <p className="text-muted-foreground mb-3">
                    7.1. The Vectabase marketplace serves as a platform connecting independent sellers with buyers. THE COMPANY IS NOT A PARTY TO ANY TRANSACTION BETWEEN BUYERS AND SELLERS. Sellers are independent contractors and are not employees, agents, or representatives of the Company.
                  </p>
                  <p className="text-muted-foreground mb-3">
                    7.2. The Company does not guarantee, endorse, or assume responsibility for: (a) the quality, safety, legality, or fitness for purpose of any products listed on the marketplace; (b) the accuracy of any product descriptions or representations made by sellers; (c) the ability of sellers to complete transactions or fulfill orders; or (d) the ability of buyers to pay for purchases.
                  </p>
                  <p className="text-muted-foreground mb-3">
                    7.3. All sales conducted through the marketplace are final unless otherwise specified by the individual seller. Refund policies are established by sellers and the Company has no obligation to mediate refund disputes.
                  </p>
                  <p className="text-muted-foreground">
                    7.4. Payment processing is handled by third-party payment processors including Stripe and PayPal. Your use of these payment services is subject to their respective terms of service and privacy policies. The Company is not responsible for any errors, delays, or issues arising from payment processing.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">8. INTELLECTUAL PROPERTY</h2>
                  <p className="text-muted-foreground mb-3">
                    8.1. User Content. You retain all ownership rights in content you create and upload to the Services ("User Content"). By uploading User Content, you grant the Company a non-exclusive, worldwide, royalty-free, sublicensable, and transferable license to use, reproduce, distribute, prepare derivative works of, display, and perform the User Content solely in connection with operating and providing the Services.
                  </p>
                  <p className="text-muted-foreground mb-3">
                    8.2. Company Content. The Services, including all software, designs, text, graphics, logos, icons, images, audio clips, and the selection and arrangement thereof, are owned by the Company or its licensors and are protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, sell, or lease any part of the Services without our prior written consent.
                  </p>
                  <p className="text-muted-foreground">
                    8.3. You represent and warrant that you own or have obtained all necessary rights, licenses, consents, and permissions to upload, sell, or distribute any content through the Services, and that such content does not infringe upon the intellectual property rights of any third party.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">9. DIGITAL MILLENNIUM COPYRIGHT ACT COMPLIANCE</h2>
                  <p className="text-muted-foreground mb-3">
                    9.1. The Company respects the intellectual property rights of others and expects users to do the same. In accordance with the Digital Millennium Copyright Act of 1998 ("DMCA"), we will respond expeditiously to claims of copyright infringement committed using the Services.
                  </p>
                  <p className="text-muted-foreground mb-3">
                    9.2. To submit a DMCA takedown notice, you must contact our support team through our Discord server and provide: (a) identification of the copyrighted work claimed to have been infringed; (b) identification of the material that is claimed to be infringing and information reasonably sufficient to permit us to locate the material; (c) your contact information; (d) a statement that you have a good faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law; and (e) a statement that the information in the notification is accurate, and under penalty of perjury, that you are authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.
                  </p>
                  <p className="text-muted-foreground">
                    9.3. The Company maintains a policy of terminating, in appropriate circumstances, the accounts of users who are repeat infringers.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">10. MODERATION AND ENFORCEMENT</h2>
                  <p className="text-muted-foreground mb-3">
                    10.1. ALL MODERATION AND ENFORCEMENT DECISIONS ARE MADE AT THE SOLE AND ABSOLUTE DISCRETION OF THE COMPANY. The Company reserves the right, but has no obligation, to: (a) monitor the Services for violations of these Terms; (b) remove or disable access to any content at any time and for any reason without prior notice; (c) suspend, restrict, or terminate any user's access to all or any part of the Services; (d) withhold, delay, or refuse any payments to users who have violated these Terms; and (e) report any activity that we suspect violates any law or regulation to appropriate law enforcement officials, regulators, or other third parties.
                  </p>
                  <p className="text-muted-foreground">
                    10.2. The Company is under no obligation to provide reasons for moderation decisions or to respond to appeals. Any appeals submitted through our Discord server will be reviewed at our sole discretion, and we are not obligated to grant any appeal or reinstate any suspended or terminated account.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">11. DISCLAIMER OF WARRANTIES</h2>
                  <p className="text-muted-foreground mb-3">
                    11.1. THE SERVICES ARE PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. THE COMPANY DOES NOT WARRANT THAT THE SERVICES WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, OR FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS.
                  </p>
                  <p className="text-muted-foreground">
                    11.2. THE COMPANY MAKES NO WARRANTY REGARDING: (a) THE QUALITY, ACCURACY, TIMELINESS, TRUTHFULNESS, COMPLETENESS, OR RELIABILITY OF ANY CONTENT AVAILABLE THROUGH THE SERVICES; (b) THE RESULTS THAT MAY BE OBTAINED FROM USE OF THE SERVICES; (c) THE EFFECTIVENESS OF ANY OBFUSCATION OR SECURITY MEASURES; OR (d) ANY PRODUCTS OR SERVICES PURCHASED OR OBTAINED THROUGH THE MARKETPLACE.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">12. LIMITATION OF LIABILITY</h2>
                  <p className="text-muted-foreground mb-3">
                    12.1. TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL THE COMPANY, ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, AFFILIATES, SUCCESSORS, OR ASSIGNS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO DAMAGES FOR LOSS OF PROFITS, GOODWILL, USE, DATA, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR IN CONNECTION WITH: (a) YOUR ACCESS TO OR USE OF, OR INABILITY TO ACCESS OR USE, THE SERVICES; (b) ANY CONDUCT OR CONTENT OF ANY THIRD PARTY ON THE SERVICES; (c) ANY CONTENT OBTAINED FROM THE SERVICES; (d) UNAUTHORIZED ACCESS, USE, OR ALTERATION OF YOUR TRANSMISSIONS OR CONTENT; (e) ANY PRODUCTS OR SERVICES PURCHASED THROUGH THE MARKETPLACE; OR (f) ANY OTHER MATTER RELATING TO THE SERVICES.
                  </p>
                  <p className="text-muted-foreground">
                    12.2. IN NO EVENT SHALL THE COMPANY'S TOTAL LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THESE TERMS OR YOUR USE OF THE SERVICES EXCEED THE GREATER OF: (a) THE AMOUNTS YOU HAVE PAID TO THE COMPANY IN THE TWELVE (12) MONTHS IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM; OR (b) ONE HUNDRED UNITED STATES DOLLARS ($100.00 USD).
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">13. INDEMNIFICATION</h2>
                  <p className="text-muted-foreground">
                    You agree to indemnify, defend, and hold harmless the Company and its officers, directors, employees, agents, affiliates, successors, and assigns from and against any and all claims, damages, obligations, losses, liabilities, costs, and expenses (including but not limited to reasonable attorneys' fees) arising from: (a) your use of the Services; (b) your violation of these Terms; (c) your violation of any third-party right, including without limitation any intellectual property right, publicity right, confidentiality right, property right, or privacy right; (d) any content you upload, post, or otherwise transmit through the Services; (e) your interactions with other users; or (f) any products or services you sell through the marketplace.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">14. DISPUTE RESOLUTION AND ARBITRATION</h2>
                  <p className="text-muted-foreground mb-3">
                    14.1. PLEASE READ THIS SECTION CAREFULLY. IT AFFECTS YOUR LEGAL RIGHTS, INCLUDING YOUR RIGHT TO FILE A LAWSUIT IN COURT.
                  </p>
                  <p className="text-muted-foreground mb-3">
                    14.2. Binding Arbitration. Except for disputes that qualify for small claims court, any dispute, controversy, or claim arising out of or relating to these Terms or the Services shall be resolved by binding arbitration administered in accordance with the applicable rules of the American Arbitration Association or similar arbitration body. The arbitration shall be conducted in the English language. The arbitrator's decision shall be final and binding, and judgment on the award rendered by the arbitrator may be entered in any court having jurisdiction thereof.
                  </p>
                  <p className="text-muted-foreground mb-3">
                    14.3. Class Action Waiver. YOU AND THE COMPANY AGREE THAT EACH MAY BRING CLAIMS AGAINST THE OTHER ONLY IN YOUR OR ITS INDIVIDUAL CAPACITY AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS OR REPRESENTATIVE PROCEEDING. Unless both you and the Company agree otherwise, the arbitrator may not consolidate more than one person's claims and may not otherwise preside over any form of a representative or class proceeding.
                  </p>
                  <p className="text-muted-foreground">
                    14.4. Waiver of Jury Trial. YOU AND THE COMPANY HEREBY WAIVE ANY CONSTITUTIONAL AND STATUTORY RIGHTS TO SUE IN COURT AND HAVE A TRIAL IN FRONT OF A JUDGE OR A JURY.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">15. TERMINATION</h2>
                  <p className="text-muted-foreground mb-3">
                    15.1. The Company may terminate or suspend your access to the Services immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach these Terms.
                  </p>
                  <p className="text-muted-foreground">
                    15.2. Upon termination: (a) your right to use the Services will immediately cease; (b) the Company may delete your account and all associated data; (c) any pending payouts may be withheld if the Company determines, in its sole discretion, that you have violated these Terms; and (d) all provisions of these Terms which by their nature should survive termination shall survive, including without limitation ownership provisions, warranty disclaimers, indemnification, and limitations of liability.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">16. GENERAL PROVISIONS</h2>
                  <p className="text-muted-foreground mb-3">
                    16.1. Governing Law. These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which the Company operates, without regard to its conflict of law provisions.
                  </p>
                  <p className="text-muted-foreground mb-3">
                    16.2. Severability. If any provision of these Terms is held to be invalid, illegal, or unenforceable, such provision shall be modified to the minimum extent necessary to make it valid, legal, and enforceable while preserving its intent, or if such modification is not possible, such provision shall be severed from these Terms, and the remaining provisions shall continue in full force and effect.
                  </p>
                  <p className="text-muted-foreground mb-3">
                    16.3. Waiver. The failure of the Company to enforce any right or provision of these Terms shall not constitute a waiver of such right or provision.
                  </p>
                  <p className="text-muted-foreground mb-3">
                    16.4. Entire Agreement. These Terms, together with our <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>, constitute the entire agreement between you and the Company regarding the Services and supersede all prior and contemporaneous agreements, proposals, or representations, written or oral, concerning the subject matter hereof.
                  </p>
                  <p className="text-muted-foreground">
                    16.5. Assignment. You may not assign or transfer these Terms or your rights hereunder, in whole or in part, without the prior written consent of the Company. The Company may assign these Terms at any time without notice or consent.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">17. CONTACT INFORMATION</h2>
                  <p className="text-muted-foreground">
                    For questions regarding these Terms, DMCA notices, or other legal matters, please contact us through our Discord server by opening a support ticket, or through our <Link to="/contact" className="text-primary hover:underline">Contact Page</Link>.
                  </p>
                </section>

                <div className="border-t pt-6 mt-8">
                  <p className="text-muted-foreground text-center text-xs">
                    BY USING THE SERVICES, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THESE TERMS OF SERVICE.
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

export default TermsOfService;
