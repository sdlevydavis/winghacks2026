import { useState } from 'react';
import { Link } from 'react-router';
import { TrendingUp, TrendingDown, Search } from 'lucide-react';
import { getMockStocks } from '../utils/mockStocks';
import { Stock } from '../types';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { motion } from 'motion/react';

export function Market() {
  const [stocks] = useState<Stock[]>(getMockStocks());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSector, setFilterSector] = useState<string>('All');

  const sectors = ['All', ...Array.from(new Set(stocks.map(s => s.sector)))];

  const filteredStocks = stocks.filter(stock => {
    const matchesSearch = stock.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         stock.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSector = filterSector === 'All' || stock.sector === filterSector;
    return matchesSearch && matchesSector;
  });

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-2xl font-bold mb-2">Market</h2>
        <p className="text-gray-600">Explore and invest in trending stocks</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          type="text"
          placeholder="Search stocks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Sector Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
        {sectors.map(sector => (
          <button
            key={sector}
            onClick={() => setFilterSector(sector)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filterSector === sector
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {sector}
          </button>
        ))}
      </div>

      {/* Stock List */}
      <div className="space-y-3">
        {filteredStocks.map((stock, index) => {
          const isPositive = stock.changePercent >= 0;
          
          return (
            <motion.div
              key={stock.symbol}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link to={`/stock/${stock.symbol}`}>
                <Card className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-gray-900 text-lg">{stock.symbol}</span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {stock.sector}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{stock.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900 text-lg">
                        ${stock.currentPrice.toFixed(2)}
                      </p>
                      <div className={`flex items-center gap-1 justify-end ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        <span className="text-sm font-medium">
                          {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            </motion.div>
          );
        })}

        {filteredStocks.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-gray-500">No stocks found matching your search</p>
          </Card>
        )}
      </div>
    </div>
  );
}
