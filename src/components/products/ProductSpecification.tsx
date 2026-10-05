'use client';

import { useMemo, useState } from 'react';
import type { FeedProduct, NutrientGroup, ProductSpec } from '@/data/feedProducts';

type Basis = 'as-fed' | 'dry-matter';

type CompositionPart = {
  label: string;
  value: number;
  colour: string;
};

const compositionColours: Record<string, string> = {
  Moisture: '#e7e2d6',
  'Crude protein': '#1d3a2a',
  'Crude fat': '#d99a2b',
  'Crude fibre': '#8a9a6b',
  Ash: '#9a948a',
  NFE: '#c9bfa6',
};

const numberValue = (value: string) => Number.parseFloat(value.replace(/,/g, ''));
const decimalPlaces = (value: string) => value.split('.')[1]?.length ?? 0;

function findRow(groups: NutrientGroup[] | undefined, label: string) {
  return groups?.flatMap((group) => group.rows).find((row) => row.label === label);
}

function convertValue(product: FeedProduct, row: ProductSpec, basis: Basis) {
  const value = numberValue(row.value);
  if (basis === 'as-fed' || !Number.isFinite(value)) return value;

  const dryMatter = numberValue(findRow(product.nutrientGroups, 'Dry matter')?.value ?? '');
  if (!Number.isFinite(dryMatter) || dryMatter === 0) return value;
  if (row.label === 'Dry matter') return 100;
  return value * 100 / dryMatter;
}

function formatValue(value: number, source: ProductSpec) {
  if (!Number.isFinite(value)) return source.value;
  if (source.unit === 'kcal/kg') return Math.round(value).toLocaleString('en-US');
  return value.toFixed(decimalPlaces(source.value));
}

function sectionLabel(index: number, title: string) {
  return `${String.fromCharCode(65 + index)} · ${title}`;
}

