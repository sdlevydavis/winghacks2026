import { Stock } from '../types';

export interface StockDefinition {
  symbol: string;
  name: string;
  description: string;
  sector: string;
  assetType: 'Stock' | 'ETF';
}

export const STOCK_DEFINITIONS: StockDefinition[] = [
  // ── Technology ──────────────────────────────────────────────────────────────
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    description: 'Designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide.',
    sector: 'Technology',
    assetType: 'Stock',
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    description: 'Develops, licenses, and supports software, services, devices, and solutions for productivity and cloud platforms.',
    sector: 'Technology',
    assetType: 'Stock',
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    description: 'Designs and manufactures graphics processing units and system-on-chip units, powering AI, gaming, and data center workloads.',
    sector: 'Technology',
    assetType: 'Stock',
  },
  {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    description: 'Operates Google Search, YouTube, Google Cloud, and a portfolio of other technology businesses and investments.',
    sector: 'Technology',
    assetType: 'Stock',
  },
  {
    symbol: 'META',
    name: 'Meta Platforms Inc.',
    description: 'Builds social technology including Facebook, Instagram, and WhatsApp while investing in augmented and virtual reality.',
    sector: 'Technology',
    assetType: 'Stock',
  },
  {
    symbol: 'TSLA',
    name: 'Tesla Inc.',
    description: 'Designs and manufactures electric vehicles, energy storage systems, and solar products while developing autonomous driving technology.',
    sector: 'Technology',
    assetType: 'Stock',
  },
  {
    symbol: 'AMD',
    name: 'Advanced Micro Devices Inc.',
    description: 'Designs high-performance computing, graphics, and visualization technologies for servers, PCs, and gaming applications.',
    sector: 'Technology',
    assetType: 'Stock',
  },

  // ── Finance ──────────────────────────────────────────────────────────────────
  {
    symbol: 'JPM',
    name: 'JPMorgan Chase & Co.',
    description: 'Global financial services firm providing investment banking, financial services for consumers and small businesses.',
    sector: 'Finance',
    assetType: 'Stock',
  },
  {
    symbol: 'BAC',
    name: 'Bank of America Corp',
    description: 'Multinational investment bank and financial services holding company serving individual consumers and businesses.',
    sector: 'Finance',
    assetType: 'Stock',
  },
  {
    symbol: 'GS',
    name: 'Goldman Sachs Group Inc.',
    description: 'Leading global investment banking, securities, and investment management firm serving corporations, governments, and institutions.',
    sector: 'Finance',
    assetType: 'Stock',
  },
  {
    symbol: 'V',
    name: 'Visa Inc.',
    description: "Operates the world's largest retail electronic payments network, facilitating transactions between consumers, merchants, and banks.",
    sector: 'Finance',
    assetType: 'Stock',
  },
  {
    symbol: 'MA',
    name: 'Mastercard Incorporated',
    description: 'Provides payment transaction processing and related services to financial institutions and their customers globally.',
    sector: 'Finance',
    assetType: 'Stock',
  },
  {
    symbol: 'AXP',
    name: 'American Express Company',
    description: 'Provides credit card, charge card, and travel-related services to consumers, small businesses, and large corporations worldwide.',
    sector: 'Finance',
    assetType: 'Stock',
  },
  {
    symbol: 'WFC',
    name: 'Wells Fargo & Company',
    description: 'Diversified financial services company offering banking, investment, mortgage, and consumer finance products across the US.',
    sector: 'Finance',
    assetType: 'Stock',
  },

  // ── Energy ───────────────────────────────────────────────────────────────────
  {
    symbol: 'XOM',
    name: 'Exxon Mobil Corporation',
    description: 'Explores and produces crude oil and natural gas globally while operating refineries and chemical manufacturing plants.',
    sector: 'Energy',
    assetType: 'Stock',
  },
  {
    symbol: 'ENPH',
    name: 'Enphase Energy Inc.',
    description: 'Designs and manufactures microinverter-based solar and battery storage systems for the residential and commercial markets.',
    sector: 'Energy',
    assetType: 'Stock',
  },
  {
    symbol: 'CVX',
    name: 'Chevron Corporation',
    description: 'Integrated energy company engaged in oil and gas exploration, production, refining, and petrochemical manufacturing worldwide.',
    sector: 'Energy',
    assetType: 'Stock',
  },
  {
    symbol: 'NEE',
    name: 'NextEra Energy Inc.',
    description: 'Largest electric utility holding company in the US by market cap, generating energy from wind, solar, and nuclear sources.',
    sector: 'Energy',
    assetType: 'Stock',
  },
  {
    symbol: 'SLB',
    name: 'SLB (Schlumberger)',
    description: "World's largest oilfield services company, providing technology, information solutions, and integrated project management globally.",
    sector: 'Energy',
    assetType: 'Stock',
  },
  {
    symbol: 'COP',
    name: 'ConocoPhillips',
    description: 'Explores, produces, and markets crude oil, natural gas, and natural gas liquids across operations in over 13 countries.',
    sector: 'Energy',
    assetType: 'Stock',
  },
  {
    symbol: 'OXY',
    name: 'Occidental Petroleum Corporation',
    description: 'Engages in oil and gas exploration and production in the US, Middle East, and Latin America, with a growing carbon capture segment.',
    sector: 'Energy',
    assetType: 'Stock',
  },

  // ── Retail ───────────────────────────────────────────────────────────────────
  {
    symbol: 'WMT',
    name: 'Walmart Inc.',
    description: 'Operates a chain of hypermarkets, discount department stores, and grocery stores across the globe.',
    sector: 'Retail',
    assetType: 'Stock',
  },
  {
    symbol: 'AMZN',
    name: 'Amazon.com Inc.',
    description: 'Engages in e-commerce, cloud computing, digital streaming, and artificial intelligence across North America and internationally.',
    sector: 'Retail',
    assetType: 'Stock',
  },
  {
    symbol: 'COST',
    name: 'Costco Wholesale Corporation',
    description: 'Operates membership-only warehouse clubs offering bulk merchandise across grocery, electronics, and household goods categories.',
    sector: 'Retail',
    assetType: 'Stock',
  },
  {
    symbol: 'TGT',
    name: 'Target Corporation',
    description: 'Operates general merchandise and food discount stores in the US, offering a wide range of everyday essentials and apparel.',
    sector: 'Retail',
    assetType: 'Stock',
  },
  {
    symbol: 'HD',
    name: 'The Home Depot Inc.',
    description: 'Largest home improvement retailer in the US, selling building materials, tools, appliances, and home improvement products.',
    sector: 'Retail',
    assetType: 'Stock',
  },
  {
    symbol: 'NKE',
    name: 'Nike Inc.',
    description: 'Designs, markets, and sells athletic footwear, apparel, equipment, and accessories in over 190 countries worldwide.',
    sector: 'Retail',
    assetType: 'Stock',
  },
  {
    symbol: 'MCD',
    name: "McDonald's Corporation",
    description: "Operates and franchises McDonald's restaurants globally, serving approximately 69 million customers daily in over 100 countries.",
    sector: 'Retail',
    assetType: 'Stock',
  },

  // ── ETFs — Broad Market ──────────────────────────────────────────────────────
  {
    symbol: 'SPY',
    name: 'SPDR S&P 500 ETF Trust',
    description: 'Tracks the S&P 500 index, offering exposure to 500 of the largest US companies across all major sectors.',
    sector: 'Broad Market',
    assetType: 'ETF',
  },
  {
    symbol: 'QQQ',
    name: 'Invesco QQQ Trust',
    description: 'Tracks the NASDAQ-100 index, providing exposure to 100 of the largest non-financial companies listed on the NASDAQ exchange.',
    sector: 'Broad Market',
    assetType: 'ETF',
  },
  {
    symbol: 'VTI',
    name: 'Vanguard Total Stock Market ETF',
    description: 'Tracks the CRSP US Total Market Index, covering the entire US equity market including small-, mid-, and large-cap stocks.',
    sector: 'Broad Market',
    assetType: 'ETF',
  },
  {
    symbol: 'IWM',
    name: 'iShares Russell 2000 ETF',
    description: 'Tracks the Russell 2000 index of US small-cap stocks, offering broad exposure to smaller domestic companies.',
    sector: 'Broad Market',
    assetType: 'ETF',
  },

  // ── ETFs — Commodities ───────────────────────────────────────────────────────
  {
    symbol: 'GLD',
    name: 'SPDR Gold Shares',
    description: 'Tracks the spot price of gold bullion, providing investors direct exposure to gold without holding physical metal.',
    sector: 'Commodities',
    assetType: 'ETF',
  },
  {
    symbol: 'USO',
    name: 'United States Oil Fund',
    description: 'Tracks the price of West Texas Intermediate light, sweet crude oil futures contracts traded on the NYMEX.',
    sector: 'Commodities',
    assetType: 'ETF',
  },

  // ── ETFs — Fixed Income ──────────────────────────────────────────────────────
  {
    symbol: 'TLT',
    name: 'iShares 20+ Year Treasury Bond ETF',
    description: 'Tracks an index of US Treasury bonds with remaining maturities greater than 20 years, offering long-duration fixed income exposure.',
    sector: 'Fixed Income',
    assetType: 'ETF',
  },
  {
    symbol: 'BND',
    name: 'Vanguard Total Bond Market ETF',
    description: 'Tracks the Bloomberg US Aggregate Float Adjusted Index, covering investment-grade US bonds across government, corporate, and mortgage sectors.',
    sector: 'Fixed Income',
    assetType: 'ETF',
  },
];

export const TRACKED_SYMBOLS = STOCK_DEFINITIONS.map(d => d.symbol);

export function buildSkeletonStock(def: StockDefinition): Stock {
  return {
    symbol: def.symbol,
    name: def.name,
    description: def.description,
    sector: def.sector,
    assetType: def.assetType,
    currentPrice: 0,
    changePercent: 0,
    changeAmount: 0,
    historicalData: [],
  };
}
