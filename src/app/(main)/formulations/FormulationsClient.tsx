'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { analyzeDiet, type AnalyzedNutrient, type DietFormula } from '@/lib/diet-formula';
import { ingredientDefaultPricePerKg, type IngredientDefaultPrice } from '@/lib/feed-ingredient-prices';
import type { IngredientPackSize } from '@/lib/ingredient-pack-sizes';
import type { FormulationAlternativeKind, FormulationIngredientSuggestionResult, LeastCostFormulationResult } from '@/lib/feed-optimizer';
import { feedProgrammeById, feedProgrammePhaseById } from '@/lib/feed-programmes';
import { INGREDIENT_LIBRARY, ingredientLibraryForPhase, ingredientLibraryWithCommercialPremixes } from '@/lib/ingredient-nutrients';
import { commercialPremixForProgramme } from '@/lib/commercial-premixes';
import { FEED_PROGRAMMES } from '@/lib/feed-programmes';
import { resolveNutritionTargets } from '@/lib/nutrition-targets';

import QuoteIngredientsDialog, { type QuoteLine } from './QuoteIngredientsDialog';

const rows = [
  { id: 'sorghum', engineId: 'sorghum-grain', name: 'Sorghum', max: 85, step: .05 },
  { id: 'soybean', engineId: 'soybean-meal-solvent-extracted', name: 'Soybean meal', max: 45, step: .05 },
  { id: 'bran', engineId: 'wheat-bran', name: 'Wheat bran', max: 20, step: .05 },
  { id: 'sunflower', engineId: 'sunflower-meal-solvent-extracted', name: 'Sunflower meal', max: 15, step: .05 },
  { id: 'fish', engineId: 'fish-meal-54', name: 'Fish meal', max: 10, step: .05 },
  { id: 'dcp', engineId: 'dicalcium-phosphate', name: 'Dicalcium phosphate', max: 3, step: .05 },
  { id: 'limestone', engineId: 'limestone-ground', name: 'Feed limestone', max: 10, step: .05 },
  { id: 'lysine', engineId: 'l-lysine-hcl', name: 'L-Lysine HCl', max: .6, step: .01 },
  { id: 'methionine', engineId: 'dl-methionine', name: 'DL-Methionine', max: .5, step: .01 },
] as const;

type IngredientId = typeof rows[number]['id'];
type Inclusion = Record<IngredientId, number>;
type FormulationPriority = 'least-cost' | FormulationAlternativeKind;

const defaults: Inclusion = { sorghum: 70, soybean: 20, bran: 6, sunflower: 0, fish: 0, dcp: 1.2, limestone: .8, lysine: .25, methionine: .05 };
const defaultVisibleIngredientIds = rows
  .filter((row) => defaults[row.id] > 0)
  .map((row) => row.id);

const programmeChoices = FEED_PROGRAMMES
  .filter((programme) => programme.status === 'loaded' && programme.phases.length > 0 &&
    commercialPremixForProgramme(programme.id) !== undefined)
  .map((programme) => ({ id: programme.id, label: programme.name, programme }));

const priorityChoices: { id: FormulationPriority; label: string; description: string }[] = [
  { id: 'least-cost', label: 'Lowest cost', description: 'Minimizes the total ingredient cost using current planning prices.' },
  { id: 'simple', label: 'Simpler recipe', description: 'Uses fewer ingredients while remaining within 3% of the least-cost formula.' },
  { id: 'low-soy', label: 'Lower soy', description: 'Minimizes soybean-meal inclusion while remaining within the cost ceiling.' },
  { id: 'low-import', label: 'Lower imports', description: 'Prefers local inputs and penalizes regional and global imports.' },
];

const colours: Record<IngredientId | 'fixed', string> = { sorghum: '#d99a2b', soybean: '#1d3a2a', fish: '#2e5a40', sunflower: '#5b7a52', bran: '#8a9a6b', dcp: '#bdb7a9', limestone: '#cfc9bb', lysine: '#9a948a', methionine: '#7d786f', fixed: '#e7e2d6' };

type DownloadableFormulation = {
  formula: DietFormula;
  priority: FormulationPriority;
};

