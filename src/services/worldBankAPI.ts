import axios from 'axios';
import { format } from 'date-fns';

const BASE_URL = 'https://api.worldbank.org/v2';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface CacheItem {
  data: any;
  timestamp: number;
}

const cache: Record<string, CacheItem> = {};

const isCacheValid = (timestamp: number) => {
  return Date.now() - timestamp < CACHE_DURATION;
};

export const fetchCountries = async () => {
  const cacheKey = 'countries';
  
  if (cache[cacheKey] && isCacheValid(cache[cacheKey].timestamp)) {
    return cache[cacheKey].data;
  }

  try {
    const response = await axios.get(`${BASE_URL}/country`, {
      params: {
        format: 'json',
        per_page: 300
      }
    });

    const countries = response.data[1]
      .filter((country: any) => country.capitalCity) // Filter out regions/aggregates
      .map((country: any) => ({
        code: country.id,
        name: country.name,
        region: country.region.value
      }));

    cache[cacheKey] = {
      data: countries,
      timestamp: Date.now()
    };

    return countries;
  } catch (error) {
    console.error('Error fetching countries:', error);
    throw new Error('Failed to fetch countries');
  }
};

export const fetchGDPData = async (countryCode: string, startYear: number, endYear: number) => {
  const cacheKey = `gdp-${countryCode}-${startYear}-${endYear}`;
  
  if (cache[cacheKey] && isCacheValid(cache[cacheKey].timestamp)) {
    return cache[cacheKey].data;
  }

  try {
    const response = await axios.get(
      `${BASE_URL}/country/${countryCode}/indicator/NY.GDP.PCAP.CD`,
      {
        params: {
          format: 'json',
          date: `${startYear}:${endYear}`,
          per_page: 100
        }
      }
    );
    
    if (!response.data[1]) {
      throw new Error('No data available');
    }

    const data = response.data[1].map((item: any) => ({
      year: parseInt(item.date),
      value: item.value,
      growth: 0
    }));

    // Calculate growth rates
    const dataWithGrowth = data.map((item: any, index: number) => ({
      ...item,
      growth: index === 0 ? 0 : ((item.value - data[index - 1].value) / data[index - 1].value) * 100
    }));

    cache[cacheKey] = {
      data: dataWithGrowth,
      timestamp: Date.now()
    };

    return dataWithGrowth;
  } catch (error) {
    console.error(`Error fetching GDP data for ${countryCode}:`, error);
    throw new Error(`Failed to fetch GDP data for ${countryCode}`);
  }
};