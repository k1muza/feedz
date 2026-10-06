/** Formats a mass in kg for display: 25 → "25 kg", 1000 → "1 tonne", 5000 → "5 tonnes". */
export function formatKg(kg: number) {
  if (kg >= 1000) {
    const tonnes = Number((kg / 1000).toFixed(3));
    return `${tonnes.toLocaleString('en-US')} ${tonnes === 1 ? 'tonne' : 'tonnes'}`;
  }
  return `${Number(kg.toFixed(3)).toLocaleString('en-US')} kg`;
}

/** The unit a pack price is quoted per: "50 kg", or "tonne" for a 1000 kg pack. */
export function packLabel(packSizeKg: number) {
  return packSizeKg === 1000 ? 'tonne' : formatKg(packSizeKg);
}

/** Price per tonne for a price quoted per pack of `packSizeKg`. */
export function pricePerTonne(packPrice: number, packSizeKg: number) {
  return Math.round((packPrice * 1000 / packSizeKg) * 100) / 100;
}
