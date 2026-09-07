import { countryName } from '@/lib/geo/country-names';
import type { DistributionRow } from '@/lib/types';

/**
 * What a leaf row actually tells us, so the UI can label it truthfully rather
 * than presenting every level as if it were verified:
 *   'city'     — the time zone IS a single city (Singapore, Hong Kong…). Exact.
 *   'timezone' — no city is known, so we show the raw IANA zone. Factual, but
 *                it is a zone, not the user's city.
 *   'unknown'  — nothing below country level is available.
 */
export type LeafKind = 'city' | 'timezone' | 'unknown';

export type CityNode = { label: string; kind: LeafKind; userCount: number };
export type RegionNode = { label: string; approximate: boolean; userCount: number; cities: CityNode[] };
export type CountryNode = { code: string; name: string; userCount: number; regions: RegionNode[] };

export type Distribution = {
  totalUsers: number;
  sharedUsers: number;
  /** Opted out, or not yet reported. Counted, never located. */
  notSharedUsers: number;
  /** sharedUsers / totalUsers, 0 when there are no users at all. */
  coverage: number;
  countries: CountryNode[];
};

const NOT_AVAILABLE = 'Not available';

function byCountDesc<T extends { userCount: number }>(a: T, b: T) {
  return b.userCount - a.userCount;
}

/**
 * Folds the flat RPC rows into a Country → Region → City tree.
 *
 * Rows with no `region_code` are the "not shared" bucket: they are counted
 * toward the total and the coverage figure, but never placed on the map.
 */
export function buildDistribution(rows: DistributionRow[]): Distribution {
  let totalUsers = 0;
  let notSharedUsers = 0;

  // country code -> region label -> city label -> node
  const countries = new Map<string, Map<string, Map<string, CityNode>>>();

  for (const row of rows) {
    totalUsers += row.user_count;

    if (!row.region_code) {
      notSharedUsers += row.user_count;
      continue;
    }

    const regionLabel = row.region ?? NOT_AVAILABLE;
    const kind: LeafKind = row.city ? 'city' : row.time_zone ? 'timezone' : 'unknown';
    const cityLabel = row.city ?? row.time_zone ?? NOT_AVAILABLE;

    const regions = countries.get(row.region_code) ?? new Map<string, Map<string, CityNode>>();
    countries.set(row.region_code, regions);

    const cities = regions.get(regionLabel) ?? new Map<string, CityNode>();
    regions.set(regionLabel, cities);

    const existing = cities.get(cityLabel);
    if (existing) {
      existing.userCount += row.user_count;
    } else {
      cities.set(cityLabel, { label: cityLabel, kind, userCount: row.user_count });
    }
  }

  const countryNodes: CountryNode[] = [...countries.entries()]
    .map(([code, regions]) => {
      const regionNodes: RegionNode[] = [...regions.entries()]
        .map(([label, cities]) => {
          const cityNodes = [...cities.values()].sort(byCountDesc);
          return {
            label,
            approximate: label !== NOT_AVAILABLE,
            userCount: cityNodes.reduce((sum, c) => sum + c.userCount, 0),
            cities: cityNodes,
          };
        })
        .sort(byCountDesc);

      return {
        code,
        name: countryName(code),
        userCount: regionNodes.reduce((sum, r) => sum + r.userCount, 0),
        regions: regionNodes,
      };
    })
    .sort(byCountDesc);

  const sharedUsers = totalUsers - notSharedUsers;

  return {
    totalUsers,
    sharedUsers,
    notSharedUsers,
    coverage: totalUsers === 0 ? 0 : sharedUsers / totalUsers,
    countries: countryNodes,
  };
}
