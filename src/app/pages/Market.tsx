import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { TrendingUp, TrendingDown, Search, Loader2 } from 'lucide-react';
import { useStocks } from '../context/StocksContext';
import { fetchSymbolList, FinnhubSymbol } from '../utils/finnhubApi';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { motion } from 'motion/react';

export function Market() {
  const { stocks, isLoading, error } = useStocks();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSector, setFilterSector] = useState<string>('All');

  const [symbolList, setSymbolList] = useState<FinnhubSymbol[]>([]);
  const [symbolListLoading, setSymbolListLoading] = useState(false);

  const isSearching = searchQuery.trim().length > 0;

  // Lazy-load the full symbol list on first keystroke
  useEffect(() => {
    if (!isSearching || symbolList.length > 0) return;
    setSymbolListLoading(true);
    fetchSymbolList()
      .then(setSymbolList)
      .catch(() => {})
      .finally(() => setSymbolListLoading(false));
  }, [isSearching, symbolList.length]);

  const sectors = ['All', ...Array.from(new Set(stocks.map(s => s.sector)))];

  // Full-universe search results (when user is typing)
  const searchResults: FinnhubSymbol[] = isSearching
    ? symbolList
        .filter(s =>
          s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.description.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 25)
    : [];

  // Curated stocks filtered by sector (shown when search is empty)
  const filteredStocks = !isSearching
    ? stocks.filter(s => filterSector === 'All' || s.sector === filterSector)
    : [];

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-2xl font-bold mb-2">Market</h2>
        <p className="text-gray-600">Search any stock or browse featured picks</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          type="text"
          placeholder="Search all stocks (e.g. TSLA, Tesla)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Sector filter — only when not searching */}
      {!isSearching && (
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
      )}

      {/* Error banner (curated stocks only) */}
      {error && !isSearching && (
        <Card className="p-3 bg-amber-50 border-amber-200">
          <p className="text-amber-700 text-sm">{error}</p>
        </Card>
      )}

      {/* ── Search results ── */}
      {isSearching ? (
        <div className="space-y-3">
          {symbolListLoading ? (
            <>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading market data…</span>
              </div>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-[64px] bg-gray-200 rounded-xl animate-pulse" />
              ))}
            </>
          ) : searchResults.length > 0 ? (
            searchResults.map((result, index) => (
              <motion.div
                key={result.symbol}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Link
                  to={`/stock/${result.symbol}`}
                  state={{ name: result.description }}
                >
                  <Card className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-gray-900 text-lg">{result.symbol}</span>
                        <p className="text-sm text-gray-600 truncate">{result.description}</p>
                      </div>
                      <span className="ml-3 shrink-0 text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                        {result.type}
                      </span>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))
          ) : (
            <Card className="p-8 text-center">
              <p className="text-gray-500">No stocks found matching "{searchQuery}"</p>
            </Card>
          )}
        </div>
      ) : (
        /* ── Curated stock list ── */
        isLoading ? (
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-[72px] bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
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
                <p className="text-gray-500">No stocks found</p>
              </Card>
            )}
          </div>
        )
      )}
    </div>
  );
}