export default function ProductSpecification({
  product,
  comparisonProducts,
  certificateUrl,
}: {
  product: FeedProduct;
  comparisonProducts: FeedProduct[];
  certificateUrl: string;
}) {
  const sourceIsDryMatter = product.nutritionSource?.basis.toLowerCase().includes('dry-matter') ?? false;
  const [basis, setBasis] = useState<Basis>(sourceIsDryMatter ? 'dry-matter' : 'as-fed');
  const groups = product.nutrientGroups ?? [{ title: 'Key specification', rows: product.specs }];
  const basisLabel = basis === 'as-fed' ? 'As fed' : 'Dry matter basis';
  const dryMatterRow = findRow(product.nutrientGroups, 'Dry matter');
  const canConvertBasis = Boolean(dryMatterRow);
  const profiledProducts = comparisonProducts.filter((item) => findRow(item.nutrientGroups, 'Dry matter'));

  const composition = useMemo<CompositionPart[]>(() => {
    if (!product.nutrientGroups) return [];
    const proximate = product.nutrientGroups.find((group) => group.title === 'Proximate');
    if (!proximate) return [];

    const dryMatter = numberValue(findRow(product.nutrientGroups, 'Dry matter')?.value ?? '');
    const rows = ['Crude protein', 'Crude fat', 'Crude fibre', 'Ash'].map((label) => {
      const row = proximate.rows.find((item) => item.label === label);
      return { label, row, value: row ? numberValue(row.value) : Number.NaN };
    });
    if (!Number.isFinite(dryMatter) || rows.some(({ value }) => !Number.isFinite(value))) return [];
    const nfe = dryMatter - rows.reduce((total, row) => total + row.value, 0);
    const parts = [
      { label: 'Moisture', value: 100 - dryMatter },
      ...rows.map(({ label, value }) => ({ label, value })),
      { label: 'NFE', value: nfe },
    ];

    return parts
      .map((part) => ({
        ...part,
        value: basis === 'dry-matter'
          ? (part.label === 'Moisture' ? 0 : part.value * 100 / dryMatter)
          : part.value,
        colour: compositionColours[part.label],
      }))
      .filter((part) => Number.isFinite(part.value) && part.value > 0.01);
  }, [basis, product]);

  const energyRows = groups.find((group) => group.title === 'Energy')?.rows ?? [];
  const aminoRows = groups.find((group) => group.title === 'Amino acids')?.rows ?? [];
  const hasVisualProfile = composition.length > 0 && energyRows.length > 0 && aminoRows.length > 0;
  const lysine = numberValue(aminoRows.find((row) => row.label === 'Lysine')?.value ?? '');
  const fullAnalysis = groups;
  const source = product.nutritionSource;
  const specReference = source
    ? `${source.sourceTable}${source.sourcePage ? ` · p. ${source.sourcePage}` : ''}`
    : 'Supplier specification';

  return (
    <section className="mt-[clamp(48px,6cqi,80px)] overflow-hidden rounded-[6px] border border-[#c9c3b5] bg-[#fbfaf6]">
      <header className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] gap-px border-b-2 border-[#191b18] bg-[#d9d4c7]">
        <div className="flex flex-col gap-2 bg-[#fbfaf6] p-6">
          <span className="fs-label text-[#4f524b]">Product specification</span>
          <h2 className="m-0 text-[clamp(28px,3cqi,42px)] font-bold leading-[1.02] tracking-[-.02em]">Nutritional profile</h2>
          <span className="text-[15px] text-[#3d403a]">{product.name} · {product.grade}</span>
        </div>

        <dl className="m-0 grid grid-cols-2 gap-px bg-[#d9d4c7]">
          <div className="flex flex-col gap-1 bg-[#fbfaf6] px-[18px] py-3.5">
            <dt className="fs-label text-[10px] text-[#4f524b]">Spec reference</dt>
            <dd className="fs-mono m-0 text-[13px] text-[#7a5414]">{source ? <a href={source.url} target="_blank" rel="noreferrer" className="text-[#7a5414]">{specReference}</a> : specReference}</dd>
          </div>
          <div className="flex flex-col gap-1 bg-[#fbfaf6] px-[18px] py-3.5">
            <dt className="fs-label text-[10px] text-[#4f524b]">Revision</dt>
            <dd className="fs-mono m-0 text-[13px] text-[#7a5414]">{source ? `${source.edition}th edition · ${source.year}` : 'Current listing'}</dd>
          </div>
          <div className="flex flex-col gap-1 bg-[#fbfaf6] px-[18px] py-3.5">
            <dt className="fs-label text-[10px] text-[#4f524b]">Values</dt>
            <dd className="m-0 text-[15px] font-semibold">{source ? 'Published' : 'Supplier-defined'}</dd>
          </div>
          <div className="flex flex-col gap-1.5 bg-[#fbfaf6] px-[18px] py-2.5">
            <dt className="fs-label text-[10px] text-[#4f524b]">Basis</dt>
            <dd className="m-0 flex self-start rounded-[4px] bg-[#e7e2d6] p-0.5">
              <button
                type="button"
                aria-pressed={basis === 'as-fed'}
                disabled={!canConvertBasis && sourceIsDryMatter}
                onClick={() => setBasis('as-fed')}
                className={`h-[30px] rounded-[3px] border-0 px-3 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-45 ${basis === 'as-fed' ? 'bg-[#fbfaf6] text-[#191b18] shadow-sm' : 'bg-transparent text-[#4f524b]'}`}
              >
                As fed
              </button>
              <button
                type="button"
                aria-pressed={basis === 'dry-matter'}
                disabled={!canConvertBasis && !sourceIsDryMatter}
                onClick={() => setBasis('dry-matter')}
                className={`h-[30px] rounded-[3px] border-0 px-3 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-45 ${basis === 'dry-matter' ? 'bg-[#fbfaf6] text-[#191b18] shadow-sm' : 'bg-transparent text-[#4f524b]'}`}
              >
                Dry matter
              </button>
            </dd>
          </div>
        </dl>
      </header>

      {hasVisualProfile ? (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] gap-px border-b border-[#d9d4c7] bg-[#d9d4c7]">
            <div className="flex flex-col gap-4 bg-[#fbfaf6] px-6 py-[22px]">
              <div className="flex items-baseline justify-between gap-3">
                <span className="fs-label font-semibold text-[#1d3a2a]">A · Proximate composition</span>
                <span className="fs-mono text-right text-[11px] text-[#4f524b]">{basisLabel} · % of sample</span>
              </div>
              <div className="flex h-11 overflow-hidden rounded-[3px] border border-[#c9c3b5]">
                {composition.map((part) => (
                  <span
                    key={part.label}
                    title={`${part.label} ${part.value.toFixed(1)}%`}
                    className="h-full border-r border-[#fbfaf699] transition-[width] duration-300 last:border-r-0"
                    style={{ width: `${part.value}%`, backgroundColor: part.colour }}
                  />
                ))}
              </div>
              <div className="fs-mono -mt-2.5 flex justify-between text-[10px] text-[#4f524b]"><span>0</span><span>25</span><span>50</span><span>75</span><span>100%</span></div>
              <dl className="m-0 grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-x-[18px] gap-y-2.5">
                {composition.map((part) => (
                  <div key={part.label} className="flex items-center gap-2 border-b border-[#ece8de] py-1.5">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-[2px] shadow-[inset_0_0_0_1px_rgba(25,27,24,.15)]" style={{ backgroundColor: part.colour }} />
                    <dt className="flex-1 text-[14px] text-[#3d403a]">{part.label}</dt>
                    <dd className="m-0 text-[15px] font-semibold tabular-nums">{part.value.toFixed(1)}%</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="flex flex-col gap-[18px] bg-[#fbfaf6] px-6 py-[22px]">
              <div className="flex items-baseline justify-between gap-3">
                <span className="fs-label font-semibold text-[#1d3a2a]">B · Energy values</span>
                <span className="fs-mono text-right text-[11px] text-[#4f524b]">kcal/kg · {basisLabel}</span>
              </div>
              {energyRows.map((row) => {
                const value = convertValue(product, row, basis);
                const comparison = profiledProducts
                  .filter((item) => item.id !== product.id)
                  .map((item) => {
                    const itemRow = findRow(item.nutrientGroups, row.label);
                    if (!itemRow) return null;
                    return { item, row: itemRow, value: convertValue(item, itemRow, basis) };
                  })
                  .filter((item): item is NonNullable<typeof item> => Boolean(item));
                const axisMax = Math.max(value, ...comparison.map((item) => item.value));

                return (
                  <div key={row.label} className="flex flex-col gap-2.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[15px] font-semibold">{row.label}</span>
                      <span className="text-[34px] font-semibold leading-none tracking-[-.01em] tabular-nums">{formatValue(value, row)}<span className="ml-1 text-[13px] font-medium text-[#4f524b]">{row.unit}</span></span>
                    </div>
                    <div className="relative h-3 rounded-[2px] bg-[#ece8de]">
                      <span className="absolute inset-y-0 left-0 rounded-[2px] bg-[#1d3a2a] transition-[width] duration-300" style={{ width: `${Math.min(value / axisMax * 100, 100)}%` }} />
                      {comparison.map(({ item, row: comparisonRow, value: comparisonValue }) => (
                        <span key={item.id} title={`${item.name} ${formatValue(comparisonValue, comparisonRow)}`} className="absolute -bottom-1 -top-1 w-0.5 bg-[#d99a2b]" style={{ left: `${Math.min(comparisonValue / axisMax * 100, 100)}%` }} />
                      ))}
                    </div>
                    <div className="fs-mono flex justify-between gap-3 text-[10px] text-[#4f524b]">
                      <span>0</span>
                      <span className="text-center text-[#7a5414]">▏ {comparison.map(({ item, row: comparisonRow, value: comparisonValue }) => `${item.name} ${formatValue(comparisonValue, comparisonRow)}`).join(' · ')}</span>
                      <span>{axisMax.toLocaleString('en-US')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap gap-px bg-[#d9d4c7]">
            <div className="min-w-0 flex-[2_1_560px] bg-[#fbfaf6] px-6 py-[22px]">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
                <span className="fs-label font-semibold text-[#1d3a2a]">C · Full analysis</span>
                <span className="fs-mono flex items-center gap-3.5 text-[10px] text-[#4f524b]">
                  <span className="inline-flex items-center gap-1.5"><i className="h-[9px] w-[9px] rounded-full bg-[#1d3a2a]" />This ingredient</span>
                  <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-0.5 bg-[#9a948a]" />Other profiled ingredients</span>
                </span>
              </div>
              <div role="table" aria-label="Full nutritional analysis" className="flex flex-col">
                <div role="row" className="fs-mono grid grid-cols-[minmax(0,1.3fr)_minmax(96px,auto)_minmax(0,1.5fr)] gap-5 border-b border-[#191b18] py-2 text-[10px] uppercase tracking-[.06em] text-[#4f524b] max-[620px]:grid-cols-[minmax(0,1fr)_minmax(90px,auto)]">
                  <span role="columnheader">Nutrient</span><span role="columnheader" className="text-right">Value</span><span role="columnheader" className="max-[620px]:hidden">Range across profiled ingredients</span>
                </div>
                {fullAnalysis.map((group) => (
                  <div role="rowgroup" key={group.title}>
                    <div role="row" className="fs-label border-b border-[#d9d4c7] pb-1.5 pt-3 font-semibold text-[#1d3a2a]">{group.title}</div>
                    {group.rows.map((row) => {
                      const value = convertValue(product, row, basis);
                      const comparisons = profiledProducts.map((item) => {
                        const itemRow = findRow(item.nutrientGroups, row.label);
                        return itemRow ? { item, value: convertValue(item, itemRow, basis) } : null;
                      }).filter((item): item is NonNullable<typeof item> => Boolean(item));
                      const values = comparisons.map((item) => item.value);
                      const minimum = Math.min(...values);
                      const maximum = Math.max(...values);
                      const position = (itemValue: number) => maximum === minimum ? 50 : (itemValue - minimum) / (maximum - minimum) * 100;

                      return (
                        <div role="row" key={row.label} className="grid grid-cols-[minmax(0,1.3fr)_minmax(96px,auto)_minmax(0,1.5fr)] items-center gap-5 border-b border-[#ece8de] py-[9px] max-[620px]:grid-cols-[minmax(0,1fr)_minmax(90px,auto)]">
                          <span role="cell" className="text-[15px] text-[#3d403a]">{row.label}</span>
                          <span role="cell" className="whitespace-nowrap text-right text-[16px] font-semibold tabular-nums">{formatValue(value, row)}<span className="ml-[5px] inline-block min-w-11 text-left text-[11px] font-medium text-[#4f524b]">{row.unit}</span></span>
                          <span role="cell" className="flex min-w-0 flex-col gap-0.5 max-[620px]:hidden">
                            <span className="relative block h-3.5">
                              <span className="absolute left-0 right-0 top-1.5 h-0.5 bg-[#e1dbcd]" />
                              {comparisons.filter(({ item }) => item.id !== product.id).map(({ item, value: itemValue }) => <span key={item.id} title={item.name} className="absolute top-0.5 h-2.5 w-0.5 -translate-x-px bg-[#9a948a]" style={{ left: `${position(itemValue)}%` }} />)}
                              <span className="absolute top-px h-3 w-3 -translate-x-1/2 rounded-full border-2 border-[#fbfaf6] bg-[#1d3a2a] shadow-[0_0_0_1px_#1d3a2a] transition-[left] duration-300" style={{ left: `${position(value)}%` }} />
                            </span>
                            <span className="fs-mono flex justify-between text-[10px] text-[#4f524b] tabular-nums"><span>{formatValue(minimum, row)}</span><span>{formatValue(maximum, row)}</span></span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-3.5 bg-[#fbfaf6] px-6 py-[22px]">
              <span className="fs-label font-semibold text-[#1d3a2a]">D · Amino acid balance</span>
              <span className="text-[14px] leading-[1.5] text-[#3d403a]">Each amino acid as a ratio to lysine (lysine = 100). Basis-independent.</span>
              <div className="mt-1 flex flex-col gap-3">
                {aminoRows.map((row) => {
                  const ratio = numberValue(row.value) / lysine * 100;
                  return (
                    <div key={row.label} className="grid grid-cols-[96px_minmax(0,1fr)_36px] items-center gap-3">
                      <span className="text-[14px] text-[#3d403a]">{row.label}</span>
                      <span className="block h-3.5 overflow-hidden rounded-[2px] bg-[#ece8de]"><span className={`block h-full rounded-[2px] ${row.label === 'Lysine' ? 'bg-[#1d3a2a]' : 'bg-[#5b7a52]'}`} style={{ width: `${Math.min(ratio, 100)}%` }} /></span>
                      <span className="text-right text-[15px] font-semibold tabular-nums">{Math.round(ratio)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="fs-mono ml-[108px] mr-12 flex justify-between text-[10px] text-[#4f524b]"><span>0</span><span>50</span><span>100</span></div>
            </div>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] gap-3 px-6 py-[22px]">
          {groups.map((group, groupIndex) => (
            <div key={group.title} className="flex flex-col">
              <span className="fs-label border-b border-[#191b18] pb-2 font-semibold text-[#1d3a2a]">{sectionLabel(groupIndex, group.title)}</span>
              {group.rows.map((row) => <div key={row.label} className="flex justify-between gap-3 border-b border-[#ece8de] py-2.5"><span className="text-[15px] text-[#3d403a]">{row.label}</span><span className="text-[16px] font-semibold tabular-nums">{row.value}<span className="ml-1 text-[12px] text-[#4f524b]">{row.unit}</span></span></div>)}
            </div>
          ))}
          <p className="m-0 self-end text-[14px] leading-[1.5] text-[#4f524b]">{source ? 'Only values published for this ingredient are shown; missing source values are not inferred.' : 'A supplier guaranteed analysis is required before this product can be used in a formulation.'}</p>
        </div>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-[#d9d4c7] bg-[#f3f0e8] px-6 py-4">
        <p className="fs-mono m-0 max-w-[760px] text-[11px] leading-[1.7] text-[#4f524b]">{source ? `${source.ingredientName} · ${source.title}, ${source.edition}th Edition (${source.year}) · ${source.basis}. ` : ''}CP crude protein · ME metabolisable energy · DM dry matter · NFE nitrogen-free extract, calculated by difference. Confirm published reference values against the current FeedSport batch analysis.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="h-10 rounded-[4px] border-[1.5px] border-[#191b18] bg-[#fbfaf6] px-3.5 text-[14px] font-semibold">Spec sheet (PDF)</button>
          <a href={certificateUrl} className="inline-flex h-10 items-center rounded-[4px] border-[1.5px] border-[#191b18] bg-transparent px-3.5 text-[14px] font-semibold text-[#191b18] no-underline">Request certificate of analysis</a>
        </div>
      </footer>
    </section>
  );
}
