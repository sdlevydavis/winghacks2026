import { Stock } from '../types';

export interface StockDefinition {
  symbol: string;
  name: string;
  description: string;
  sector: string;
}

export const STOCK_DEFINITIONS: StockDefinition[] = [
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    description: 'Designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide.',
    sector: 'Technology',
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    description: 'Develops, licenses, and supports software, services, devices, and solutions for productivity and cloud platforms.',
    sector: 'Technology',
  },
  {
    symbol: 'JPM',
    name: 'JPMorgan Chase & Co.',
    description: 'Global financial services firm providing investment banking, financial services for consumers and small businesses.',
    sector: 'Finance',
  },
  {
    symbol: 'BAC',
    name: 'Bank of America Corp',
    description: 'Multinational investment bank and financial services holding company serving individual consumers and businesses.',
    sector: 'Finance',
  },
  {
    symbol: 'XOM',
    name: 'Exxon Mobil Corporation',
    description: 'Explores and produces crude oil and natural gas globally while operating refineries and chemical manufacturing plants.',
    sector: 'Energy',
  },
  {
    symbol: 'ENPH',
    name: 'Enphase Energy Inc.',
    description: 'Designs and manufactures microinverter-based solar and battery storage systems for the residential and commercial markets.',
    sector: 'Energy',
  },
  {
    symbol: 'WMT',
    name: 'Walmart Inc.',
    description: 'Operates a chain of hypermarkets, discount department stores, and grocery stores across the globe.',
    sector: 'Retail',
  },
  {
    symbol: 'AMZN',
    name: 'Amazon.com Inc.',
    description: 'Engages in e-commerce, cloud computing, digital streaming, and artificial intelligence across North America and internationally.',
    sector: 'Retail',
  },
];

export const TRACKED_SYMBOLS = STOCK_DEFINITIONS.map(d => d.symbol);

export function buildSkeletonStock(def: StockDefinition): Stock {
  return {
    symbol: def.symbol,
    name: def.name,
    description: def.description,
    sector: def.sector,
    currentPrice: 0,
    changePercent: 0,
    changeAmount: 0,
    historicalData: [],
  };
}
