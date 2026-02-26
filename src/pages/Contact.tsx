import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, MessageSquare, Clock, ArrowUpRight } from "lucide-react";
import Navigation from "@/components/Navigation";
import { SEO, BreadcrumbSchema, FAQSchema } from "@/components/SEO";

const Contact = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  const faqQuestions = [
    { question: "How do I become a creator?", answer: "Simply sign up, complete your profile, and start uploading your assets. Our team reviews submissions to ensure quality standards." },
    { question: "What's the revenue share?", answer: "Creators keep 80% of their earnings. We handle all payment processing, hosting, and customer support." },
    { question: "How do refunds work?", answer: "We offer a 30-day refund policy for purchases. Contact our support team if you're not satisfied with your purchase." },
    { question: "Can I use assets commercially?", answer: "Yes! All assets come with commercial licensing unless otherwise specified. Check the license details on each product page." }
  ];

  const contactCards = [
    { icon: Mail, label: "Email", value: "hello@vectabase.com", sub: "Reply within 24 hours" },
    { icon: MessageSquare, label: "Discord", value: "discord.gg/vectabase", sub: "Community & live support" },
    { icon: Clock, label: "Hours", value: "Mon–Fri, 9–6 EST", sub: "We're pretty responsive" },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <SEO
        title="Contact Us"
        description="Get in touch with Vectabase. Contact our support team for help with purchases, creator support, technical issues, or business partnerships."
        url="/contact"
        keywords="contact, support, help, customer service, Vectabase support"
      />
      <BreadcrumbSchema items={[{ name: 'Home', url: '/' }, { name: 'Contact', url: '/contact' }]} />
      <FAQSchema questions={faqQuestions} />

      <Navigation />

      {/* Hero */}
      <section className="relative pt-32 pb-16 px-6 overflow-hidden">
        {/* Ghost watermark */}
        <div className="absolute inset-0 flex items-center justify-start pl-4 pointer-events-none select-none overflow-hidden">
          <span className="text-[18vw] font-black leading-none tracking-tighter whitespace-nowrap"
            style={{ color: 'transparent', WebkitTextStroke: '1.5px rgba(255,255,255,0.04)', fontFamily: "'Arial Rounded MT Bold', sans-serif" }}>
            CONTACT
          </span>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <p className="text-violet-400 text-xs uppercase tracking-widest mb-4 font-medium">Get in touch</p>
          <h1 className="text-6xl md:text-8xl font-black leading-none tracking-tight mb-6"
            style={{ fontFamily: "'Arial Rounded MT Bold', sans-serif" }}>
            Let's<br />
            <span style={{ color: 'transparent', WebkitTextStroke: '2px rgba(255,255,255,0.3)' }}>talk.</span>
          </h1>
          <p className="text-white/40 text-lg max-w-md">
            Questions, feedback, or just want to say hi — we're here.
          </p>
        </div>
      </section>

      {/* Main content */}
      <section className="px-6 pb-24">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-12">

          {/* Form — spans 2 cols */}
          <div className="lg:col-span-2">
            <div className="border border-white/[0.07] rounded-2xl p-8 bg-[#0a0a0a]">
              <h2 className="text-xl font-black mb-8 text-white/80" style={{ fontFamily: "'Arial Rounded MT Bold', sans-serif" }}>
                Send a message
              </h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName" className="text-white/40 text-xs uppercase tracking-wider mb-2 block">First Name</Label>
                    <Input id="firstName" type="text" placeholder="John" required
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-violet-500 rounded-xl h-12" />
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-white/40 text-xs uppercase tracking-wider mb-2 block">Last Name</Label>
                    <Input id="lastName" type="text" placeholder="Doe" required
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-violet-500 rounded-xl h-12" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email" className="text-white/40 text-xs uppercase tracking-wider mb-2 block">Email</Label>
                  <Input id="email" type="email" placeholder="you@example.com" required
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-violet-500 rounded-xl h-12" />
                </div>

                <div>
                  <Label className="text-white/40 text-xs uppercase tracking-wider mb-2 block">Topic</Label>
                  <Select>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-xl h-12">
                      <SelectValue placeholder="Select a topic" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#111] border-white/10 text-white">
                      <SelectItem value="general">General Inquiry</SelectItem>
                      <SelectItem value="support">Technical Support</SelectItem>
                      <SelectItem value="creator">Creator Support</SelectItem>
                      <SelectItem value="business">Business Partnership</SelectItem>
                      <SelectItem value="bug">Bug Report</SelectItem>
                      <SelectItem value="feature">Feature Request</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="message" className="text-white/40 text-xs uppercase tracking-wider mb-2 block">Message</Label>
                  <Textarea id="message" placeholder="Tell us how we can help..." required
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-violet-500 rounded-xl min-h-[140px] resize-none" />
                </div>

                <button type="submit" disabled={isLoading}
                  className="magnet-btn magnet-btn-primary px-8 h-12 rounded-xl text-sm font-semibold disabled:opacity-50">
                  <span className="magnet-btn-content flex items-center gap-2">
                    {isLoading ? "Sending..." : <>Send Message <ArrowUpRight className="w-4 h-4" /></>}
                  </span>
                </button>
              </form>
            </div>
          </div>

          {/* Contact info — right col */}
          <div className="space-y-4">
            {contactCards.map(({ icon: Icon, label, value, sub }) => (
              <div key={label} className="border border-white/[0.07] rounded-2xl p-6 bg-[#0a0a0a] hover:border-violet-500/30 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-white/30 text-xs uppercase tracking-wider mb-1">{label}</p>
                    <p className="text-white font-semibold text-sm mb-1">{value}</p>
                    <p className="text-white/40 text-xs">{sub}</p>
                  </div>
                </div>
              </div>
            ))}

            {/* Violet CTA box */}
            <div className="rounded-2xl p-6 mt-4"
              style={{ background: 'linear-gradient(135deg, #4c1d95, #7c3aed)' }}>
              <p className="text-white/60 text-xs uppercase tracking-wider mb-2">For creators</p>
              <p className="text-white font-black text-lg mb-3" style={{ fontFamily: "'Arial Rounded MT Bold', sans-serif" }}>
                Ready to start selling?
              </p>
              <p className="text-white/60 text-xs mb-4">Set up your store in minutes and reach thousands of buyers.</p>
              <a href="/auth?creator=true"
                className="magnet-btn magnet-btn-outline px-5 h-9 rounded-lg text-xs font-semibold inline-flex">
                <span className="magnet-btn-content">Get Started</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 pb-24 border-t border-white/[0.05]">
        <div className="max-w-7xl mx-auto pt-16">
          <p className="text-violet-400 text-xs uppercase tracking-widest mb-3 font-medium">FAQ</p>
          <h2 className="text-4xl font-black mb-12 text-white" style={{ fontFamily: "'Arial Rounded MT Bold', sans-serif" }}>
            Common questions.
          </h2>

          <div className="max-w-2xl space-y-0">
            {faqQuestions.map((faq, i) => (
              <div key={i} className="border-b border-white/[0.07]">
                <button
                  className="w-full flex items-center justify-between py-5 text-left group"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-violet-500/50 text-xs font-mono w-6">{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-white/80 font-medium text-sm group-hover:text-white transition-colors">{faq.question}</span>
                  </div>
                  <span className="text-white/30 text-lg ml-4 flex-shrink-0 transition-transform duration-200"
                    style={{ transform: openFaq === i ? 'rotate(45deg)' : 'rotate(0deg)' }}>+</span>
                </button>
                {openFaq === i && (
                  <p className="text-white/40 text-sm pb-5 pl-10 leading-relaxed">{faq.answer}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
