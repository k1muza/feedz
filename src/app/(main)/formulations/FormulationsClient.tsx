'use client';

import { useMemo, useState } from 'react';

const rows = [
  { id: 'sorghum', name: 'Sorghum', max: 85, step: .05 },
  { id: 'soybean', name: 'Soybean meal', max: 45, step: .05 },
  { id: 'bran', name: 'Wheat bran', max: 20, step: .05 },
  { id: 'sunflower', name: 'Sunflower meal', max: 15, step: .05 },
  { id: 'fish', name: 'Fish meal', max: 10, step: .05 },
  { id: 'dcp', name: 'Dicalcium phosphate', max: 3, step: .05 },
  { id: 'limestone', name: 'Feed limestone', max: 10, step: .05 },
  { id: 'lysine', name: 'L-Lysine HCl', max: .6, step: .01 },
  { id: 'methionine', name: 'DL-Methionine', max: .5, step: .01 },
] as const;

type IngredientId = typeof rows[number]['id'];
type Inclusion = Record<IngredientId, number>;

const defaults: Inclusion = { sorghum: 70, soybean: 20, bran: 6, sunflower: 0, fish: 0, dcp: 1.2, limestone: .8, lysine: .25, methionine: .05 };
const fixed = 1.7;

const nutrients: Record<IngredientId, Record<string, number>> = {
  sorghum: { cp: 10.5, me: 3250, mep: 3300, lys: .22, met: .16, ca: .03, p: .09 },
  soybean: { cp: 46, me: 2450, mep: 3180, lys: 2.85, met: .65, ca: .3, p: .2 },
  bran: { cp: 15.5, me: 1300, mep: 2200, lys: .6, met: .23, ca: .1, p: .3 },
  sunflower: { cp: 34, me: 1800, mep: 2300, lys: 1.2, met: .75, ca: .4, p: .3 },
  fish: { cp: 62, me: 2900, mep: 3100, lys: 4.8, met: 1.7, ca: 5, p: 2.8 },
  dcp: { ca: 23, p: 18 }, limestone: { ca: 38 }, lysine: { lys: 78.8 }, methionine: { met: 99 },
};

const targets = {
  pigGrower: { label: 'Pig grower', energy: 'mep', energyLabel: 'ME pigs', cp: [16, 18], me: [3200, 3350], lys: [.95, 1.10], met: [.28, .35], ca: [.60, .75], p: [.28, .35] },
  pigFinisher: { label: 'Pig finisher', energy: 'mep', energyLabel: 'ME pigs', cp: [14, 16], me: [3200, 3350], lys: [.75, .90], met: [.22, .30], ca: [.50, .65], p: [.23, .30] },
  broiler: { label: 'Broiler grower', energy: 'me', energyLabel: 'ME poultry', cp: [19, 21], me: [3000, 3150], lys: [1.05, 1.20], met: [.45, .55], ca: [.85, 1], p: [.42, .50] },
} as const;

const colours: Record<IngredientId | 'fixed', string> = { sorghum: '#d99a2b', soybean: '#1d3a2a', fish: '#2e5a40', sunflower: '#5b7a52', bran: '#8a9a6b', dcp: '#bdb7a9', limestone: '#cfc9bb', lysine: '#9a948a', methionine: '#7d786f', fixed: '#e7e2d6' };

