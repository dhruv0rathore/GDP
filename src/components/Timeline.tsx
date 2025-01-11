import React, { useRef, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Brush
} from 'recharts';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import type { TimelineProps } from '../types';
import { Download, ZoomIn, ZoomOut } from 'lucide-react';

const Timeline: React.FC<TimelineProps> = ({
  countryData,
  selectedPeriod,
  showGrowthRate,
  onExport
}) => {
  const [zoomDomain, setZoomDomain] = useState<[number, number] | null>(null);
  const chartRef = useRef<any>(null);

  const filteredData = countryData.gdpData.filter(
    d => d.year >= selectedPeriod[0] && d.year <= selectedPeriod[1]
  );

  const handleZoomIn = () => {
    if (chartRef.current && chartRef.current.state && chartRef.current.state.domain) {
      const { domain } = chartRef.current.state;
      if (domain.x && Array.isArray(domain.x) && domain.x.length === 2) {
        const range = domain.x[1] - domain.x[0];
        const newRange = range / 2;
        const center = (domain.x[1] + domain.x[0]) / 2;
        setZoomDomain([center - newRange / 2, center + newRange / 2]);
      }
    }
  };

  const handleZoomOut = () => {
    setZoomDomain(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === '-') {
        e.preventDefault();
        handleZoomOut();
      }
    }
  };

  // Set initial domain based on the filtered data
  const initialDomain = React.useMemo(() => {
    if (filteredData.length > 0) {
      const years = filteredData.map(d => d.year);
      return [Math.min(...years), Math.max(...years)];
    }
    return null;
  }, [filteredData]);

  return (
    <div 
      className="w-full bg-gray-900 rounded-lg shadow-xl p-6"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="application"
      aria-label={`GDP timeline for ${countryData.name}`}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-white">{countryData.name}</h3>
        <div className="flex gap-2">
          <button
            onClick={handleZoomIn}
            className="p-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors"
            aria-label="Zoom in"
          >
            <ZoomIn size={20} />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors"
            aria-label="Zoom out"
          >
            <ZoomOut size={20} />
          </button>
          <button
            onClick={() => onExport(countryData)}
            className="p-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors"
            aria-label="Export data"
          >
            <Download size={20} />
          </button>
        </div>
      </div>

      <div className="h-[500px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={filteredData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            ref={chartRef}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="year"
              tickFormatter={(value) => format(new Date(value, 0), 'yyyy')}
              domain={zoomDomain || initialDomain || ['auto', 'auto']}
              stroke="#9CA3AF"
              type="number"
              allowDataOverflow
            />
            <YAxis
              label={{
                value: showGrowthRate ? 'Growth Rate (%)' : 'GDP per Capita (USD)',
                angle: -90,
                position: 'insideLeft',
                style: { fill: '#9CA3AF' }
              }}
              stroke="#9CA3AF"
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  const leader = countryData.leaders.find(
                    l => label >= l.startYear && label <= l.endYear
                  );

                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="bg-gray-800 p-4 rounded-lg shadow-xl border border-gray-700"
                    >
                      <p className="font-bold text-white">
                        {format(new Date(label, 0), 'yyyy')}
                      </p>
                      <p className="text-gray-300">
                        {showGrowthRate ? 'Growth: ' : 'GDP per Capita: '}
                        <span className="font-semibold text-white">
                          {showGrowthRate
                            ? `${data.growth.toFixed(2)}%`
                            : `$${data.value.toLocaleString()}`}
                        </span>
                      </p>
                      {leader && (
                        <div className="mt-2 border-t border-gray-700 pt-2">
                          <p className="font-semibold text-white">{leader.name}</p>
                          <p className="text-sm text-gray-400">{leader.party}</p>
                          {leader.policies && (
                            <div className="mt-1">
                              <p className="text-xs text-gray-500">Key Policies:</p>
                              <ul className="text-xs text-gray-400">
                                {leader.policies.map((policy, index) => (
                                  <li key={index}>• {policy}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  );
                }
                return null;
              }}
            />
            <Legend stroke="#9CA3AF" />
            <Brush
              dataKey="year"
              height={30}
              stroke="#4B5563"
              fill="#1F2937"
              tickFormatter={(value) => format(new Date(value, 0), 'yyyy')}
            />
            {countryData.leaders.map((leader) => (
              <ReferenceLine
                key={leader.startYear}
                x={leader.startYear}
                stroke="#4B5563"
                label={{
                  value: leader.name,
                  angle: -45,
                  position: 'insideTopRight',
                  style: { fill: '#9CA3AF' }
                }}
              />
            ))}
            <Line
              type="monotone"
              dataKey={showGrowthRate ? 'growth' : 'value'}
              stroke="#3B82F6"
              strokeWidth={2}
              dot={false}
              animationDuration={500}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default Timeline;