export type Region = 'north' | 'west' | 'central' | 'east' | 'south'

export type Country = { iso: string; code: string; name: string; region: Region; currency: string }

export const REGIONS: { id: Region; label: string }[] = [
  { id: 'north', label: 'North Africa' },
  { id: 'west', label: 'West Africa' },
  { id: 'central', label: 'Central Africa' },
  { id: 'east', label: 'East Africa' },
  { id: 'south', label: 'Southern Africa' }
]

export const COUNTRIES: Country[] = [
  { iso: 'dz', code: '012', name: 'Algeria', region: 'north', currency: 'DZD' },
  { iso: 'ao', code: '024', name: 'Angola', region: 'south', currency: 'AOA' },
  { iso: 'bj', code: '204', name: 'Benin', region: 'west', currency: 'XOF' },
  { iso: 'bw', code: '072', name: 'Botswana', region: 'south', currency: 'BWP' },
  { iso: 'bf', code: '854', name: 'Burkina Faso', region: 'west', currency: 'XOF' },
  { iso: 'bi', code: '108', name: 'Burundi', region: 'central', currency: 'BIF' },
  { iso: 'cv', code: '132', name: 'Cabo Verde', region: 'west', currency: 'CVE' },
  { iso: 'cm', code: '120', name: 'Cameroon', region: 'central', currency: 'XAF' },
  { iso: 'cf', code: '140', name: 'Central African Republic', region: 'central', currency: 'XAF' },
  { iso: 'td', code: '148', name: 'Chad', region: 'central', currency: 'XAF' },
  { iso: 'km', code: '174', name: 'Comoros', region: 'east', currency: 'KMF' },
  { iso: 'ci', code: '384', name: "Côte d'Ivoire", region: 'west', currency: 'XOF' },
  { iso: 'dj', code: '262', name: 'Djibouti', region: 'east', currency: 'DJF' },
  { iso: 'cd', code: '180', name: 'DR Congo', region: 'central', currency: 'CDF' },
  { iso: 'eg', code: '818', name: 'Egypt', region: 'north', currency: 'EGP' },
  { iso: 'gq', code: '226', name: 'Equatorial Guinea', region: 'central', currency: 'XAF' },
  { iso: 'er', code: '232', name: 'Eritrea', region: 'east', currency: 'ERN' },
  { iso: 'sz', code: '748', name: 'Eswatini', region: 'south', currency: 'SZL' },
  { iso: 'et', code: '231', name: 'Ethiopia', region: 'east', currency: 'ETB' },
  { iso: 'ga', code: '266', name: 'Gabon', region: 'central', currency: 'XAF' },
  { iso: 'gh', code: '288', name: 'Ghana', region: 'west', currency: 'GHS' },
  { iso: 'gn', code: '324', name: 'Guinea', region: 'west', currency: 'GNF' },
  { iso: 'gw', code: '624', name: 'Guinea-Bissau', region: 'west', currency: 'XOF' },
  { iso: 'ke', code: '404', name: 'Kenya', region: 'east', currency: 'KES' },
  { iso: 'ls', code: '426', name: 'Lesotho', region: 'south', currency: 'LSL' },
  { iso: 'lr', code: '430', name: 'Liberia', region: 'west', currency: 'LRD' },
  { iso: 'ly', code: '434', name: 'Libya', region: 'north', currency: 'LYD' },
  { iso: 'mg', code: '450', name: 'Madagascar', region: 'east', currency: 'MGA' },
  { iso: 'mw', code: '454', name: 'Malawi', region: 'south', currency: 'MWK' },
  { iso: 'ml', code: '466', name: 'Mali', region: 'west', currency: 'XOF' },
  { iso: 'mr', code: '478', name: 'Mauritania', region: 'north', currency: 'MRU' },
  { iso: 'mu', code: '480', name: 'Mauritius', region: 'east', currency: 'MUR' },
  { iso: 'ma', code: '504', name: 'Morocco', region: 'north', currency: 'MAD' },
  { iso: 'mz', code: '508', name: 'Mozambique', region: 'south', currency: 'MZN' },
  { iso: 'na', code: '516', name: 'Namibia', region: 'south', currency: 'NAD' },
  { iso: 'ne', code: '562', name: 'Niger', region: 'west', currency: 'XOF' },
  { iso: 'ng', code: '566', name: 'Nigeria', region: 'west', currency: 'NGN' },
  { iso: 'cg', code: '178', name: 'Republic of the Congo', region: 'central', currency: 'XAF' },
  { iso: 'rw', code: '646', name: 'Rwanda', region: 'east', currency: 'RWF' },
  { iso: 'st', code: '678', name: 'São Tomé and Príncipe', region: 'central', currency: 'STN' },
  { iso: 'sn', code: '686', name: 'Senegal', region: 'west', currency: 'XOF' },
  { iso: 'sc', code: '690', name: 'Seychelles', region: 'east', currency: 'SCR' },
  { iso: 'sl', code: '694', name: 'Sierra Leone', region: 'west', currency: 'SLE' },
  { iso: 'so', code: '706', name: 'Somalia', region: 'east', currency: 'SOS' },
  { iso: 'za', code: '710', name: 'South Africa', region: 'south', currency: 'ZAR' },
  { iso: 'ss', code: '728', name: 'South Sudan', region: 'east', currency: 'SSP' },
  { iso: 'sd', code: '729', name: 'Sudan', region: 'east', currency: 'SDG' },
  { iso: 'tz', code: '834', name: 'Tanzania', region: 'east', currency: 'TZS' },
  { iso: 'gm', code: '270', name: 'The Gambia', region: 'west', currency: 'GMD' },
  { iso: 'tg', code: '768', name: 'Togo', region: 'west', currency: 'XOF' },
  { iso: 'tn', code: '788', name: 'Tunisia', region: 'north', currency: 'TND' },
  { iso: 'ug', code: '800', name: 'Uganda', region: 'east', currency: 'UGX' },
  { iso: 'eh', code: '732', name: 'Western Sahara', region: 'north', currency: 'MAD' },
  { iso: 'zm', code: '894', name: 'Zambia', region: 'south', currency: 'ZMW' },
  { iso: 'zw', code: '716', name: 'Zimbabwe', region: 'south', currency: 'ZWG' },
]

