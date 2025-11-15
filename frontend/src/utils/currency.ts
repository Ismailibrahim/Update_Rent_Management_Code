// Currency utility functions for the rental management system

export const CURRENCIES = {
  MVR: { 
    code: 'MVR', 
    symbol: 'MVR', 
    name: 'Maldivian Rufiyaa',
    rate: 1 // Base currency
  },
  USD: { 
    code: 'USD', 
    symbol: '$', 
    name: 'US Dollar',
    rate: 15.42 // Approximate rate to MVR
  },
  EUR: { 
    code: 'EUR', 
    symbol: '€', 
    name: 'Euro',
    rate: 16.85 // Approximate rate to MVR
  }
};

// Format currency amount with symbol
export const formatCurrency = (amount: number | string, currency: string = 'MVR') => {
  const currencyInfo = CURRENCIES[currency as keyof typeof CURRENCIES];
  if (!currencyInfo) return `${amount}`;
  
  return `${currencyInfo.symbol} ${parseFloat(amount.toString()).toLocaleString()}`;
};

// Convert amount from one currency to another
export const convertCurrency = (amount: number | string, fromCurrency: string, toCurrency: string = 'MVR') => {
  const fromRate = CURRENCIES[fromCurrency as keyof typeof CURRENCIES]?.rate || 1;
  const toRate = CURRENCIES[toCurrency as keyof typeof CURRENCIES]?.rate || 1;
  
  // Convert to base currency (MVR) first, then to target currency
  const baseAmount = parseFloat(amount.toString()) * fromRate;
  return baseAmount / toRate;
};

// Get currency options for dropdowns
export const getCurrencyOptions = () => {
  return Object.values(CURRENCIES).map(currency => ({
    value: currency.code,
    label: `${currency.code} (${currency.name})`
  }));
};

// Get currency info by code
export const getCurrencyInfo = (currencyCode: string) => {
  return CURRENCIES[currencyCode as keyof typeof CURRENCIES] || CURRENCIES.MVR;
};

// Validate currency code
export const isValidCurrency = (currencyCode: string) => {
  return Object.keys(CURRENCIES).includes(currencyCode);
};
