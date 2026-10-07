'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { analyzeDiet, type AnalyzedNutrient, type DietFormula } from '@/lib/diet-formula';
import { ingredientDefaultPricePerKg, type IngredientDefaultPrice } from '@/lib/feed-ingredient-prices';
import type { IngredientPackSize } from '@/lib/ingredient-pack-sizes';
import type { FormulationAlternativeKind, FormulationIngredientSuggestionResult, LeastCostFormulationResult } from '@/lib/feed-optimizer';
import { feedProgrammeById, feedProgrammePhaseById } from '@/lib/feed-programmes';
import { INGREDIENT_LIBRARY, ingredientLibraryWithCustomPremixes } from '@/lib/ingredient-nutrients';
import { resolveNutritionTargets } from '@/lib/nutrition-targets';
import {
  PUBLIC_PREMIX_ID,
  PUBLIC_PREMIX_INCLUSION_PCT,
  PUBLIC_PREMIX_KG_PER_TONNE,
  publicPremixProfileForPhase,
} from '@/lib/public-feed-premix';

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

const programmeChoices = [
  { id: 'grow-finish-pig', label: 'Pig · Standard performance' },
  { id: 'grow-finish-pig-high-performance', label: 'Pig · High performance' },
  { id: 'broiler-standard', label: 'Broiler · Standard performance' },
].map((choice) => {
  const programme = feedProgrammeById(choice.id);
  if (!programme) throw new Error(`Missing formulation programme ${choice.id}.`);
  return { ...choice, programme };
});

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
  const [ingredientPickerOpen, setIngredientPickerOpen] = useState(false);
  const [ingredientToAdd, setIngredientToAdd] = useState('');
  const [balancing, setBalancing] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [formulationPriority, setFormulationPriority] = useState<FormulationPriority>('simple');
  const [formulationNote, setFormulationNote] = useState<string | null>(null);
  const [downloadableFormulation, setDownloadableFormulation] = useState<DownloadableFormulation | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  const lastAutomaticFormulaKey = useRef<string | null>(null);
  const [programmeId, setProgrammeId] = useState(programmeChoices[0].id);
  const selectedProgramme = programmeChoices.find((choice) => choice.id === programmeId) ?? programmeChoices[0];
  const [phaseId, setPhaseId] = useState(selectedProgramme.programme.phases[0]?.id ?? '');
  const selectedPhase = selectedProgramme.programme.phases.find((phase) => phase.id === phaseId) ?? selectedProgramme.programme.phases[0];
  const selectedPriority = priorityChoices.find((priority) => priority.id === formulationPriority) ?? priorityChoices[0];
  const total = Object.values(inclusions).reduce((sum, value) => sum + value, 0) + Object.values(extraInclusions).reduce((sum, value) => sum + value, 0) + PUBLIC_PREMIX_INCLUSION_PCT;
  const totalIsValid = Math.abs(total - 100) < .05;
  const balanceAmount = 100 - total;

  const analysis = useMemo(() => {
    const phase = feedProgrammePhaseById(programmeId, phaseId);
    if (!phase) throw new Error(`Missing formulation phase ${phaseId}.`);

    const energyTarget = phase.requirements.metabolizableEnergyKcalKg;
    if (energyTarget === undefined) throw new Error(`Missing energy target for ${phaseId}.`);

    const publicIngredientLibrary = ingredientLibraryWithCustomPremixes([publicPremixProfileForPhase(phase)]);
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
          { ingredientId: PUBLIC_PREMIX_ID, inclusionPct: PUBLIC_PREMIX_INCLUSION_PCT * scale },
        ]
      : [{ ingredientId: PUBLIC_PREMIX_ID, inclusionPct: 100 }];
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
  }, [extraInclusions, inclusions, phaseId, programmeId, total]);

  const within = analysis.filter((item) => item.status === 'Meets').length;
  const ingredientByEngineId = new Map(INGREDIENT_LIBRARY.ingredients.map((ingredient) => [ingredient.id, ingredient]));
  const mix = [
    ...rows.filter((row) => inclusions[row.id] > 0).map((row) => ({ name: row.name, value: inclusions[row.id], colour: colours[row.id] })),
    ...Object.entries(extraInclusions).filter(([, value]) => value > 0).map(([id, value]) => ({ name: ingredientByEngineId.get(id)?.name ?? id, value, colour: '#65735f' })),
    { name: 'Vitamin-mineral premix', value: PUBLIC_PREMIX_INCLUSION_PCT, colour: colours.fixed },
  ];
  const mixTotal = total > 0 ? total : 1;
  const visibleRows = rows.filter((row) => visibleIngredientIds.includes(row.id));
  const knownEngineIds = new Set<string>(rows.map((row) => row.engineId));
  const selectedEngineIds = new Set<string>([
    ...visibleRows.map((row) => row.engineId),
    ...extraVisibleIngredientIds,
  ]);
  const ingredientsAvailableToAdd = [
    ...rows
      .filter((row) => !visibleIngredientIds.includes(row.id))
      .map((row) => ({ engineId: row.engineId, name: row.name })),
    ...INGREDIENT_LIBRARY.ingredients
      .filter((ingredient) => !knownEngineIds.has(ingredient.id) && !selectedEngineIds.has(ingredient.id))
      .map((ingredient) => ({ engineId: ingredient.id, name: ingredient.name })),
  ];
  const quoteLines: QuoteLine[] = [
    ...rows
      .filter((row) => inclusions[row.id] > 0)
      .map((row) => ({ ingredientId: row.engineId, name: row.name, inclusionPct: inclusions[row.id] })),
    ...Object.entries(extraInclusions)
      .filter(([, value]) => value > 0)
      .map(([id, value]) => ({ ingredientId: id, name: ingredientByEngineId.get(id)?.name ?? id, inclusionPct: value })),
    { ingredientId: PUBLIC_PREMIX_ID, name: 'Vitamin-mineral premix', inclusionPct: PUBLIC_PREMIX_INCLUSION_PCT },
  ];

  useEffect(() => {
    const automaticFormulaKey = `${programmeId}:${phaseId}:${formulationPriority}`;
    if (!selectedPhase || lastAutomaticFormulaKey.current === automaticFormulaKey) return;
    lastAutomaticFormulaKey.current = automaticFormulaKey;
    void calculateFormula();
  }, [formulationPriority, phaseId, programmeId]);

  function changeProgramme(nextProgrammeId: string) {
    const nextProgramme = programmeChoices.find((choice) => choice.id === nextProgrammeId) ?? programmeChoices[0];
    setProgrammeId(nextProgramme.id);
    setPhaseId(nextProgramme.programme.phases[0]?.id ?? '');
    setFormulationNote(null);
    setBalanceError(null);
    setDownloadableFormulation(null);
    setDownloadError(null);
  }

  function changePhase(nextPhaseId: string) {
    setPhaseId(nextPhaseId);
    setFormulationNote(null);
    setBalanceError(null);
    setDownloadableFormulation(null);
    setDownloadError(null);
  }

  function markFormulaEdited() {
    setDownloadableFormulation(null);
    setDownloadError(null);
    setFormulationNote('Ingredient amounts changed. Select “Optimize this recipe” to validate the mix and enable the formula download.');
  }

  function openIngredientPicker() {
    const firstAvailable = ingredientsAvailableToAdd[0];
    if (!firstAvailable) return;
    setIngredientToAdd(firstAvailable.engineId);
    setIngredientPickerOpen(true);
  }

  function addIngredient() {
    if (!ingredientToAdd) return;
    const knownRow = rows.find((row) => row.engineId === ingredientToAdd);
    if (knownRow) {
      setVisibleIngredientIds((current) => [...current, knownRow.id]);
    } else {
      setExtraVisibleIngredientIds((current) => [...current, ingredientToAdd]);
      setExtraInclusions((current) => ({ ...current, [ingredientToAdd]: 0 }));
    }
    setIngredientToAdd('');
    setIngredientPickerOpen(false);
    markFormulaEdited();
  }

  async function calculateFormula() {
    if (!selectedPhase) return;
    setBalancing(true);
    setBalanceError(null);
    setDownloadError(null);
    setDownloadableFormulation(null);
    setFormulationNote(null);

    try {
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
      const pricedIngredients = candidateIds.flatMap((ingredientId) => {
        const pricePerKg = ingredientDefaultPricePerKg(ingredientId, ingredientPrices);
        return pricePerKg === undefined ? [] : [{ ingredientId, pricePerKg }];
      });
      if (pricedIngredients.length === 0) {
        throw new Error('No planning prices are available for the selected ingredients.');
      }
      const premixProfile = publicPremixProfileForPhase(selectedPhase);

      const response = await fetch('/api/feed-formulation/optimize', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          programmeId,
          phaseId,
          energySystem: 'ME',
          includeSupplementationTargets: true,
          traceMineralBasis: 'inorganic',
          customPremixes: [premixProfile],
          ingredients: [
            ...pricedIngredients,
            {
              ingredientId: PUBLIC_PREMIX_ID,
              pricePerKg: ingredientDefaultPricePerKg(PUBLIC_PREMIX_ID, ingredientPrices) ?? 0,
              minInclusionPct: PUBLIC_PREMIX_INCLUSION_PCT,
              maxInclusionPct: PUBLIC_PREMIX_INCLUSION_PCT,
            },
          ],
        }),
      });
      const result = await response.json() as LeastCostFormulationResult & { message?: string };
      if (!response.ok || result.status !== 'optimal') {
        throw new Error(result.message ?? 'No balanced formula could be found for this programme and phase.');
      }

      const selectedAlternative = formulationPriority === 'least-cost'
        ? undefined
        : result.alternatives.find((alternative) => alternative.id === formulationPriority);
      const selectedRecipe = selectedAlternative?.solution ?? result.solution;
      const solution = new Map(
        selectedRecipe.formula.ingredients.map((ingredient) => [ingredient.ingredientId, ingredient.inclusionPct]),
      );
      const nextKnown = Object.fromEntries(
        rows.map((row) => [row.id, solution.get(row.engineId) ?? 0]),
      ) as Inclusion;
      const nextExtraIds = selectedRecipe.formula.ingredients
        .filter((ingredient) => ingredient.ingredientId !== PUBLIC_PREMIX_ID && !knownEngineIds.has(ingredient.ingredientId) && ingredient.inclusionPct > .0001)
        .map((ingredient) => ingredient.ingredientId);
      const nextExtras = Object.fromEntries(
        nextExtraIds.map((ingredientId) => [ingredientId, solution.get(ingredientId) ?? 0]),
      );

      setInclusions(nextKnown);
      setVisibleIngredientIds(rows.filter((row) => (solution.get(row.engineId) ?? 0) > .0001).map((row) => row.id));
      setExtraVisibleIngredientIds(nextExtraIds);
      setExtraInclusions(nextExtras);
      setDownloadableFormulation({
        formula: selectedRecipe.formula,
        priority: selectedAlternative?.id ?? 'least-cost',
      });
      setIngredientPickerOpen(false);
      if (formulationPriority !== 'least-cost' && !selectedAlternative) {
        setFormulationNote(`${selectedPriority.label} did not produce a materially different valid recipe, so the lowest-cost formula was applied.`);
      } else if (selectedAlternative) {
        setFormulationNote(`${selectedAlternative.label} applied · ${selectedAlternative.costIncreasePct.toFixed(2)}% above the least-cost formula.`);
      } else {
        setFormulationNote('Lowest-cost valid formula applied using current planning prices.');
      }
    } catch (error) {
      setBalanceError(error instanceof Error ? error.message : String(error));
    } finally {
      setBalancing(false);
    }
  }

  async function openDetailedPdf() {
    if (!downloadableFormulation || !selectedPhase) return;
    const viewerWindow = window.open('', '_blank');
    if (!viewerWindow) {
      setDownloadError('Your browser blocked the PDF tab. Allow pop-ups for this site and try again.');
      return;
    }
    viewerWindow.opener = null;
    viewerWindow.document.title = 'Preparing formulation PDF…';
    viewerWindow.document.body.textContent = 'Preparing your detailed formulation PDF…';
    setDownloadingPdf(true);
    setDownloadError(null);
    try {
      const response = await fetch('/api/feed-formulation/report', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ programmeId, phaseId, ...downloadableFormulation }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => null) as { message?: string } | null;
        throw new Error(error?.message ?? 'Could not open the formulation PDF.');
      }
      const pdfUrl = URL.createObjectURL(await response.blob());
      viewerWindow.location.replace(pdfUrl);
      window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 10 * 60 * 1000);
    } catch (error) {
      viewerWindow.close();
      setDownloadError(error instanceof Error ? error.message : String(error));
    } finally {
      setDownloadingPdf(false);
    }
  }

  return (
    <main className="fs-page bg-[#f3f0e8] [container-type:inline-size]">
      <p className="fs-mono mb-2.5 mt-0 text-[12px] uppercase tracking-[.08em] text-[#4f524b]">Formulation</p>
      <div className="mb-7 flex max-w-[760px] flex-col gap-3">
        <h1 className="fs-page-title">Will this mix meet the animal&apos;s needs?</h1>
        <p className="m-0 text-[17px] leading-[1.5] text-[#3d403a]">Choose the production programme and feeding phase, then adjust your ingredient percentages. We&apos;ll compare the mix with the published requirements for that exact phase.</p>
      </div>

      <section className="mb-5 rounded-[6px] border border-[#d9d4c7] bg-[#fbfaf6] p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div><p className="fs-label m-0 text-[#4f524b]">Step 1 · Choose requirements and priority</p><h2 className="mb-0 mt-1.5 text-[20px] font-bold">What animals are you feeding?</h2></div>
          <span className="rounded-[3px] bg-[#e3eadf] px-2.5 py-1 text-[12px] font-bold text-[#1f5c38]">Brazilian Tables 2024</span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="flex flex-col gap-2"><span className="text-[13px] font-semibold text-[#4f524b]">Production track</span><select value={programmeId} onChange={(event) => changeProgramme(event.target.value)} className="h-12 rounded-[4px] border border-[#bdb7a9] bg-white px-3 text-[15px] font-semibold text-[#191b18]">{programmeChoices.map((choice) => <option key={choice.id} value={choice.id}>{choice.label}</option>)}</select></label>
          <label className="flex flex-col gap-2"><span className="text-[13px] font-semibold text-[#4f524b]">Feeding phase</span><select value={selectedPhase?.id ?? ''} onChange={(event) => changePhase(event.target.value)} className="h-12 rounded-[4px] border border-[#bdb7a9] bg-white px-3 text-[15px] font-semibold text-[#191b18]">{selectedProgramme.programme.phases.map((phase) => <option key={phase.id} value={phase.id}>{phase.label.charAt(0).toUpperCase() + phase.label.slice(1)}</option>)}</select></label>
          <label className="flex flex-col gap-2"><span className="text-[13px] font-semibold text-[#4f524b]">Formulation priority</span><select value={formulationPriority} onChange={(event) => { setFormulationPriority(event.target.value as FormulationPriority); setFormulationNote(null); setDownloadableFormulation(null); setDownloadError(null); }} className="h-12 rounded-[4px] border border-[#bdb7a9] bg-white px-3 text-[15px] font-semibold text-[#191b18]">{priorityChoices.map((priority) => <option key={priority.id} value={priority.id}>{priority.label}</option>)}</select></label>
        </div>
        <p className="mb-0 mt-3 text-[13px] leading-5 text-[#4f524b]">{selectedProgramme.programme.description} {selectedPhase ? `Source: Table ${selectedPhase.sourceTable}${selectedPhase.periodLabel ? ` · ${selectedPhase.periodLabel}` : ''}.` : ''} <b className="text-[#191b18]">Priority:</b> {selectedPriority.description}</p>
      </section>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,440px),1fr))] items-start gap-5">
        <section className="rounded-[6px] border border-[#d9d4c7] bg-[#fbfaf6]">
          <div className="flex items-center justify-between gap-3 border-b border-[#191b18] px-5 py-4"><div><p className="fs-label m-0 text-[#4f524b]">Step 2 · Enter the mix</p><h2 className="mb-0 mt-1 text-[19px] font-bold">Ingredients</h2></div><span className={`rounded-[3px] px-2.5 py-1 text-[13px] font-bold tabular-nums ${totalIsValid ? 'bg-[#e3eadf] text-[#1f5c38]' : 'bg-[#f6e0d9] text-[#8f3420]'}`}>Total {total.toFixed(1)}%</span></div>
          {visibleRows.map((row) => <div key={row.id} className="grid grid-cols-[minmax(110px,1fr)_minmax(100px,2fr)_64px] items-center gap-3.5 border-b border-[#ece8de] px-5 py-3"><span className="text-[15px] font-semibold">{row.name}</span><input type="range" min="0" max={row.max} step={row.step} value={inclusions[row.id]} aria-label={`${row.name} inclusion`} onChange={(event) => { setInclusions((current) => ({ ...current, [row.id]: Number(event.target.value) })); markFormulaEdited(); }} className="w-full"/><span className="text-right text-[16px] font-semibold tabular-nums">{inclusions[row.id] < 1 && inclusions[row.id] > 0 ? inclusions[row.id].toFixed(2) : inclusions[row.id].toFixed(1)}%</span></div>)}
          {extraVisibleIngredientIds.map((ingredientId) => { const ingredient = ingredientByEngineId.get(ingredientId); const value = extraInclusions[ingredientId] ?? 0; return <div key={ingredientId} className="grid grid-cols-[minmax(110px,1fr)_minmax(100px,2fr)_64px] items-center gap-3.5 border-b border-[#ece8de] px-5 py-3"><span className="text-[15px] font-semibold">{ingredient?.name ?? ingredientId}</span><input type="range" min="0" max={ingredient?.constraints.maxInclusionPct ?? 100} step="0.01" value={value} aria-label={`${ingredient?.name ?? ingredientId} inclusion`} onChange={(event) => { setExtraInclusions((current) => ({ ...current, [ingredientId]: Number(event.target.value) })); markFormulaEdited(); }} className="w-full"/><span className="text-right text-[16px] font-semibold tabular-nums">{value < 1 && value > 0 ? value.toFixed(2) : value.toFixed(1)}%</span></div>; })}
          <div className="grid grid-cols-[minmax(110px,1fr)_minmax(100px,2fr)_64px] items-center gap-3.5 px-5 py-3"><span className="text-[15px] font-semibold">Vitamin-mineral premix</span><span className="text-[13px] text-[#4f524b]">Fixed · {PUBLIC_PREMIX_KG_PER_TONNE} kg/tonne</span><span className="text-right text-[16px] font-semibold tabular-nums">{PUBLIC_PREMIX_INCLUSION_PCT.toFixed(1)}%</span></div>
          {!totalIsValid ? <div className="border-t border-[#ece8de] bg-[#fff8eb] px-5 py-3 text-[13px] leading-5 text-[#6d4b12]"><b>{Math.abs(balanceAmount).toFixed(1)}% {balanceAmount > 0 ? 'still unallocated' : 'over 100%'}.</b> The preview is normalized for comparison. “Optimize this recipe” will calculate a new 100% formula for this phase.</div> : null}
          {balanceError ? <div className="border-t border-[#ece8de] bg-[#f6e0d9] px-5 py-3 text-[13px] leading-5 text-[#8f3420]">{balanceError}</div> : null}
          {downloadError ? <div className="border-t border-[#ece8de] bg-[#f6e0d9] px-5 py-3 text-[13px] leading-5 text-[#8f3420]">{downloadError}</div> : null}
          {formulationNote ? <div className="border-t border-[#ece8de] bg-[#e3eadf] px-5 py-3 text-[13px] leading-5 text-[#1f5c38]">{formulationNote}</div> : null}
          {ingredientPickerOpen ? <div className="flex flex-wrap items-end gap-2 border-t border-[#ece8de] bg-[#f3f0e8] px-5 py-4"><label className="flex min-w-[220px] flex-1 flex-col gap-1.5"><span className="text-[12px] font-semibold text-[#4f524b]">Ingredient to add</span><select autoFocus value={ingredientToAdd} onChange={(event) => setIngredientToAdd(event.target.value)} className="h-[42px] rounded-[4px] border border-[#bdb7a9] bg-white px-3 text-[14px] text-[#191b18]">{ingredientsAvailableToAdd.map((ingredient) => <option key={ingredient.engineId} value={ingredient.engineId}>{ingredient.name}</option>)}</select></label><button type="button" onClick={addIngredient} className="h-[42px] rounded-[4px] bg-[#1d3a2a] px-4 text-[14px] font-semibold text-white">Add</button><button type="button" onClick={() => setIngredientPickerOpen(false)} className="h-[42px] rounded-[4px] border border-[#bdb7a9] bg-transparent px-4 text-[14px] font-semibold">Cancel</button></div> : null}
          <div className="flex flex-wrap gap-2.5 border-t border-[#d9d4c7] px-5 py-4"><button type="button" onClick={() => void calculateFormula()} disabled={balancing || !selectedPhase} className="h-[42px] rounded-[4px] border-[1.5px] border-[#191b18] bg-transparent px-4 text-[14px] font-semibold disabled:cursor-not-allowed disabled:opacity-40">{balancing ? 'Optimizing…' : 'Optimize this recipe'}</button><button type="button" onClick={openIngredientPicker} disabled={ingredientsAvailableToAdd.length === 0 || ingredientPickerOpen || balancing} className="h-[42px] rounded-[4px] border-[1.5px] border-[#191b18] bg-transparent px-4 text-[14px] font-semibold disabled:cursor-not-allowed disabled:opacity-40">Add ingredient</button><button type="button" onClick={() => void openDetailedPdf()} disabled={!downloadableFormulation || balancing || downloadingPdf} title={downloadableFormulation ? 'Open the detailed formulation PDF in a new tab' : 'Optimize the recipe before downloading the formula'} className="h-[42px] rounded-[4px] border-[1.5px] border-[#191b18] bg-[#fbfaf6] px-4 text-[14px] font-semibold text-[#191b18] disabled:cursor-not-allowed disabled:opacity-40">{downloadingPdf ? 'Preparing formula…' : 'Download Formula'}</button></div><div className="px-5 pb-4"><button type="button" onClick={() => setQuoteDialogOpen(true)} disabled={balancing} className="inline-flex h-[42px] items-center rounded-[4px] bg-[#d99a2b] px-4 text-[14px] font-semibold text-[#191b18] disabled:cursor-not-allowed disabled:opacity-40">Quote ingredients</button></div>
        </section>

        <section className="rounded-[6px] border border-[#d9d4c7] bg-[#fbfaf6] px-5 pb-4">
          <div className="flex items-center justify-between gap-3 border-b border-[#191b18] py-4"><div><p className="fs-label m-0 text-[#4f524b]">Step 3 · Review the result</p><h2 className="mb-0 mt-1 text-[19px] font-bold">Core requirements</h2></div><span className={`rounded-[3px] px-2.5 py-1 text-[13px] font-bold ${within === analysis.length ? 'bg-[#e3eadf] text-[#1f5c38]' : 'bg-[#f6e0d9] text-[#8f3420]'}`}>{within} of {analysis.length} met</span></div>
          <div className="mb-2 mt-4 flex h-7 overflow-hidden rounded-[3px]">{mix.map((item) => <div key={item.name} title={item.name} style={{ width: `${item.value / mixTotal * 100}%`, background: item.colour }}/>)}</div>
          <div className="mb-1 flex flex-wrap gap-x-3.5 gap-y-1 text-[12px] text-[#4f524b]">{mix.map((item) => <span key={item.name} className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-[2px]" style={{ background: item.colour }}/>{item.name}</span>)}</div>
          {analysis.map((item) => <div key={item.id} className="grid gap-2 border-b border-[#ece8de] py-3.5"><div className="flex items-baseline justify-between gap-3"><span className="text-[15px] font-semibold">{item.label}</span><span className="flex items-baseline gap-2.5"><span className="text-[22px] font-semibold tabular-nums">{item.value}<small className="ml-1 text-[12px] font-normal text-[#4f524b]">{item.unit}</small></span><span className={`min-w-14 rounded-[3px] px-2 py-[3px] text-center text-[12px] font-bold ${item.status === 'Meets' ? 'bg-[#e3eadf] text-[#1f5c38]' : item.status === 'Below' ? 'bg-[#f6e0d9] text-[#8f3420]' : 'bg-[#f5e7cc] text-[#7a5414]'}`}>{item.status}</span></span></div><div className="relative h-2 rounded-[4px] bg-[#e7e2d6]"><i className="absolute inset-y-0 rounded-[2px] bg-[#b9cdb5]" style={{ left: `${item.bandStart}%`, width: `${item.bandWidth}%` }}/><i className={`absolute -bottom-1 -top-1 w-1 -translate-x-1/2 rounded-[2px] ${item.status === 'Meets' ? 'bg-[#2e7d4f]' : item.status === 'Below' ? 'bg-[#b5452c]' : 'bg-[#b7791f]'}`} style={{ left: `${item.marker}%` }}/></div><div className="fs-mono flex justify-between gap-3 text-[11px] text-[#4f524b]"><span>Target {item.range} {item.unit}</span><span>{item.delta}</span></div></div>)}
          <div className="mt-4 rounded-[4px] bg-[#f3f0e8] p-3 text-[12px] leading-5 text-[#4f524b]"><b className="text-[#191b18]">What this check covers:</b> energy, protein, two key SID amino-acid measures, calcium and available phosphorus. The fixed 1% premix supplies the selected phase&apos;s published vitamin and inorganic trace-mineral supplementation targets. The formulation engine validates those targets along with the full nutrient model.</div>
          <p className="fs-mono mb-0 mt-3.5 text-[11px] leading-[1.6] text-[#4f524b]">Calculated with the same source-backed ingredient matrix and phase requirements as FeedSport&apos;s formulation engine.</p>
        </section>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-[6px] bg-[#1d3a2a] px-6 py-[22px] text-white"><div className="flex flex-col gap-1"><span className="text-[18px] font-bold">Want a nutritionist to review it?</span><span className="text-[15px] text-[#dfe6dc]">Send the completed formula to FeedSport for a practical review.</span></div><a href="https://wa.me/263774684534?text=Please%20review%20my%20feed%20formulation" className="inline-flex h-[46px] items-center rounded-[4px] border border-[#dfe6dc] px-[18px] text-[15px] font-semibold text-white no-underline">Ask a nutritionist</a></div>
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