const ALIASES: Record<string, string> = {
  'ivory coast': 'ci',
  'cote divoire': 'ci',
  'cape verde': 'cv',
  drc: 'cd',
  'democratic republic of the congo': 'cd',
  'congo kinshasa': 'cd',
  congo: 'cg',
  'congo brazzaville': 'cg',
  'republic of congo': 'cg',
  gambia: 'gm',
  swaziland: 'sz',
  'sao tome': 'st',
  car: 'cf',
  'south africa republic': 'za',
  rsa: 'za',
  naija: 'ng',
  sahrawi: 'eh'
}

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

const byIso = new Map(COUNTRIES.map(country => [country.iso, country]))
const byName = new Map(COUNTRIES.map(country => [normalize(country.name), country.iso]))

export const countryByIso = (iso: string | null | undefined) => (iso ? byIso.get(iso.toLowerCase()) : undefined)

export function resolveCountry(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const raw = value.trim()
  if (raw.length === 2 && byIso.has(raw.toLowerCase())) return raw.toLowerCase()
  const numeric = COUNTRIES.find(country => country.code === raw)
  if (numeric) return numeric.iso
  const key = normalize(raw)
  if (byName.has(key)) return byName.get(key)!
  if (ALIASES[key]) return ALIASES[key]
  const contained = COUNTRIES.filter(country => key.includes(normalize(country.name))).sort((a, b) => b.name.length - a.name.length)[0]
  return contained?.iso ?? null
}

export const regionLabel = (region: Region) => REGIONS.find(item => item.id === region)?.label ?? region
