import React from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CountrySelectorProps {
  selectedCountries: string[];
  onCountryChange: (countries: string[]) => void;
  availableCountries: { code: string; name: string; region: string; }[];
  className?: string;
}

const CountrySelector: React.FC<CountrySelectorProps> = ({
  selectedCountries,
  onCountryChange,
  availableCountries,
  className
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const containerRef = React.useRef<HTMLDivElement>(null);

  const filteredCountries = React.useMemo(() => {
    return availableCountries.filter(country =>
      country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      country.region.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [availableCountries, searchTerm]);

  const groupedCountries = React.useMemo(() => {
    return filteredCountries.reduce((acc, country) => {
      if (!acc[country.region]) {
        acc[country.region] = [];
      }
      acc[country.region].push(country);
      return acc;
    }, {} as Record<string, typeof availableCountries>);
  }, [filteredCountries]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-2.5 text-gray-300 bg-gray-800 border border-gray-700 rounded-md shadow-sm outline-none appearance-none focus:border-blue-600 transition-colors flex items-center justify-between"
      >
        <span>
          {selectedCountries.length === 0
            ? 'Select countries'
            : `${selectedCountries.length} selected`}
        </span>
        <ChevronDown className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg"
          >
            <div className="p-2 border-b border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search countries..."
                  className="w-full pl-9 pr-3 py-2 bg-gray-900 text-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>

            <div className="max-h-60 overflow-auto">
              {Object.entries(groupedCountries).map(([region, countries]) => (
                <div key={region} className="px-2 py-1">
                  <div className="text-xs font-semibold text-gray-400 px-2 py-1">
                    {region}
                  </div>
                  {countries.map((country) => (
                    <label
                      key={country.code}
                      className="flex items-center px-2 py-1 hover:bg-gray-700 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCountries.includes(country.code)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            onCountryChange([...selectedCountries, country.code]);
                          } else {
                            onCountryChange(selectedCountries.filter(c => c !== country.code));
                          }
                        }}
                        className="form-checkbox h-4 w-4 text-blue-600 rounded border-gray-600 bg-gray-700"
                      />
                      <span className="ml-2 text-gray-300">{country.name}</span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CountrySelector;