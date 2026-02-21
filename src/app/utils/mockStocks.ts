import { Stock } from '../types';

// Generate realistic historical data for the past 30 days
function generateHistoricalData(basePrice: number, volatility: number): { time: string; price: number }[] {
  const data: { time: string; price: number }[] = [];
  let price = basePrice;
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const timeStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    // Random walk with slight upward bias
    const change = (Math.random() - 0.48) * volatility;
    price = Math.max(price * (1 + change), 0.01);
    
    data.push({ time: timeStr, price: parseFloat(price.toFixed(2)) });
  }
  
  return data;
}

export function getMockStocks(): Stock[] {
  const stocks: Stock[] = [
    {
      symbol: 'TECH',
      name: 'TechGiant Inc.',
      currentPrice: 145.32,
      changePercent: 2.45,
      changeAmount: 3.47,
      historicalData: [],
      description: 'Leading technology company specializing in cloud computing and AI solutions.',
      sector: 'Technology'
    },
    {
      symbol: 'INNOV',
      name: 'Innovation Labs',
      currentPrice: 78.90,
      changePercent: -1.23,
      changeAmount: -0.98,
      historicalData: [],
      description: 'Cutting-edge research and development in renewable energy and biotech.',
      sector: 'Technology'
    },
    {
      symbol: 'BANK',
      name: 'Global Bank Corp',
      currentPrice: 52.15,
      changePercent: 0.87,
      changeAmount: 0.45,
      historicalData: [],
      description: 'International banking institution with a focus on digital banking solutions.',
      sector: 'Finance'
    },
    {
      symbol: 'INVEST',
      name: 'WealthBuilder',
      currentPrice: 112.50,
      changePercent: 1.65,
      changeAmount: 1.83,
      historicalData: [],
      description: 'Investment management firm providing portfolio services to individuals and institutions.',
      sector: 'Finance'
    },
    {
      symbol: 'ENERGY',
      name: 'PowerCore Energy',
      currentPrice: 89.25,
      changePercent: -0.45,
      changeAmount: -0.40,
      historicalData: [],
      description: 'Traditional energy company transitioning to renewable power sources.',
      sector: 'Energy'
    },
    {
      symbol: 'SOLAR',
      name: 'SunTech Solutions',
      currentPrice: 34.60,
      changePercent: 3.87,
      changeAmount: 1.29,
      historicalData: [],
      description: 'Solar panel manufacturer and installer with global operations.',
      sector: 'Energy'
    },
    {
      symbol: 'SHOP',
      name: 'MegaMart Retail',
      currentPrice: 156.75,
      changePercent: 0.32,
      changeAmount: 0.50,
      historicalData: [],
      description: 'Large retail chain with both physical stores and e-commerce presence.',
      sector: 'Retail'
    },
    {
      symbol: 'ECOM',
      name: 'ShopOnline',
      currentPrice: 201.40,
      changePercent: -2.15,
      changeAmount: -4.43,
      historicalData: [],
      description: 'Pure-play e-commerce platform revolutionizing online shopping.',
      sector: 'Retail'
    }
  ];

  // Generate historical data for each stock
  return stocks.map(stock => ({
    ...stock,
    historicalData: generateHistoricalData(stock.currentPrice, 0.03)
  }));
}

// Simulate real-time price updates
export function updateStockPrice(stock: Stock): Stock {
  const volatility = 0.002; // 0.2% max change per update
  const change = (Math.random() - 0.5) * volatility;
  const newPrice = parseFloat((stock.currentPrice * (1 + change)).toFixed(2));
  const changeAmount = parseFloat((newPrice - stock.currentPrice).toFixed(2));
  const changePercent = parseFloat(((changeAmount / stock.currentPrice) * 100).toFixed(2));

  return {
    ...stock,
    currentPrice: newPrice,
    changeAmount: stock.changeAmount + changeAmount,
    changePercent: parseFloat((((stock.currentPrice + stock.changeAmount - stock.currentPrice) / stock.currentPrice) * 100).toFixed(2))
  };
}
