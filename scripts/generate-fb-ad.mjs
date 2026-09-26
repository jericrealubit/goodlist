/**
 * Renders the Facebook feed ads (1080x1350, 4:5) into docs/marketing/.
 *
 * Each ad lives in scripts/ads/ and exports { name, html }; the cast, palette
 * and renderer they share are in scripts/lib/ad-kit.mjs.
 *
 * Usage:  npm run ad:fb                     all ads
 *         npm run ad:fb -- caregiver-son    ads whose name contains the filter
 */
import { renderAd } from './lib/ad-kit.mjs';
import * as caregiverSon from './ads/caregiver-son.mjs';
import * as groceryFamily from './ads/grocery-family.mjs';
import * as medicineReminder from './ads/medicine-reminder.mjs';

const ADS = [medicineReminder, caregiverSon, groceryFamily];
const filter = process.argv[2];
const selected = filter ? ADS.filter((ad) => ad.name.includes(filter)) : ADS;
if (selected.length === 0) {
  console.error(`No ad matches "${filter}". Known: ${ADS.map((ad) => ad.name).join(', ')}`);
  process.exit(1);
}

for (const ad of selected) {
  await renderAd(ad);
}