export default function FormulationsClient({ ingredientPrices, ingredientPackSizes }: { ingredientPrices: IngredientDefaultPrice[]; ingredientPackSizes: IngredientPackSize[] }) {
  const [inclusions, setInclusions] = useState<Inclusion>(defaults);
  const [visibleIngredientIds, setVisibleIngredientIds] = useState<IngredientId[]>(defaultVisibleIngredientIds);
  const [extraVisibleIngredientIds, setExtraVisibleIngredientIds] = useState<string[]>([]);
  const [extraInclusions, setExtraInclusions] = useState<Record<string, number>>({});
  const [balancing, setBalancing] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [formulationPriority, setFormulationPriority] = useState<FormulationPriority>('simple');
  const [formulationNote, setFormulationNote] = useState<string | null>(null);
  const [downloadableFormulation, setDownloadableFormulation] = useState<DownloadableFormulation | null>(null);
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  const [programmeId, setProgrammeId] = useState(programmeChoices[0].id);
  const selectedProgramme = programmeChoices.find((choice) => choice.id === programmeId) ?? programmeChoices[0];
  const [phaseId, setPhaseId] = useState(selectedProgramme.programme.phases[0]?.id ?? '');
  const selectedPremix = commercialPremixForProgramme(programmeId);
  const [premixPrices, setPremixPrices] = useState<Record<string, string>>({});
  const premixPriceInput = selectedPremix ? (premixPrices[selectedPremix.id] ?? '') : '';
  const premixPrice = premixPriceInput.trim() ? Number(premixPriceInput) : undefined;
  const manufacturerOnly = Boolean(selectedPremix?.manufacturerRecipe);
  const selectedPhase = selectedProgramme.programme.phases.find((phase) => phase.id === phaseId) ?? selectedProgramme.programme.phases[0];
  const selectedPriority = priorityChoices.find((priority) => priority.id === formulationPriority) ?? priorityChoices[0];
  const total = Object.values(inclusions).reduce((sum, value) => sum + value, 0) + Object.values(extraInclusions).reduce((sum, value) => sum + value, 0) + (selectedPremix?.inclusionPct ?? 0);
  const totalIsValid = Math.abs(total - 100) < .05;
  const balanceAmount = 100 - total;

  const analysis = useMemo(() => {
    const phase = feedProgrammePhaseById(programmeId, phaseId);
    if (!phase) throw new Error(`Missing formulation phase ${phaseId}.`);

    const energyTarget = phase.requirements.metabolizableEnergyKcalKg;
    if (energyTarget === undefined) throw new Error(`Missing energy target for ${phaseId}.`);

    const publicIngredientLibrary = ingredientLibraryWithCommercialPremixes(selectedPremix ? [selectedPremix] : [], ingredientLibraryForPhase(phase));
    const scale = total > 0 ? 100 / total : 0;
    const formulaIngredients = total > 0
      ? [
          ...rows
            .filter((row) => inclusions[row.id] > 0)
            .map((row) => ({
              ingredientId: row.engineId,
              inclusionPct: inclusions[row.id] * scale,
            })),
          ...Object.entries(extraInclusions)
            .filter(([, inclusionPct]) => inclusionPct > 0)
            .map(([ingredientId, inclusionPct]) => ({ ingredientId, inclusionPct: inclusionPct * scale })),
          ...(selectedPremix ? [{ ingredientId: selectedPremix.id, inclusionPct: selectedPremix.inclusionPct * scale }] : []),
        ]
      : [];
    const calculated = analyzeDiet({
      ingredients: formulaIngredients,
    }, [], publicIngredientLibrary);
    const requirements = resolveNutritionTargets(phase, { system: 'ME', kcalKg: energyTarget });
    const definitions: {
      id: string;
      label: string;
      unit: string;
      decimals: number;
      measure: AnalyzedNutrient;
      minimum: number | undefined;
    }[] = [
      { id: 'cp', label: 'Crude protein', unit: '%', decimals: 1, measure: calculated.crudeProteinPct, minimum: requirements.crudeProteinPct },
      { id: 'me', label: 'Metabolizable energy', unit: 'kcal/kg', decimals: 0, measure: calculated.energy.metabolizableKcalKg, minimum: requirements.energy.kcalKg },
      { id: 'lys', label: 'SID lysine', unit: '%', decimals: 2, measure: calculated.sidAminoAcidsPct.lysine, minimum: requirements.aminoAcids.sidLysinePct },
      { id: 'met', label: 'SID methionine + cysteine', unit: '%', decimals: 2, measure: calculated.sidAminoAcidsPct.methionineCysteine, minimum: requirements.aminoAcids.sidMethionineCysteinePct },
      { id: 'ca', label: 'Calcium', unit: '%', decimals: 2, measure: calculated.minerals.calciumPct, minimum: requirements.minerals.calciumPct },
      { id: 'p', label: 'Avail. phosphorus', unit: '%', decimals: 2, measure: calculated.minerals.availablePhosphorusPct, minimum: requirements.minerals.availablePhosphorusPct },
    ];

    return definitions.flatMap((definition) => {
      if (definition.minimum === undefined) return [];
      const value = definition.measure.value;
      const minimum = definition.minimum;
      const chartMinimum = minimum * .65;
      const chartMaximum = Math.max(minimum * 1.35, value * 1.05);
      const position = (number: number) => Math.max(0, Math.min(100, (number - chartMinimum) / (chartMaximum - chartMinimum) * 100));
      const displayTolerance = .5 * 10 ** -definition.decimals;
      const belowTarget = value + displayTolerance < minimum;
      const status = !definition.measure.complete ? 'Incomplete' : belowTarget ? 'Below' : 'Meets';
      const formatted = (number: number) => definition.decimals === 0 ? Math.round(number).toLocaleString('en-US') : number.toFixed(definition.decimals);
      return [{
        ...definition,
        value: definition.measure.complete ? formatted(value) : '—',
        range: `≥ ${formatted(minimum)}`,
        status,
        marker: position(value),
        bandStart: position(minimum),
        bandWidth: 100 - position(minimum),
        delta: !definition.measure.complete ? 'Source data incomplete' : belowTarget ? `${formatted(minimum - value)} under` : 'Target met',
      }];
    });
  }, [extraInclusions, inclusions, phaseId, programmeId, total, selectedPremix]);

  const within = analysis.filter((item) => item.status === 'Meets').length;
  const ingredientByEngineId = new Map(INGREDIENT_LIBRARY.ingredients.map((ingredient) => [ingredient.id, ingredient]));
  const mix = [
    ...rows.filter((row) => inclusions[row.id] > 0).map((row) => ({ name: row.name, value: inclusions[row.id], colour: colours[row.id] })),
    ...Object.entries(extraInclusions).filter(([, value]) => value > 0).map(([id, value]) => ({ name: ingredientByEngineId.get(id)?.name ?? id, value, colour: '#65735f' })),
    ...(selectedPremix ? [{ name: selectedPremix.name, value: selectedPremix.inclusionPct, colour: colours.fixed }] : []),
  ];
  const mixTotal = total > 0 ? total : 1;
  const visibleRows = rows.filter((row) => visibleIngredientIds.includes(row.id));
  const knownEngineIds = new Set<string>(rows.map((row) => row.engineId));
  const quoteLines: QuoteLine[] = [
    ...rows
      .filter((row) => inclusions[row.id] > 0)
      .map((row) => ({ ingredientId: row.engineId, name: row.name, inclusionPct: inclusions[row.id] })),
    ...Object.entries(extraInclusions)
      .filter(([, value]) => value > 0)
      .map(([id, value]) => ({ ingredientId: id, name: ingredientByEngineId.get(id)?.name ?? id, inclusionPct: value })),
    ...(selectedPremix ? [{ ingredientId: selectedPremix.id, name: selectedPremix.name, inclusionPct: selectedPremix.inclusionPct }] : []),
  ];


  function changeProgramme(nextProgrammeId: string) {
    const nextProgramme = programmeChoices.find((choice) => choice.id === nextProgrammeId) ?? programmeChoices[0];
    setProgrammeId(nextProgramme.id);
    setPhaseId(nextProgramme.programme.phases[0]?.id ?? '');
    const nextProduct = commercialPremixForProgramme(nextProgramme.id);
    const published = nextProduct?.manufacturerRecipe;
    if (published) {
      const mix = new Map(published.map((item) => [item.ingredientId, item.percent]));
      setInclusions(Object.fromEntries(rows.map((row) => [row.id, mix.get(row.engineId) ?? 0])) as Inclusion);
      setVisibleIngredientIds(rows.filter((row) => (mix.get(row.engineId) ?? 0) > 0).map((row) => row.id));
      const extra = published.filter((item) => item.ingredientId !== nextProduct.id && !rows.some((row) => row.engineId === item.ingredientId));
      setExtraVisibleIngredientIds(extra.map((item) => item.ingredientId));
      setExtraInclusions(Object.fromEntries(extra.map((item) => [item.ingredientId, item.percent])));
    } else {
      setInclusions(defaults);
      setVisibleIngredientIds(defaultVisibleIngredientIds);
      setExtraVisibleIngredientIds([]);
      setExtraInclusions({});
    }
    setFormulationNote(null);
    setBalanceError(null);
    setDownloadableFormulation(null);
    }

  function changePhase(nextPhaseId: string) {
    setPhaseId(nextPhaseId);
    setFormulationNote(null);
    setBalanceError(null);
    setDownloadableFormulation(null);
    }

  function markFormulaEdited() {
    setDownloadableFormulation(null);
      setFormulationNote('Ingredient amounts changed. Select “Optimize this recipe” to validate the mix and enable the formula download.');
  }

  async function calculateFormula() {
    if (!selectedPhase || !selectedPremix) return;
    setBalancing(true);
    setBalanceError(null);
    setDownloadableFormulation(null);
    setFormulationNote(null);
    try {
      if (premixPrice === undefined || !Number.isFinite(premixPrice) || premixPrice < 0) {
        throw new Error(`Enter a supplier quote in USD/kg for ${selectedPremix.sku} or request a quote below. We don't invent premix prices.`);
      }
      let pricedIngredients: Array<{
        ingredientId: string;
        pricePerKg: number;
        minInclusionPct?: number;
        maxInclusionPct?: number;
      }>;
      if (selectedPremix.manufacturerRecipe) {
        // The published CJ mix must be reproduced exactly, not reformulated.
        pricedIngredients = selectedPremix.manufacturerRecipe.map((item) => {
          const pricePerKg = item.ingredientId === selectedPremix.id
            ? premixPrice : ingredientDefaultPricePerKg(item.ingredientId, ingredientPrices);
          if (pricePerKg === undefined) {
            throw new Error(`No planning price for ${item.ingredientId}. Request a quote or use Studio for detailed costing.`);
          }
          return {
            ingredientId: item.ingredientId,
            pricePerKg,
            minInclusionPct: item.percent,
            maxInclusionPct: item.percent,
          };
        });
      } else {
        const suggestionResponse = await fetch('/api/feed-formulation/suggest', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ programmeId, phaseId, energySystem: 'ME' }),
        });
        const suggestion = await suggestionResponse.json() as FormulationIngredientSuggestionResult | { status: 'error'; message?: string };
        if (!suggestionResponse.ok || suggestion.status !== 'suggested') {
          throw new Error('message' in suggestion && suggestion.message ? suggestion.message : 'Could not prepare ingredients for this phase.');
        }
        const candidateIds = Array.from(new Set([
          ...suggestion.ingredientIds,
          ...visibleRows.map((row) => row.engineId),
          ...extraVisibleIngredientIds,
        ]));
        pricedIngredients = candidateIds.flatMap((ingredientId) => {
          const pricePerKg = ingredientDefaultPricePerKg(ingredientId, ingredientPrices);
          return pricePerKg === undefined ? [] : [{ ingredientId, pricePerKg }];
        });
        if (pricedIngredients.length === 0) {
          throw new Error('No planning prices are available for the selected ingredients.');
        }
        pricedIngredients.push({
          ingredientId: selectedPremix.id,
          pricePerKg: premixPrice,
          minInclusionPct: selectedPremix.inclusionPct,
          maxInclusionPct: selectedPremix.inclusionPct,
        });
      }
      const response = await fetch('/api/feed-formulation/optimize', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          programmeId, phaseId, energySystem: 'ME',
          includeSupplementationTargets: false,
          traceMineralBasis: 'inorganic',
          ingredients: pricedIngredients,
        }),
      });
      const result = await response.json() as (LeastCostFormulationResult & { message?: string }) | {
        status: 'manufacturer_recipe'; recipe: DietFormula; warning: string;
        cost_per_kg: number | null;
      };
      if (!response.ok) {
        throw new Error('message' in result && result.message ? result.message : 'Could not calculate this feed.');
      }
      if (result.status === 'manufacturer_recipe') {
        const amounts = new Map(result.recipe.ingredients.map((row) => [row.ingredientId, row.inclusionPct]));
        setInclusions(Object.fromEntries(rows.map((row) => [row.id, amounts.get(row.engineId) ?? 0])) as Inclusion);
        setVisibleIngredientIds(rows.filter((row) => (amounts.get(row.engineId) ?? 0) > 0).map((row) => row.id));
        const extras = result.recipe.ingredients.filter((row) =>
          row.ingredientId !== selectedPremix.id && !knownEngineIds.has(row.ingredientId) && row.inclusionPct > 0);
        setExtraVisibleIngredientIds(extras.map((row) => row.ingredientId));
        setExtraInclusions(Object.fromEntries(extras.map((row) => [row.ingredientId, row.inclusionPct])));
        setDownloadableFormulation({ formula: result.recipe, priority: 'least-cost' });
        setFormulationNote(`Manufacturer's original recipe, not independently optimised. ${result.warning}`);
        return;
      }
      if (result.status !== 'optimal') {
        throw new Error('message' in result && result.message ? result.message : 'No formula could be found for this phase.');
      }
      const alternative = formulationPriority === 'least-cost'
        ? undefined : result.alternatives.find((item) => item.id === formulationPriority);
      const chosen = alternative?.solution ?? result.solution;
      const amounts = new Map(chosen.formula.ingredients.map((row) => [row.ingredientId, row.inclusionPct]));
      setInclusions(Object.fromEntries(rows.map((row) => [row.id, amounts.get(row.engineId) ?? 0])) as Inclusion);
      setVisibleIngredientIds(rows.filter((row) => (amounts.get(row.engineId) ?? 0) > .0001).map((row) => row.id));
      const extraIds = chosen.formula.ingredients.filter((row) =>
        row.ingredientId !== selectedPremix.id && !knownEngineIds.has(row.ingredientId) && row.inclusionPct > .0001)
        .map((row) => row.ingredientId);
      setExtraVisibleIngredientIds(extraIds);
      setExtraInclusions(Object.fromEntries(extraIds.map((id) => [id, amounts.get(id) ?? 0])));
      setDownloadableFormulation({ formula: chosen.formula, priority: alternative?.id ?? 'least-cost' });
      setFormulationNote(alternative
        ? `${alternative.label} applied · ${alternative.costIncreasePct.toFixed(2)}% above least cost. Premix micronutrients unverified.`
        : 'Basal nutrient optimisation completed. Commercial premix micronutrients remain UNVERIFIED; this is not certified complete feed.');
    } catch (error) {
      setBalanceError(error instanceof Error ? error.message : String(error));
    } finally {
      setBalancing(false);
    }
  }

  function downloadFormula() {
    if (!downloadableFormulation || !selectedPremix) return;
    const cell = (parts: Array<string | number>) =>
      parts.map((part) => `"${String(part).replaceAll('"', '""')}"`).join(',');
    const labels = new Map(INGREDIENT_LIBRARY.ingredients.map((item) => [item.id, item.name]));
    const csv = [
      cell(['FeedSport public formulation', selectedProgramme.label, selectedPhase?.label ?? '']),
      cell(['Commercial premix', selectedPremix.name, 'UNVERIFIED']),
      cell(['Manufacturer reference', selectedPremix.specificationUrl]),
      cell(['Important', 'Micronutrient coverage not verified; NOT certified as complete feed']),
      ...(manufacturerOnly ? [cell(['Restriction', 'Fixed manufacturer recipe. No substitutions permitted.'])] : []),
      cell(['Ingredient', 'ID', 'Inclusion %', 'Kilograms per tonne']),
      ...downloadableFormulation.formula.ingredients.map((row) => cell([
        labels.get(row.ingredientId) ?? (row.ingredientId === selectedPremix.id ? selectedPremix.name : row.ingredientId),
        row.ingredientId,
        row.inclusionPct.toFixed(3),
        (row.inclusionPct * 10).toFixed(2),
      ])),
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `feedsport-${programmeId}-${phaseId}-recipe.csv`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <main className="fs-page bg-[#f3f0e8] [container-type:inline-size]">
      <p className="fs-mono mb-2.5 mt-0 text-[12px] uppercase tracking-[.08em] text-[#4f524b]">Formulation</p>
      <div className="mb-7 flex max-w-[760px] flex-col gap-3">
        <h1 className="fs-page-title">Will this mix meet the animal&apos;s needs?</h1>
        <p className="m-0 text-[17px] leading-[1.5] text-[#3d403a]">Choose an animal and phase to compare the mix with published requirements. A real commercial premix is selected at its manufacturer-published inclusion rate; vitamin and trace-mineral adequacy remains unverified.</p>
      </div>

      <section className="mb-5 rounded-[6px] border border-[#d9d4c7] bg-[#fbfaf6] p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div><p className="fs-label m-0 text-[#4f524b]">Step 1 · Choose requirements and priority</p><h2 className="mb-0 mt-1.5 text-[20px] font-bold">What animals are you feeding?</h2></div>
          <span className="rounded-[3px] bg-[#e3eadf] px-2.5 py-1 text-[12px] font-bold text-[#1f5c38]">Brazilian Tables 2024 / PIC</span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="flex flex-col gap-2"><span className="text-[13px] font-semibold text-[#4f524b]">Production track</span><select value={programmeId} onChange={(event) => changeProgramme(event.target.value)} className="h-12 rounded-[4px] border border-[#bdb7a9] bg-white px-3 text-[15px] font-semibold text-[#191b18]">{programmeChoices.map((choice) => <option key={choice.id} value={choice.id}>{choice.label}</option>)}</select></label>
          <label className="flex flex-col gap-2"><span className="text-[13px] font-semibold text-[#4f524b]">Feeding phase</span><select value={selectedPhase?.id ?? ''} onChange={(event) => changePhase(event.target.value)} className="h-12 rounded-[4px] border border-[#bdb7a9] bg-white px-3 text-[15px] font-semibold text-[#191b18]">{selectedProgramme.programme.phases.map((phase) => <option key={phase.id} value={phase.id}>{phase.label.charAt(0).toUpperCase() + phase.label.slice(1)}</option>)}</select></label>
          <label className="flex flex-col gap-2"><span className="text-[13px] font-semibold text-[#4f524b]">Formulation priority</span><select value={formulationPriority} onChange={(event) => { setFormulationPriority(event.target.value as FormulationPriority); setFormulationNote(null); setDownloadableFormulation(null); }} className="h-12 rounded-[4px] border border-[#bdb7a9] bg-white px-3 text-[15px] font-semibold text-[#191b18]">{priorityChoices.map((priority) => <option key={priority.id} value={priority.id}>{priority.label}</option>)}</select></label>
        </div>
        {selectedPremix ? (
          <div className="mt-4 grid gap-3 rounded-[4px] border border-[#dccda5] bg-[#fff9ec] p-4 md:grid-cols-[minmax(0,1fr)_190px]">
            <div>
              <p className="mb-1 mt-0 text-[12px] font-bold uppercase tracking-wide text-[#78591e]">Commercial premix · Unverified</p>
              <p className="mb-1 text-[15px] font-bold">{selectedPremix.name}</p>
              <p className="my-1 text-[13px] text-[#4f524b]">
                Published inclusion: {selectedPremix.inclusionKgPerTonne} kg/t ({selectedPremix.inclusionPct}%). {selectedPremix.application}.
              </p>
              {selectedPremix.manufacturerRecipe ? (
                <p className="my-1 text-[13px] font-semibold text-[#84511a]">
                  Fixed manufacturer recipe: published ingredient proportions are locked. No substitutions.
                </p>
              ) : null}
              <a className="text-[13px] font-semibold underline" href={selectedPremix.specificationUrl}
                target="_blank" rel="noopener noreferrer">Manufacturer specification</a>
            </div>
            <label className="flex flex-col gap-2 text-[13px] font-semibold">
              Supplier quote (USD/kg)
              <input type="number" min="0" step="0.01" inputMode="decimal"
                placeholder="Price per kg" value={premixPriceInput}
                onChange={(event) => {
                  setPremixPrices((current) => ({ ...current, [selectedPremix.id]: event.target.value }));
                  setDownloadableFormulation(null);
                  setFormulationNote(null);
                }}
                className="h-11 w-full rounded-[4px] border border-[#bdb7a9] bg-white px-3 text-[14px] font-semibold"
              />
              <small className="font-normal leading-5 text-[#6d4b12]">We do not assume a price. Preview and request a quote without one.</small>
            </label>
          </div>
        ) : null}
        <p className="mb-0 mt-3 text-[13px] leading-5 text-[#4f524b]">{selectedProgramme.programme.description} {selectedPhase ? `Source: Table ${selectedPhase.sourceTable}${selectedPhase.periodLabel ? ` · ${selectedPhase.periodLabel}` : ''}.` : ''} <b className="text-[#191b18]">Priority:</b> {selectedPriority.description}</p>
      </section>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,440px),1fr))] items-start gap-5">
        <section className="rounded-[6px] border border-[#d9d4c7] bg-[#fbfaf6]">
          <div className="flex items-center justify-between gap-3 border-b border-[#191b18] px-5 py-4"><div><p className="fs-label m-0 text-[#4f524b]">Step 2 · Enter the mix</p><h2 className="mb-0 mt-1 text-[19px] font-bold">Ingredients</h2></div><span className={`rounded-[3px] px-2.5 py-1 text-[13px] font-bold tabular-nums ${totalIsValid ? 'bg-[#e3eadf] text-[#1f5c38]' : 'bg-[#f6e0d9] text-[#8f3420]'}`}>Total {total.toFixed(1)}%</span></div>
          {visibleRows.map((row) => <div key={row.id} className="grid grid-cols-[minmax(110px,1fr)_minmax(100px,2fr)_64px] items-center gap-3.5 border-b border-[#ece8de] px-5 py-3"><span className="text-[15px] font-semibold">{row.name}</span><input disabled={manufacturerOnly} type="range" min="0" max={row.max} step={row.step} value={inclusions[row.id]} aria-label={`${row.name} inclusion`} onChange={(event) => { setInclusions((current) => ({ ...current, [row.id]: Number(event.target.value) })); markFormulaEdited(); }} className="w-full"/><span className="text-right text-[16px] font-semibold tabular-nums">{inclusions[row.id] < 1 && inclusions[row.id] > 0 ? inclusions[row.id].toFixed(2) : inclusions[row.id].toFixed(1)}%</span></div>)}
          {extraVisibleIngredientIds.map((ingredientId) => { const ingredient = ingredientByEngineId.get(ingredientId); const value = extraInclusions[ingredientId] ?? 0; return <div key={ingredientId} className="grid grid-cols-[minmax(110px,1fr)_minmax(100px,2fr)_64px] items-center gap-3.5 border-b border-[#ece8de] px-5 py-3"><span className="text-[15px] font-semibold">{ingredient?.name ?? ingredientId}</span><input disabled={manufacturerOnly} type="range" min="0" max={ingredient?.constraints.maxInclusionPct ?? 100} step="0.01" value={value} aria-label={`${ingredient?.name ?? ingredientId} inclusion`} onChange={(event) => { setExtraInclusions((current) => ({ ...current, [ingredientId]: Number(event.target.value) })); markFormulaEdited(); }} className="w-full"/><span className="text-right text-[16px] font-semibold tabular-nums">{value < 1 && value > 0 ? value.toFixed(2) : value.toFixed(1)}%</span></div>; })}
          <div className="grid grid-cols-[minmax(110px,1fr)_minmax(100px,2fr)_64px] items-center gap-3.5 px-5 py-3"><span className="text-[15px] font-semibold">{selectedPremix?.name ?? 'No premix selected'}</span><span className="text-[13px] text-[#4f524b]">Manufacturer dose · {selectedPremix?.inclusionKgPerTonne ?? '—'} kg/tonne · UNVERIFIED</span><span className="text-right text-[16px] font-semibold tabular-nums">{(selectedPremix?.inclusionPct ?? 0).toFixed(2)}%</span></div>
          {!totalIsValid ? <div className="border-t border-[#ece8de] bg-[#fff8eb] px-5 py-3 text-[13px] leading-5 text-[#6d4b12]"><b>{Math.abs(balanceAmount).toFixed(1)}% {balanceAmount > 0 ? 'still unallocated' : 'over 100%'}.</b> The preview is normalized for comparison. “Optimize this recipe” will calculate a new 100% formula for this phase.</div> : null}
          {balanceError ? <div className="border-t border-[#ece8de] bg-[#f6e0d9] px-5 py-3 text-[13px] leading-5 text-[#8f3420]">{balanceError}</div> : null}
          
          {formulationNote ? <div className="border-t border-[#ece8de] bg-[#e3eadf] px-5 py-3 text-[13px] leading-5 text-[#1f5c38]">{formulationNote}</div> : null}
          <div className="flex flex-wrap gap-2.5 border-t border-[#d9d4c7] px-5 py-4"><button type="button" onClick={() => void calculateFormula()} disabled={balancing || !selectedPhase} className="h-[42px] rounded-[4px] border-[1.5px] border-[#191b18] bg-transparent px-4 text-[14px] font-semibold disabled:cursor-not-allowed disabled:opacity-40">{balancing ? 'Calculating…' : manufacturerOnly ? 'Cost manufacturer recipe' : 'Optimize this recipe'}</button><button type="button" onClick={downloadFormula} disabled={!downloadableFormulation || balancing} title={downloadableFormulation ? 'Download the source-labelled recipe CSV' : 'Calculate the recipe before downloading'} className="h-[42px] rounded-[4px] border-[1.5px] border-[#191b18] bg-[#fbfaf6] px-4 text-[14px] font-semibold text-[#191b18] disabled:cursor-not-allowed disabled:opacity-40">Download recipe CSV</button><button type="button" onClick={() => setQuoteDialogOpen(true)} disabled={balancing} className="inline-flex h-[42px] items-center rounded-[4px] bg-[#d99a2b] px-4 text-[14px] font-semibold text-[#191b18] disabled:cursor-not-allowed disabled:opacity-40">Quote ingredients</button></div>
        </section>

        <section className="rounded-[6px] border border-[#d9d4c7] bg-[#fbfaf6] px-5 pb-4">
          <div className="flex items-center justify-between gap-3 border-b border-[#191b18] py-4"><div><p className="fs-label m-0 text-[#4f524b]">Step 3 · Review the result</p><h2 className="mb-0 mt-1 text-[19px] font-bold">Core requirements</h2></div><span className={`rounded-[3px] px-2.5 py-1 text-[13px] font-bold ${within === analysis.length ? 'bg-[#e3eadf] text-[#1f5c38]' : 'bg-[#f6e0d9] text-[#8f3420]'}`}>{within} of {analysis.length} met</span></div>
          <div className="mb-2 mt-4 flex h-7 overflow-hidden rounded-[3px]">{mix.map((item) => <div key={item.name} title={item.name} style={{ width: `${item.value / mixTotal * 100}%`, background: item.colour }}/>)}</div>
          <div className="mb-1 flex flex-wrap gap-x-3.5 gap-y-1 text-[12px] text-[#4f524b]">{mix.map((item) => <span key={item.name} className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-[2px]" style={{ background: item.colour }}/>{item.name}</span>)}</div>
          {analysis.map((item) => <div key={item.id} className="grid gap-2 border-b border-[#ece8de] py-3.5"><div className="flex items-baseline justify-between gap-3"><span className="text-[15px] font-semibold">{item.label}</span><span className="flex items-baseline gap-2.5"><span className="text-[22px] font-semibold tabular-nums">{item.value}<small className="ml-1 text-[12px] font-normal text-[#4f524b]">{item.unit}</small></span><span className={`min-w-14 rounded-[3px] px-2 py-[3px] text-center text-[12px] font-bold ${item.status === 'Meets' ? 'bg-[#e3eadf] text-[#1f5c38]' : item.status === 'Below' ? 'bg-[#f6e0d9] text-[#8f3420]' : 'bg-[#f5e7cc] text-[#7a5414]'}`}>{item.status}</span></span></div><div className="relative h-2 rounded-[4px] bg-[#e7e2d6]"><i className="absolute inset-y-0 rounded-[2px] bg-[#b9cdb5]" style={{ left: `${item.bandStart}%`, width: `${item.bandWidth}%` }}/><i className={`absolute -bottom-1 -top-1 w-1 -translate-x-1/2 rounded-[2px] ${item.status === 'Meets' ? 'bg-[#2e7d4f]' : item.status === 'Below' ? 'bg-[#b5452c]' : 'bg-[#b7791f]'}`} style={{ left: `${item.marker}%` }}/></div><div className="fs-mono flex justify-between gap-3 text-[11px] text-[#4f524b]"><span>Target {item.range} {item.unit}</span><span>{item.delta}</span></div></div>)}
          <div className="mt-4 rounded-[4px] bg-[#f3f0e8] p-3 text-[12px] leading-5 text-[#4f524b]"><b className="text-[#191b18]">What this check covers:</b> energy, protein, two key SID amino-acid measures, calcium and available phosphorus. The selected named premix uses its published dose, but its vitamins and trace minerals are NOT VERIFIED. Even if basal nutrient targets are met, this does not establish complete-feed adequacy.</div>
          <p className="fs-mono mb-0 mt-3.5 text-[11px] leading-[1.6] text-[#4f524b]">Calculated with the same source-backed ingredient matrix and phase requirements as FeedSport&apos;s formulation engine.</p>
        </section>
      </div>

      <section className="mt-6 grid overflow-hidden rounded-[6px] bg-[#1d3a2a] text-white md:grid-cols-2">
        <div className="flex flex-col items-start gap-3 px-6 py-8 md:px-12 md:py-12">
          <p className="fs-label m-0 inline-flex items-center gap-2.5 text-[#d99a2b]"><i aria-hidden className="h-2.5 w-2.5 rotate-45 bg-[#d99a2b]"/>Formulation Studio</p>
          <h2 className="m-0 text-[clamp(26px,2.8cqi,38px)] font-bold leading-[1.1] tracking-[-.03em] [font-stretch:115%]">Need more than a quick check?</h2>
          <p className="m-0 max-w-[560px] text-[16px] leading-[1.55] text-[#dfe6dc]">Use the full ingredient catalogue and nutrient model, set your own inclusion limits and prices, then save, version and compare formulations.</p>
          <div className="mt-auto pt-3"><Link href="/studio" className="inline-flex h-[52px] items-center gap-3 rounded-[4px] bg-[#fbfaf6] px-7 text-[16px] font-semibold text-[#191b18] no-underline hover:bg-white hover:text-[#191b18]">Open Formulation Studio<span aria-hidden>→</span></Link></div>
        </div>
        <div className="flex flex-col items-start gap-3 border-t border-[#3d5a48] px-6 py-8 md:border-l md:border-t-0 md:px-12 md:py-12">
          <p className="fs-label m-0 inline-flex items-center gap-2.5 text-[#dfe6dc]"><i aria-hidden className="h-2.5 w-2.5 rounded-full bg-[#dfe6dc]"/>Nutritionist review</p>
          <h2 className="m-0 text-[clamp(26px,2.8cqi,38px)] font-bold leading-[1.1] tracking-[-.03em] [font-stretch:115%]">Want a nutritionist to review it?</h2>
          <p className="m-0 max-w-[560px] text-[16px] leading-[1.55] text-[#dfe6dc]">Send the completed formula to FeedSport for a practical review.</p>
          <div className="mt-auto pt-3"><a href="https://wa.me/263774684534?text=Please%20review%20my%20feed%20formulation" className="inline-flex h-[52px] items-center rounded-[4px] border border-[#dfe6dc] px-7 text-[16px] font-semibold text-white no-underline hover:bg-white/10 hover:text-white">Ask a nutritionist</a></div>
        </div>
      </section>
      <QuoteIngredientsDialog
        open={quoteDialogOpen}
        onOpenChange={setQuoteDialogOpen}
        mixLabel={`${selectedProgramme.label.toLowerCase()} ${selectedPhase?.label ?? 'feed'}`}
        lines={quoteLines}
        packSizes={ingredientPackSizes}
      />
    </main>
  );
}
