import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/theme-provider";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { ThemeProvider as StyleThemeProvider } from "@/contexts/ThemeContext";
import PageTransitionLoader from "@/components/PageTransitionLoader";
import { useVisitorTracking } from "@/hooks/useVisitorTracking";
import { lazy, Suspense } from "react";

// Eager load critical pages
import IndexRevamped from "./pages/IndexRevamped";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Old homepage for comparison
const IndexOld = lazy(() => import("./pages/Index"));

// Lazy load non-critical pages for better initial load
const Shop = lazy(() => import("./pages/Shop"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Creators = lazy(() => import("./pages/Creators"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const AddProduct = lazy(() => import("./pages/AddProduct"));
const CreateStore = lazy(() => import("./pages/CreateStore"));
const StorePage = lazy(() => import("./pages/StorePage"));
const StoreManagement = lazy(() => import("./pages/StoreManagement"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentFailure = lazy(() => import("./pages/PaymentFailure"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Downloads = lazy(() => import("./pages/Downloads"));
const UserSite = lazy(() => import("./pages/UserSite"));
const Developer = lazy(() => import("./pages/Developer"));
const DeveloperObfuscator = lazy(() => import("./pages/DeveloperObfuscator"));
const DeveloperWhitelist = lazy(() => import("./pages/DeveloperWhitelist"));
const DeveloperDocs = lazy(() => import("./pages/DeveloperDocs"));
const DeveloperAPI = lazy(() => import("./pages/DeveloperAPI"));
const DeveloperBotDashboard = lazy(() => import("./pages/DeveloperBotDashboard"));
const StoreAnalytics = lazy(() => import("./pages/StoreAnalytics"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const DynamicUserRoute = lazy(() => import("./pages/DynamicUserRoute"));
const Onboarding = lazy(() => import("./pages/Onboarding"));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-900">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
  </div>
);

// Optimized QueryClient with caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes - data stays fresh
      gcTime: 1000 * 60 * 30, // 30 minutes - cache retention (formerly cacheTime)
      refetchOnWindowFocus: false, // Don't refetch on tab focus
      retry: 2, // Retry failed requests twice
      refetchOnMount: false, // Don't refetch if data exists
    },
  },
});

const App = () => {
  // Track visitor sessions for analytics
  useVisitorTracking();
  
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="vectabase-theme">
        <StyleThemeProvider>
          <AuthProvider>
            <CurrencyProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <PageTransitionLoader />
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<IndexRevamped />} />
                    <Route path="/old" element={<IndexOld />} />
                    <Route path="/shop" element={<Shop />} />
                    <Route path="/product/:id" element={<ProductDetail />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/creators" element={<Creators />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/add-product" element={<AddProduct />} />
                    <Route path="/create-store" element={<CreateStore />} />
                    <Route path="/store/:storeSlug" element={<StorePage />} />
                    <Route path="/store-management" element={<StoreManagement />} />
                    <Route path="/admin" element={<AdminPanel />} />
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/downloads" element={<Downloads />} />
                    <Route path="/payment-success" element={<PaymentSuccess />} />
                    <Route path="/payment-failure" element={<PaymentFailure />} />
                    {/* Legacy /site routes - redirect to new direct URLs */}
                    <Route path="/site/:slug" element={<UserSite />} />
                    <Route path="/site/:slug/roadmap/:productId" element={<UserSite />} />
                    <Route path="/site/:slug/:pageType" element={<UserSite />} />
                    {/* Legacy /creator routes */}
                    <Route path="/creator/:slug" element={<UserSite />} />
                    <Route path="/creator/:slug/roadmap/:productId" element={<UserSite />} />
                    <Route path="/creator/:slug/:pageType" element={<UserSite />} />
                    <Route path="/developer" element={<Developer />} />
                    <Route path="/developer/obfuscator" element={<DeveloperObfuscator />} />
                    <Route path="/developer/whitelist" element={<DeveloperWhitelist />} />
                    <Route path="/developer/docs" element={<DeveloperDocs />} />
                    <Route path="/developer/api" element={<DeveloperAPI />} />
                    <Route path="/developer/bot" element={<DeveloperBotDashboard />} />
                    <Route path="/analytics" element={<StoreAnalytics />} />
                    <Route path="/onboarding" element={<Onboarding />} />
                    <Route path="/tos" element={<TermsOfService />} />
                    <Route path="/privacy" element={<PrivacyPolicy />} />
                    {/* Direct username routes (like Payhip) - must be after all system routes */}
                    <Route path="/:username" element={<DynamicUserRoute />} />
                    <Route path="/:username/roadmap/:productId" element={<DynamicUserRoute />} />
                    <Route path="/:username/:pageType" element={<DynamicUserRoute />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </TooltipProvider>
          </CurrencyProvider>
        </AuthProvider>
        </StyleThemeProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
