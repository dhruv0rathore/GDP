import React, { useRef, useState, useMemo } from 'react';
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
  Brush,
  Label
} from 'recharts';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import type { TimelineProps, ComparisonMetrics } from '../types';
import { Download, ZoomIn, ZoomOut } from 'lucide-react';

const COLORS = ['#3B82F6', '#EC4899'];

const Timeline: React.FC<TimelineProps> = ({
  countryData,
  selectedPeriod,
  showGrowthRate,
  onExport,
  comparisonMode = false
}) => {
  const [zoomDomain, setZoomDomain] = useState<[number, number] | null>(null);
  const chartRef = useRef<any>(null);

  const combinedData = useMemo(() => {
    const allYears = new Set<number>();
    countryData.forEach(country => {
      country.gdpData.forEach(d => allYears.add(d.year));
    });

    return Array.from(allYears)
      .sort((a, b) => a - b)
      .filter(year => year >= selectedPeriod[0] && year <= selectedPeriod[1])
      .map(year => {
        const dataPoint: any = { year };
        countryData.forEach((country, index) => {
          const yearData = country.gdpData.find(d => d.year === year);
          if (yearData) {
            dataPoint[`${country.id}_value`] = yearData.value;
            dataPoint[`${country.id}_growth`] = yearData.growth;
          }
        });
        return dataPoint;
      });
  }, [countryData, selectedPeriod]);

  const comparisonMetrics = useMemo((): ComparisonMetrics | null => {
    if (!comparisonMode || countryData.length !== 2) return null;

    const [country1, country2] = countryData;
    const metrics: ComparisonMetrics = {
      startingRatio: 0,
      endingRatio: 0,
      averageGrowthDiff: 0,
      overtakes: []
    };

    const firstYear = combinedData[0];
    const lastYear = combinedData[combinedData.length - 1];

    metrics.startingRatio = firstYear[`${country1.id}_value`] / firstYear[`${country2.id}_value`];
    metrics.endingRatio = lastYear[`${country1.id}_value`] / lastYear[`${country2.id}_value`];

    let prevRatio = metrics.startingRatio;
    combinedData.forEach((data, index) => {
      if (index === 0) return;
      
      const currentRatio = data[`${country1.id}_value`] / data[`${country2.id}_value`];
      if ((prevRatio < 1 && currentRatio > 1) || (prevRatio > 1 && currentRatio < 1)) {
        metrics.overtakes.push({
          year: data.year,
          country: currentRatio > 1 ? country1.name : country2.name
        });
      }
      prevRatio = currentRatio;
    });

    const totalGrowthDiff = combinedData.reduce((acc, curr, index) => {
      if (index === 0) return acc;
      return acc + (curr[`${country1.id}_growth`] - curr[`${country2.id}_growth`]);
    }, 0);
    metrics.averageGrowthDiff = totalGrowthDiff / (combinedData.length - 1);

    return metrics;
  }, [combinedData, countryData, comparisonMode]);

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

  const initialDomain = useMemo(() => {
    if (combinedData.length > 0) {
      const years = combinedData.map(d => d.year);
      return [Math.min(...years), Math.max(...years)];
    }
    return null;
  }, [combinedData]);

  return (
    <div 
      className="w-full bg-gray-900 rounded-lg shadow-xl p-6"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="application"
      aria-label={comparisonMode ? "GDP comparison chart" : `GDP timeline for ${countryData[0].name}`}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-white">
          {comparisonMode 
            ? `${countryData[0].name} vs ${countryData[1].name}`
            : countryData[0].name}
        </h3>
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
          {!comparisonMode && (
            <button
              onClick={() => onExport(countryData[0])}
              className="p-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors"
              aria-label="Export data"
            >
              <Download size={20} />
            </button>
          )}
        </div>
      </div>

      {comparisonMetrics && (
        <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-400">Average Growth Difference</h4>
            <p className="text-lg font-bold text-white">
              {comparisonMetrics.averageGrowthDiff > 0 ? '+' : ''}
              {comparisonMetrics.averageGrowthDiff.toFixed(2)}%
            </p>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-400">GDP Ratio Change</h4>
            <p className="text-lg font-bold text-white">
              {((comparisonMetrics.endingRatio / comparisonMetrics.startingRatio - 1) * 100).toFixed(2)}%
            </p>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-400">Overtakes</h4>
            <p className="text-lg font-bold text-white">
              {comparisonMetrics.overtakes.length}
            </p>
          </div>
        </div>
      )}

      <div className="h-[500px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={combinedData}
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
                      {countryData.map((country, index) => {
                        const data = payload.find(p => 
                          p.dataKey === `${country.id}_${showGrowthRate ? 'growth' : 'value'}`
                        );
                        if (!data) return null;

                        const leader = country.leaders.find(
                          l => label >= l.startYear && label <= l.endYear
                        );

                        return (
                          <div key={country.id} className={index > 0 ? 'mt-4 pt-4 border-t border-gray-700' : ''}>
                            <p className="font-semibold text-white">{country.name}</p>
                            <p className="text-gray-300">
                              {showGrowthRate ? 'Growth: ' : 'GDP per Capita: '}
                              <span className="font-semibold text-white">
                                {showGrowthRate
                                  ? `${data.value.toFixed(2)}%`
                                  : `$${data.value.toLocaleString()}`}
                              </span>
                            </p>
                            {leader && (
                              <div className="mt-2">
                                <p className="text-sm text-gray-400">{leader.name} ({leader.party})</p>
                                {leader.policies && (
                                  <ul className="text-xs text-gray-500 mt-1">
                                    {leader.policies.map((policy, i) => (
                                      <li key={i}>• {policy}</li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
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
            {countryData.map((country, index) => (
              <React.Fragment key={country.id}>
                {country.leaders.map((leader) => (
                  <ReferenceLine
                    key={`${country.id}-${leader.startYear}`}
                    x={leader.startYear}
                    stroke={COLORS[index]}
                    strokeOpacity={0.5}
                    label={{
                      value: `${leader.name} (${country.name})`,
                      angle: -45,
                      position: 'insideTopRight',
                      style: { fill: COLORS[index] }
                    }}
                  />
                ))}
                <Line
                  type="monotone"
                  dataKey={`${country.id}_${showGrowthRate ? 'growth' : 'value'}`}
                  name={country.name}
                  stroke={COLORS[index]}
                  strokeWidth={2}
                  dot={false}
                  animationDuration={500}
                />
              </React.Fragment>
            ))}
            {comparisonMetrics?.overtakes.map((overtake, index) => (
              <ReferenceLine
                key={`overtake-${index}`}
                x={overtake.year}
                stroke="#9333EA"
                strokeDasharray="3 3"
                label={{
                  value: `${overtake.country} overtakes`,
                  angle: -45,
                  position: 'insideTopRight',
                  style: { fill: '#9333EA' }
                }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default Timeline;