import { useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { XCircle, ArrowLeft, RefreshCw } from "lucide-react";
import Navigation from "@/components/Navigation";

const PaymentFailure = () => {
  const [searchParams] = useSearchParams();
  const error = searchParams.get('error');

  const handleRetry = () => {
    // Go back to the previous page or shop
    window.history.back();
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <div className="container mx-auto px-6 pt-24 pb-12">
        <div className="max-w-2xl mx-auto">
          <Card className="glass p-8 text-center">
            <div className="mb-6">
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-3xl font-bold mb-2">Payment Failed</h1>
              <p className="text-muted-foreground text-lg">
                We couldn't process your payment. Please try again.
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                <p className="text-red-800 dark:text-red-200 text-sm">
                  Error: {error}
                </p>
              </div>
            )}

            <div className="space-y-4 mb-8">
              <div className="p-4 border rounded-lg text-left">
                <h3 className="font-semibold mb-2">Common reasons for payment failure:</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Insufficient funds in your account</li>
                  <li>• Incorrect card details</li>
                  <li>• Card expired or blocked</li>
                  <li>• Network connection issues</li>
                </ul>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={handleRetry} className="flex-1 sm:flex-none">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              
              <Button asChild variant="outline" className="flex-1 sm:flex-none">
                <Link to="/shop">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Shop
                </Link>
              </Button>
            </div>

            <div className="mt-8 pt-6 border-t">
              <p className="text-sm text-muted-foreground">
                Still having issues? <Link to="/contact" className="text-primary hover:underline">Contact Support</Link>
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailure;