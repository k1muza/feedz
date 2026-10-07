'use client';

import { useState } from 'react';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { IngredientPackSize } from '@/lib/ingredient-pack-sizes';

export type QuoteLine = {
  ingredientId: string;
  name: string;
  inclusionPct: number;
};

const batchPresetsKg = [500, 1000, 5000];

const formatKg = (kg: number) => `${Number(kg.toFixed(kg < 10 ? 2 : 1)).toLocaleString('en-US')} kg`;
const formatPct = (value: number) => Number(value.toFixed(2)).toString();

export default function QuoteIngredientsDialog({
  open,
  onOpenChange,
  mixLabel,
  lines,
  packSizes,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mixLabel: string;
  lines: QuoteLine[];
  packSizes: IngredientPackSize[];
}) {
  const [batchKgInput, setBatchKgInput] = useState('1000');
  const batchKg = Number(batchKgInput);
  const batchIsValid = Number.isFinite(batchKg) && batchKg > 0;

  // Normalize so the batch splits exactly, even when the mix doesn't total 100%.
  const totalPct = lines.reduce((sum, line) => sum + line.inclusionPct, 0) || 1;
  const packSizeByIngredient = new Map(packSizes.map((pack) => [pack.ingredientId, pack.packSizeKg]));
  const quantities = lines.map((line) => {
    const sharePct = line.inclusionPct / totalPct * 100;
    const neededKg = batchIsValid ? batchKg * sharePct / 100 : 0;
    const packSizeKg = packSizeByIngredient.get(line.ingredientId);
    const packs = packSizeKg ? Math.ceil(neededKg / packSizeKg) : undefined;
    return { ...line, sharePct, neededKg, packSizeKg, packs, orderKg: packSizeKg && packs ? packs * packSizeKg : neededKg };
  });

  const quoteText = [
    `Please quote the ingredients for ${formatKg(batchKg)} of this ${mixLabel} mix:`,
    ...quantities.map((line) => line.packSizeKg && line.packs
      ? `- ${line.name} (${formatPct(line.sharePct)}%): ${line.packs} × ${formatKg(line.packSizeKg)} = ${formatKg(line.orderKg)}`
      : `- ${line.name} (${formatPct(line.sharePct)}%): ${formatKg(line.neededKg)}`),
  ].join('\n');
  const quoteHref = `https://wa.me/263774684534?text=${encodeURIComponent(quoteText)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[560px] overflow-y-auto rounded-[6px] border-[#d9d4c7] bg-[#fbfaf6] text-[#191b18]">
        <DialogHeader>
          <DialogTitle className="text-[19px] font-bold">How much feed do you want to make?</DialogTitle>
          <DialogDescription className="text-[14px] leading-5 text-[#4f524b]">
            We&apos;ll prepare a WhatsApp quote request with each ingredient rounded up to the smallest bag we sell.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex h-[42px] items-center gap-2 rounded-[4px] border-[1.5px] border-[#191b18] bg-white px-3">
            <span className="sr-only">Batch size in kg</span>
            <input
              type="number"
              inputMode="decimal"
              min={1}
              step={50}
              value={batchKgInput}
              onChange={(event) => setBatchKgInput(event.target.value)}
              className="w-24 bg-transparent text-[15px] font-semibold tabular-nums outline-none"
            />
            <span className="text-[14px] text-[#4f524b]">kg</span>
          </label>
          {batchPresetsKg.map((presetKg) => (
            <button
              key={presetKg}
              type="button"
              onClick={() => setBatchKgInput(String(presetKg))}
              className={`h-[42px] rounded-[4px] border-[1.5px] px-3 text-[14px] font-semibold ${batchKg === presetKg ? 'border-[#191b18] bg-[#191b18] text-white' : 'border-[#d9d4c7] bg-transparent'}`}
            >
              {presetKg >= 1000 ? `${presetKg / 1000} t` : `${presetKg} kg`}
            </button>
          ))}
        </div>

        {!batchIsValid && (
          <p className="m-0 text-[14px] text-[#8f3420]">Enter a batch size greater than 0 kg.</p>
        )}

        <a
          href={batchIsValid ? quoteHref : undefined}
          aria-disabled={!batchIsValid}
          target="_blank"
          rel="noreferrer"
          className={`inline-flex h-[46px] items-center justify-center rounded-[4px] bg-[#d99a2b] px-4 text-[15px] font-semibold text-[#191b18] no-underline ${batchIsValid ? '' : 'pointer-events-none opacity-40'}`}
        >
          Request quote on WhatsApp
        </a>
      </DialogContent>
    </Dialog>
  );
}
