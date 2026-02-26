import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "£0",
    period: "/month",
    description: "Get started with the basics.",
    features: [
      "Up to 5 products",
      "Basic analytics",
      "Community support",
      "Standard checkout",
    ],
    cta: "Get Started",
    href: "/auth",
    highlight: false,
  },
  {
    name: "Pro",
    price: "£7",
    period: "/month",
    description: "For serious creators scaling up.",
    features: [
      "Unlimited products",
      "Advanced analytics",
      "Priority support",
      "Custom store page",
      "Stripe Connect payouts",
      "Discount codes",
    ],
    cta: "Start Pro",
    href: "/auth",
    highlight: true,
  },
  {
    name: "Pro+",
    price: "£14",
    period: "/month",
    description: "Everything in Pro, plus more power.",
    features: [
      "Everything in Pro",
      "API access",
      "Webhook integrations",
      "Developer tools",
      "Obfuscation credits (50/mo)",
      "Whitelist management",
    ],
    cta: "Start Pro+",
    href: "/auth",
    highlight: false,
  },
  {
    name: "Enterprise",
    price: "£25",
    period: "/month",
    description: "Built for teams and high-volume sellers.",
    features: [
      "Everything in Pro+",
      "Unlimited API calls",
      "Dedicated support",
      "Custom integrations",
      "Obfuscation credits (200/mo)",
      "Discord bot included",
      "SLA guarantee",
    ],
    cta: "Contact Us",
    href: "/contact",
    highlight: false,
  },
];

export default function Pricing() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navigation />

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full pointer-events-none"
          style={{ background: 'rgba(124, 58, 237, 0.08)', filter: 'blur(120px)' }} />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[18vw] font-black text-white/[0.03] select-none pointer-events-none leading-none">
          PRICE
        </span>
        <div className="relative max-w-4xl mx-auto text-center">
          <p className="text-violet-400 text-sm font-mono uppercase tracking-widest mb-4">Pricing</p>
          <h1 className="text-6xl md:text-8xl font-black leading-none mb-6">
            Simple,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-600">
              honest
            </span>{" "}
            pricing.
          </h1>
          <p className="text-white/50 text-xl max-w-xl mx-auto">
            No hidden fees. Sellers keep 95% of every sale.
          </p>
        </div>
      </section>

      {/* Plans grid */}
      <section className="px-6 pb-32">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl p-6 border transition-all duration-300 ${
                plan.highlight
                  ? "border-violet-500/60 bg-violet-950/30"
                  : "border-white/10 bg-white/[0.02] hover:border-white/20"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="text-xs font-bold uppercase tracking-widest bg-violet-600 text-white px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <p className="text-white/50 text-sm font-mono uppercase tracking-widest mb-2">{plan.name}</p>
                <div className="flex items-end gap-1 mb-2">
                  <span className="text-5xl font-black">{plan.price}</span>
                  <span className="text-white/40 text-sm mb-2">{plan.period}</span>
                </div>
                <p className="text-white/40 text-sm">{plan.description}</p>
              </div>

              <ul className="flex-1 space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-white/70">
                    <Check className="w-4 h-4 text-violet-400 mt-0.5 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link to={plan.href}>
                <button
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
                    plan.highlight
                      ? "bg-violet-600 hover:bg-violet-500 text-white"
                      : "border border-white/20 hover:border-violet-500/50 hover:bg-violet-950/30 text-white"
                  }`}
                >
                  {plan.cta}
                </button>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ / note */}
      <section className="px-6 pb-32 border-t border-white/10">
        <div className="max-w-3xl mx-auto pt-20 text-center">
          <p className="text-violet-400 text-sm font-mono uppercase tracking-widest mb-4">Questions?</p>
          <h2 className="text-4xl font-black mb-4">Still not sure?</h2>
          <p className="text-white/50 mb-8">All plans include a 14-day free trial. No credit card required to start.</p>
          <Link to="/contact">
            <button className="magnet-btn magnet-btn-outline px-8 py-4 text-base font-semibold">
              <span className="magnet-btn-content">Talk to us</span>
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
}
