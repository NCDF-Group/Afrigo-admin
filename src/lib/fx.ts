const USD_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  NGN: 1600,
  GHS: 15,
  KES: 129,
  ZAR: 18,
  EGP: 49,
  MAD: 9.9,
  XOF: 604,
  XAF: 604,
  ETB: 120,
  TZS: 2700,
  UGX: 3750,
  RWF: 1380,
  ZMW: 27,
  DZD: 134,
  TND: 3.1
}

export const toUsd = (amount: unknown, currency: unknown) => {
  const value = Number(amount)
  if (!Number.isFinite(value)) return 0
  const rate = USD_RATES[String(currency || 'USD').toUpperCase()] ?? 1
  return value / rate
}