export default function FormulationsClient() {
  const [inclusions, setInclusions] = useState<Inclusion>(defaults);
  const [targetId, setTargetId] = useState<keyof typeof targets>('pigGrower');
  const target = targets[targetId];
  const total = Object.values(inclusions).reduce((sum, value) => sum + value, 0) + fixed;

  const analysis = useMemo(() => {
    const definitions = [
      { id: 'cp', label: 'Crude protein', unit: '%', decimals: 1 },
      { id: 'me', label: target.energyLabel, unit: 'kcal/kg', decimals: 0 },
      { id: 'lys', label: 'Lysine', unit: '%', decimals: 2 },
      { id: 'met', label: 'Methionine', unit: '%', decimals: 2 },
      { id: 'ca', label: 'Calcium', unit: '%', decimals: 2 },
      { id: 'p', label: 'Avail. phosphorus', unit: '%', decimals: 2 },
    ];
    return definitions.map((definition) => {
      const source = definition.id === 'me' ? target.energy : definition.id;
      const value = rows.reduce((sum, row) => sum + inclusions[row.id] / 100 * (nutrients[row.id][source] || 0), 0);
      const range = target[definition.id as keyof typeof target] as readonly [number, number];
      const [low, high] = range;
      const span = (high - low) * 1.6;
      const minimum = low - span;
      const maximum = high + span;
      const position = (number: number) => Math.max(0, Math.min(100, (number - minimum) / (maximum - minimum) * 100));
      const status = value < low ? 'Below' : value > high ? 'Above' : 'Within';
      const formatted = (number: number) => definition.decimals === 0 ? Math.round(number).toLocaleString('en-US') : number.toFixed(definition.decimals);
      return { ...definition, value: formatted(value), range: `${formatted(low)}–${formatted(high)}`, status, marker: position(value), bandStart: position(low), bandWidth: position(high) - position(low), delta: status === 'Below' ? `${formatted(low - value)} under` : status === 'Above' ? `${formatted(value - high)} over` : 'In range' };
    });
  }, [inclusions, target]);

  const within = analysis.filter((item) => item.status === 'Within').length;
  const mix = [...rows.filter((row) => inclusions[row.id] > 0).map((row) => ({ name: row.name, value: inclusions[row.id], colour: colours[row.id] })), { name: 'Premix & salt', value: fixed, colour: colours.fixed }];

  return (
    <main className="fs-page bg-[#f3f0e8] [container-type:inline-size]">
      <p className="fs-mono mb-2.5 mt-0 text-[12px] uppercase tracking-[.08em] text-[#4f524b]">Formulation</p>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-5">
        <div className="flex max-w-[640px] flex-col gap-3"><h1 className="fs-page-title">Check a feed against its targets</h1><p className="m-0 text-[17px] leading-[1.5] text-[#3d403a]">Pick the animal and stage, adjust how much of each ingredient goes in, and see which nutrients are below or above target.</p></div>
        <div className="flex flex-col gap-2"><span className="fs-label text-[#4f524b]">Target</span><div className="flex flex-wrap gap-1.5">{Object.entries(targets).map(([id, item]) => <button key={id} onClick={() => setTargetId(id as keyof typeof targets)} className={`inline-flex h-9 items-center rounded-full border px-3.5 text-[14px] font-medium ${targetId === id ? 'border-[#1d3a2a] bg-[#1d3a2a] text-white' : 'border-[#d9d4c7] bg-[#fbfaf6] text-[#191b18]'}`}>{item.label}</button>)}</div></div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,440px),1fr))] items-start gap-5">
        <section className="rounded-[6px] border border-[#d9d4c7] bg-[#fbfaf6]">
          <div className="flex items-center justify-between gap-3 border-b border-[#191b18] px-5 py-4"><h2 className="m-0 text-[19px] font-bold">Ingredients</h2><span className={`rounded-[3px] px-2.5 py-1 text-[13px] font-bold tabular-nums ${Math.abs(total - 100) < .05 ? 'bg-[#e3eadf] text-[#1f5c38]' : 'bg-[#f6e0d9] text-[#8f3420]'}`}>Total {total.toFixed(1)}%</span></div>
          {rows.map((row) => <div key={row.id} className="grid grid-cols-[minmax(110px,1fr)_minmax(100px,2fr)_64px] items-center gap-3.5 border-b border-[#ece8de] px-5 py-3"><span className="text-[15px] font-semibold">{row.name}</span><input type="range" min="0" max={row.max} step={row.step} value={inclusions[row.id]} aria-label={`${row.name} inclusion`} onChange={(event) => setInclusions((current) => ({ ...current, [row.id]: Number(event.target.value) }))} className="w-full"/><span className="text-right text-[16px] font-semibold tabular-nums">{inclusions[row.id] < 1 && inclusions[row.id] > 0 ? inclusions[row.id].toFixed(2) : inclusions[row.id].toFixed(1)}%</span></div>)}
          <div className="grid grid-cols-[minmax(110px,1fr)_minmax(100px,2fr)_64px] items-center gap-3.5 px-5 py-3 text-[#4f524b]"><span className="text-[15px]">Premix, salt &amp; additives</span><span className="text-[13px]">Fixed</span><span className="text-right text-[16px] font-semibold tabular-nums">{fixed.toFixed(1)}%</span></div>
          <div className="flex flex-wrap gap-2.5 border-t border-[#d9d4c7] px-5 py-4"><button onClick={() => setInclusions(defaults)} className="h-[42px] rounded-[4px] border-[1.5px] border-[#191b18] bg-transparent px-4 text-[14px] font-semibold">Reset</button><a href="https://wa.me/263774684534?text=Please%20quote%20the%20ingredients%20in%20my%20feed%20formula" className="inline-flex h-[42px] items-center rounded-[4px] bg-[#d99a2b] px-4 text-[14px] font-semibold text-[#191b18] no-underline">Quote these ingredients</a></div>
        </section>

        <section className="rounded-[6px] border border-[#d9d4c7] bg-[#fbfaf6] px-5 pb-4">
          <div className="flex items-center justify-between gap-3 border-b border-[#191b18] py-4"><h2 className="m-0 text-[19px] font-bold">Nutrient analysis</h2><span className="text-[14px] font-semibold">{within} of {analysis.length} within target{Math.abs(total - 100) >= .05 ? ' · total ≠ 100%' : ''}</span></div>
          <div className="mb-2 mt-4 flex h-7 overflow-hidden rounded-[3px]">{mix.map((item) => <div key={item.name} title={item.name} style={{ width: `${item.value / total * 100}%`, background: item.colour }}/>)}</div>
          <div className="mb-1 flex flex-wrap gap-x-3.5 gap-y-1 text-[12px] text-[#4f524b]">{mix.map((item) => <span key={item.name} className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-[2px]" style={{ background: item.colour }}/>{item.name}</span>)}</div>
          {analysis.map((item) => <div key={item.id} className="grid gap-2 border-b border-[#ece8de] py-3.5"><div className="flex items-baseline justify-between gap-3"><span className="text-[15px] font-semibold">{item.label}</span><span className="flex items-baseline gap-2.5"><span className="text-[22px] font-semibold tabular-nums">{item.value}<small className="ml-1 text-[12px] font-normal text-[#4f524b]">{item.unit}</small></span><span className={`min-w-14 rounded-[3px] px-2 py-[3px] text-center text-[12px] font-bold ${item.status === 'Within' ? 'bg-[#e3eadf] text-[#1f5c38]' : item.status === 'Below' ? 'bg-[#f6e0d9] text-[#8f3420]' : 'bg-[#f5e7cc] text-[#7a5414]'}`}>{item.status}</span></span></div><div className="relative h-2 rounded-[4px] bg-[#e7e2d6]"><i className="absolute inset-y-0 rounded-[2px] bg-[#b9cdb5]" style={{ left: `${item.bandStart}%`, width: `${item.bandWidth}%` }}/><i className={`absolute -bottom-1 -top-1 w-1 -translate-x-1/2 rounded-[2px] ${item.status === 'Within' ? 'bg-[#2e7d4f]' : item.status === 'Below' ? 'bg-[#b5452c]' : 'bg-[#b7791f]'}`} style={{ left: `${item.marker}%` }}/></div><div className="fs-mono flex justify-between gap-3 text-[11px] text-[#4f524b]"><span>Target {item.range} {item.unit}</span><span>{item.delta}</span></div></div>)}
          <p className="fs-mono mb-0 mt-3.5 text-[11px] leading-[1.6] text-[#4f524b]">Illustrative targets and typical ingredient values. Connect to FeedSport&apos;s requirement data and /formulations.</p>
        </section>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-[6px] bg-[#1d3a2a] px-6 py-[22px] text-white"><div className="flex flex-col gap-1"><span className="text-[18px] font-bold">Want someone to check it?</span><span className="text-[15px] text-[#dfe6dc]">Send this formulation to FeedSport and a nutritionist will review it with you.</span></div><a href="https://wa.me/263774684534?text=Please%20review%20my%20feed%20formulation" className="inline-flex h-[46px] items-center rounded-[4px] bg-[#fbfaf6] px-[18px] text-[15px] font-semibold text-[#1d3a2a] no-underline">Send for review</a></div>
    </main>
  );
}
