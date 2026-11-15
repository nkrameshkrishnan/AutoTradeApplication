// Reading the vehicle-history record the data pipeline writes (see scripts/providers/carfax.mjs).
// Flags can be true, false, or null (the source didn't say). Null is shown as a dash, never as "no".

export const accidentCount = (h) => h?.accidents?.length ?? 0;

export function isClean(h) {
  if (!h) return false;
  return accidentCount(h) === 0 && h.damageReported !== true && !hasSevereFlag(h);
}

export function hasSevereFlag(h) {
  return Boolean(h?.totalLoss || h?.frameDamage || h?.airbagDeployed || h?.fireFloodDamage || h?.stolen || h?.odometerProblem || (h?.titleBrand && h.titleBrand !== 'Normal'));
}

export function accidentLabel(h) {
  if (!h) return 'No history on file';
  const n = accidentCount(h);
  if (n === 0 && h.damageReported) return 'Damage reported';
  if (n === 0) return 'No accidents reported';
  return n === 1 ? '1 accident reported' : `${n} accidents reported`;
}

export const ownersLabel = (h) => (h?.owners == null ? 'Owners not reported' : h.owners === 1 ? '1 owner' : `${h.owners} owners`);

// The checks a buyer scans for, in the order CARFAX Canada's VIN Scan lists them.
export const FLAGS = [
  ['totalLoss', 'Total loss'],
  ['frameDamage', 'Frame or structural damage'],
  ['airbagDeployed', 'Airbag deployed'],
  ['fireFloodDamage', 'Fire or flood damage'],
  ['stolen', 'Reported stolen'],
  ['odometerProblem', 'Odometer problem'],
  ['policeReportedAccident', 'Police-reported accident'],
  ['usHistory', 'Records from the United States'],
];

export const SOURCE_NOTE = {
  sample: 'Sample history for this demo listing. Real listings show the summary from the CARFAX Canada report the seller provides.',
  listing: 'Summary taken from the CARFAX Canada report linked on the original listing.',
  'carfax-api': 'Retrieved from CARFAX Canada by VIN.',
};

export const nonPersonal = (h) => (h?.ownershipTypes ?? []).filter((t) => !/personal/i.test(t) || /non-personal/i.test(t));
