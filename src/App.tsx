import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/theme-provider";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { ThemeProvider as StyleThemeProvider } from "@/contexts/ThemeContext";
import KineticLoadingScreen from "@/components/KineticLoadingScreen";
import PageTransitionLoader from "@/components/PageTransitionLoader";
import Index from "./pages/Index";
import Shop from "./pages/Shop";
import ProductDetail from "./pages/ProductDetail";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Creators from "./pages/Creators";
import About from "./pages/About";
import Contact from "./pages/Contact";
import AddProduct from "./pages/AddProduct";
import CreateStore from "./pages/CreateStore";
import StorePage from "./pages/StorePage";
import StoreManagement from "./pages/StoreManagement";
import AdminPanel from "./pages/AdminPanel";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentFailure from "./pages/PaymentFailure";
import Checkout from "./pages/Checkout";
import Downloads from "./pages/Downloads";
import UserSite from "./pages/UserSite";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Check if user has seen loading screen in this session
    const hasSeenLoading = sessionStorage.getItem('hasSeenLoading');
    if (hasSeenLoading) {
      setIsLoading(false);
      setShowContent(true);
    }
  }, []);

  const handleLoadingComplete = () => {
    sessionStorage.setItem('hasSeenLoading', 'true');
    setIsLoading(false);
    setTimeout(() => setShowContent(true), 100);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="vectabse-theme">
        <StyleThemeProvider>
          <AuthProvider>
            <CurrencyProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              {isLoading && <KineticLoadingScreen onComplete={handleLoadingComplete} />}
              {showContent && (
                <BrowserRouter>
                  <PageTransitionLoader />
                  <Routes>
                    <Route path="/" element={<Index />} />
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
                    <Route path="/site/:slug" element={<UserSite />} />
                    <Route path="/creator/:slug" element={<UserSite />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </BrowserRouter>
              )}
            </TooltipProvider>
          </CurrencyProvider>
        </AuthProvider>
        </StyleThemeProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
