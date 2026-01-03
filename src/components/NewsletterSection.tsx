import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { subscribeToNewsletter } from '@/lib/newsletter';
import { Mail, Loader2 } from 'lucide-react';

interface NewsletterSectionProps {
  storeId: string;
  title?: string;
  description?: string;
  buttonText?: string;
  style?: {
    backgroundColor?: string;
    textColor?: string;
    buttonColor?: string;
  };
}

export default function NewsletterSection({
  storeId,
  title = 'Stay Updated',
  description = 'Subscribe to our newsletter and be the first to know about new products and exclusive offers.',
  buttonText = 'Subscribe',
  style = {}
}: NewsletterSectionProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address.',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    const result = await subscribeToNewsletter(email, storeId);
    setIsLoading(false);

    toast({
      title: result.success ? 'Success!' : 'Error',
      description: result.message,
      variant: result.success ? 'default' : 'destructive'
    });

    if (result.success) {
      setEmail('');
    }
  };

  return (
    <div 
      className="py-16 px-4"
      style={{ 
        backgroundColor: style.backgroundColor || '#1a1f2e',
        color: style.textColor || '#e0e0e0'
      }}
    >
      <div className="max-w-2xl mx-auto text-center">
        <div className="mb-6 flex justify-center">
          <div className="p-4 rounded-full bg-cyan-500/10 border border-cyan-500/30">
            <Mail className="w-8 h-8 text-cyan-400" />
          </div>
        </div>
        
        <h2 className="text-3xl font-bold mb-4 font-mono" style={{ color: style.textColor || '#00c2ff' }}>
          {title}
        </h2>
        
        <p className="text-lg mb-8 opacity-80">
          {description}
        </p>

        <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <Input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 bg-[#0a0e1a] border-cyan-500/30 text-white placeholder:text-gray-500"
            disabled={isLoading}
          />
          <Button
            type="submit"
            disabled={isLoading}
            className="font-mono"
            style={{
              backgroundColor: style.buttonColor || '#00c2ff',
              color: '#ffffff'
            }}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Subscribing...
              </>
            ) : (
              buttonText
            )}
          </Button>
        </form>

        <p className="text-xs mt-4 opacity-60">
          We respect your privacy. Unsubscribe at any time.
        </p>
      </div>
    </div>
  );
}
