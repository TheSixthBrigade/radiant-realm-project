import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Currency = 'USD' | 'GBP';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  convertPrice: (priceUSD: number) => number;
  formatPrice: (priceUSD: number) => string;
  exchangeRate: number;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const EXCHANGE_RATES: Record<Currency, number> = {
  USD: 1,
  GBP: 0.79, // 1 USD = 0.79 GBP (approximate)
};

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  GBP: '£',
};

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<Currency>('USD');
  const [exchangeRate, setExchangeRate] = useState(1);

  useEffect(() => {
    setExchangeRate(EXCHANGE_RATES[currency]);
  }, [currency]);

  const convertPrice = (priceUSD: number): number => {
    return priceUSD * exchangeRate;
  };

  const formatPrice = (priceUSD: number): string => {
    const converted = convertPrice(priceUSD);
    const symbol = CURRENCY_SYMBOLS[currency];
    return `${symbol}${converted.toFixed(2)}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, convertPrice, formatPrice, exchangeRate }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within CurrencyProvider');
  }
  return context;
}
