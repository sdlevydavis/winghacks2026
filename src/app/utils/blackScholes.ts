// Abramowitz & Stegun approximation of the cumulative normal distribution
function normalCDF(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
  return 0.5 * (1.0 + sign * y);
}

/**
 * Black-Scholes option pricing.
 * @param S  Current stock price
 * @param K  Strike price
 * @param T  Time to expiry in years
 * @param r  Risk-free rate (e.g. 0.05)
 * @param sigma  Annualised volatility (e.g. 0.30)
 * @param type   'call' or 'put'
 * @returns option premium per share/contract
 */
export function blackScholes(
  S: number, K: number, T: number, r: number, sigma: number,
  type: 'call' | 'put'
): number {
  if (T <= 0) return Math.max(0, type === 'call' ? S - K : K - S);
  const d1 = (Math.log(S / K) + (r + (sigma * sigma) / 2) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  if (type === 'call') {
    return S * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2);
  } else {
    return K * Math.exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1);
  }
}

/**
 * Black-Scholes Delta (sensitivity of option price to underlying price).
 * Useful for educational display.
 */
export function delta(
  S: number, K: number, T: number, r: number, sigma: number,
  type: 'call' | 'put'
): number {
  if (T <= 0) return type === 'call' ? (S >= K ? 1 : 0) : (S <= K ? -1 : 0);
  const d1 = (Math.log(S / K) + (r + (sigma * sigma) / 2) * T) / (sigma * Math.sqrt(T));
  return type === 'call' ? normalCDF(d1) : normalCDF(d1) - 1;
}

/**
 * Compute annualised historical volatility from a series of closing prices.
 * Falls back to 0.30 (30%) if insufficient data.
 */
export function historicalVolatility(closePrices: number[]): number {
  if (closePrices.length < 2) return 0.30;
  const returns: number[] = [];
  for (let i = 1; i < closePrices.length; i++) {
    if (closePrices[i - 1] > 0) {
      returns.push(Math.log(closePrices[i] / closePrices[i - 1]));
    }
  }
  if (returns.length < 2) return 0.30;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (returns.length - 1);
  return Math.sqrt(variance * 252); // annualise from daily returns
}
