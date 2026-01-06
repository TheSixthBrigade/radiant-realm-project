import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SuccessCelebrationProps {
  onContinue?: () => void;
}

const SuccessCelebration = ({ onContinue }: SuccessCelebrationProps) => {
  const navigate = useNavigate();
  const [confettiPieces, setConfettiPieces] = useState<Array<{
    id: number;
    left: number;
    delay: number;
    duration: number;
    color: string;
  }>>([]);

  useEffect(() => {
    // Generate confetti pieces
    const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];
    const pieces = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 2 + Math.random() * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    setConfettiPieces(pieces);
  }, []);

  const handleContinue = () => {
    if (onContinue) {
      onContinue();
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="relative overflow-hidden">
      {/* Confetti Animation */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {confettiPieces.map((piece) => (
          <div
            key={piece.id}
            className="absolute w-3 h-3 rounded-sm animate-confetti"
            style={{
              left: `${piece.left}%`,
              backgroundColor: piece.color,
              animationDelay: `${piece.delay}s`,
              animationDuration: `${piece.duration}s`,
            }}
          />
        ))}
      </div>

      {/* Success Content */}
      <div className="text-center py-8 relative z-10">
        <div className="relative inline-block mb-6">
          <div className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center mx-auto animate-pulse">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
          </div>
          <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-yellow-500 animate-bounce" />
          <Sparkles className="absolute -bottom-2 -left-2 w-6 h-6 text-blue-500 animate-bounce" style={{ animationDelay: '0.2s' }} />
        </div>

        <h2 className="text-3xl font-bold mb-3 gradient-text">
          You're All Set! 🎉
        </h2>
        
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Congratulations! Your seller account is now fully set up. You can start uploading products and earning money on Vectabase.
        </p>

        <div className="space-y-4">
          <Button 
            size="lg" 
            onClick={handleContinue}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            Go to Dashboard
            <ArrowRight className="w-4 h-4" />
          </Button>
          
          <p className="text-sm text-muted-foreground">
            Ready to upload your first product?
          </p>
        </div>
      </div>

      {/* CSS for confetti animation */}
      <style>{`
        @keyframes confetti {
          0% {
            transform: translateY(-10px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(400px) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti linear forwards;
        }
      `}</style>
    </div>
  );
};

export default SuccessCelebration;
