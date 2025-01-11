import React, { useState, useEffect } from 'react';
import { Download, BarChart3, Moon, Sun } from 'lucide-react';
import Timeline from './components/Timeline';
import CountrySelector from './components/CountrySelector';
import { fetchGDPData, fetchCountries } from './services/worldBankAPI';
import type { CountryData } from './types';
import { motion, AnimatePresence } from 'framer-motion';

// Sample leader data (in production, this would come from an API)
const SAMPLE_LEADERS = {
  USA: [
    {
      name: "Jimmy Carter",
      party: "Democratic",
      startYear: 1980,
      endYear: 1981,
      policies: ["Energy policy", "Deregulation"]
    },
    {
      name: "Ronald Reagan",
      party: "Republican",
      startYear: 1981,
      endYear: 1989,
      policies: ["Reaganomics", "Tax cuts"]
    }
  ]
};

function App() {
  const [selectedCountries, setSelectedCountries] = useState<string[]>(['USA']);
  const [countryData, setCountryData] = useState<Record<string, CountryData>>({});
  const [timeRange, setTimeRange] = useState<[number, number]>([1980, 2023]);
  const [showGrowthRate, setShowGrowthRate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableCountries, setAvailableCountries] = useState<Array<{ code: string; name: string; region: string; }>>([]);
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    const loadCountries = async () => {
      try {
        const countries = await fetchCountries();
        setAvailableCountries(countries);
      } catch (err) {
        setError('Failed to load countries. Please try again later.');
      }
    };

    loadCountries();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      const newData: Record<string, CountryData> = {};

      try {
        for (const countryCode of selectedCountries) {
          const gdpData = await fetchGDPData(countryCode, timeRange[0], timeRange[1]);
          
          newData[countryCode] = {
            id: countryCode,
            name: availableCountries.find(c => c.code === countryCode)?.name || countryCode,
            gdpData,
            leaders: SAMPLE_LEADERS[countryCode as keyof typeof SAMPLE_LEADERS] || []
          };
        }

        setCountryData(newData);
      } catch (err) {
        setError('Failed to load GDP data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (selectedCountries.length > 0) {
      loadData();
    }
  }, [selectedCountries, timeRange, availableCountries]);

  const handleExport = (data: CountryData) => {
    const exportData = {
      country: data.name,
      timeRange: `${timeRange[0]}-${timeRange[1]}`,
      data: data.gdpData.map(d => ({
        year: d.year,
        gdp: d.value,
        growth: d.growth
      }))
    };

    // Export as JSON
    const jsonBlob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const jsonUrl = URL.createObjectURL(jsonBlob);
    const jsonLink = document.createElement('a');
    jsonLink.href = jsonUrl;
    jsonLink.download = `${data.name.toLowerCase()}-gdp-data.json`;
    document.body.appendChild(jsonLink);
    jsonLink.click();
    document.body.removeChild(jsonLink);
    URL.revokeObjectURL(jsonUrl);

    // Export as CSV
    const csvContent = [
      ['Year', 'GDP per Capita (USD)', 'Growth Rate (%)'],
      ...data.gdpData.map(d => [d.year, d.value, d.growth.toFixed(2)])
    ].map(row => row.join(',')).join('\n');

    const csvBlob = new Blob([csvContent], { type: 'text/csv' });
    const csvUrl = URL.createObjectURL(csvBlob);
    const csvLink = document.createElement('a');
    csvLink.href = csvUrl;
    csvLink.download = `${data.name.toLowerCase()}-gdp-data.csv`;
    document.body.appendChild(csvLink);
    csvLink.click();
    document.body.removeChild(csvLink);
    URL.revokeObjectURL(csvUrl);
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} transition-colors duration-200`}>
      <div className="max-w-7xl mx-auto p-8">
        <div className={`rounded-lg shadow-xl p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex justify-between items-center mb-6">
            <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              GDP per Capita Analysis
            </h1>
            <div className="flex gap-4">
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-2 rounded-md transition-colors ${
                  isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                }`}
                aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <button
                onClick={() => setShowGrowthRate(!showGrowthRate)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                  isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                }`}
              >
                <BarChart3 size={20} />
                {showGrowthRate ? 'Show Absolute Values' : 'Show Growth Rate'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="col-span-2">
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Select Countries
              </label>
              <CountrySelector
                selectedCountries={selectedCountries}
                onCountryChange={setSelectedCountries}
                availableCountries={availableCountries}
              />
            </div>
            <div className="col-span-1">
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Start Year
              </label>
              <input
                type="number"
                min="1980"
                max={timeRange[1]}
                value={timeRange[0]}
                onChange={(e) => setTimeRange([parseInt(e.target.value), timeRange[1]])}
                className={`w-full p-2 border rounded-md ${
                  isDarkMode
                    ? 'bg-gray-800 text-gray-300 border-gray-700'
                    : 'bg-white text-gray-900 border-gray-300'
                }`}
              />
            </div>
            <div className="col-span-1">
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                End Year
              </label>
              <input
                type="number"
                min={timeRange[0]}
                max="2023"
                value={timeRange[1]}
                onChange={(e) => setTimeRange([timeRange[0], parseInt(e.target.value)])}
                className={`w-full p-2 border rounded-md ${
                  isDarkMode
                    ? 'bg-gray-800 text-gray-300 border-gray-700'
                    : 'bg-white text-gray-900 border-gray-300'
                }`}
              />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex justify-center items-center h-96"
              >
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
              </motion.div>
            ) : error ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`p-4 rounded-md ${
                  isDarkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800'
                }`}
              >
                {error}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {Object.values(countryData).map((country) => (
                  <div key={country.id} className="mb-8">
                    <Timeline
                      countryData={country}
                      selectedPeriod={timeRange}
                      showGrowthRate={showGrowthRate}
                      onExport={handleExport}
                    />
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default App;