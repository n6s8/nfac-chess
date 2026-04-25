export const COUNTRY_CITY_OPTIONS: Record<string, string[]> = {
  Kazakhstan: ['Almaty', 'Astana', 'Shymkent', 'Karaganda', 'Aktobe', 'Atyrau', 'Taraz'],
  Uzbekistan: ['Tashkent', 'Samarkand', 'Bukhara', 'Andijan', 'Namangan'],
  Kyrgyzstan: ['Bishkek', 'Osh', 'Jalal-Abad', 'Karakol'],
  Russia: ['Moscow', 'Saint Petersburg', 'Kazan', 'Novosibirsk'],
  Turkey: ['Istanbul', 'Ankara', 'Izmir', 'Bursa'],
  India: ['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai'],
  Germany: ['Berlin', 'Munich', 'Hamburg', 'Frankfurt'],
  'United Kingdom': ['London', 'Manchester', 'Birmingham', 'Leeds'],
  'United States': ['New York', 'Los Angeles', 'Chicago', 'San Francisco'],
}

export const COUNTRY_OPTIONS = Object.keys(COUNTRY_CITY_OPTIONS)

export function getCitiesForCountry(country: string) {
  return COUNTRY_CITY_OPTIONS[country] ?? []
}
