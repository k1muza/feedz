import { animalImages, knowledgeImages, productImages, type UnsplashImage } from '@/data/unsplashImages';

export type KnowledgeArticle = {
  // Database id; absent for the in-code articles used before Supabase is connected.
  id?: string;
  status?: 'draft' | 'published';
  slug: string;
  title: string;
  // Shorter or more search-focused <title>; falls back to `title`.
  seoTitle?: string;
  description: string;
  topic: string;
  image: UnsplashImage;
  published: string;
  updated: string;
  // Product ids from the catalogue, linked from the article and its product pages.
  ingredients: string[];
  keywords: string[];
  keyPoints: string[];
  // GitHub-flavoured markdown. Start sections at ##; the page renders the h1.
  body: string;
};

export const knowledgeTopics = ['Pig nutrition', 'Poultry nutrition', 'Cattle nutrition', 'Feed ingredients', 'Feed formulation', 'Farm economics', 'Feed manufacturing'];

export const articleAuthor = 'FeedSport Nutrition Team';

// Seed content for the articles table, and the fallback when Supabase is not connected.
// Once the database is connected, edit articles in /admin/blog instead.
export const knowledgeArticles: KnowledgeArticle[] = [
  {
    slug: 'feeding-pigs-by-stage-phase-feeding',
    title: 'Feeding pigs by stage: a practical guide to phase feeding',
    seoTitle: 'Feeding Pigs by Stage: A Practical Guide to Phase Feeding',
    description: 'How to match feed to each stage of a pig\'s life, from creep feed to finisher and the breeding herd, and how to use feed conversion ratio to check your feeding pays.',
    topic: 'Pig nutrition',
    image: knowledgeImages['piglets suckling'],
    published: '2026-10-06',
    updated: '2026-10-06',
    ingredients: ['soybean-meal', 'sorghum', 'lysine', 'premix'],
    keywords: ['phase feeding pigs', 'pig feeding stages', 'pig starter grower finisher feed', 'sow feeding', 'pig feed conversion ratio'],
    keyPoints: [
      'Feed is usually 60–75% of the cost of raising a pig to market, so how you feed drives profit.',
      'Step pigs down to lower-protein diets as they grow: pre-starter, starter, grower, then finisher.',
      'Sows and boars need their own gestation, lactation and breeder feeds.',
      'Track feed conversion ratio (FCR) per pen to see whether your feeding is paying off.',
    ],
    body: `
Feed is the single biggest cost in pig production, usually around 60 to 75% of what it costs to raise a pig to market. That means the way you feed has more effect on your profit than almost any other decision on the farm.

Many smallholder and commercial farmers still give one feed to pigs of all ages. It seems simpler, but it wastes money in two directions. Young pigs get too little protein to grow well, while older pigs get more protein than they can use and simply excrete the expensive surplus.

This article explains how to match feed to each stage of a pig's life, a practice called phase feeding, and how to check whether your feeding is actually paying off.

## What phase feeding is

Phase feeding means changing the diet as the pig grows, so that what it eats matches what its body needs at that moment. A piglet and a finishing pig are almost different animals in terms of nutrition.

The logic is simple. A young pig is building muscle and bone fast, so it needs a feed rich in protein, especially the amino acid [lysine](/products/lysine), and easy to digest. As the pig gets older, growth slows and more of what it eats goes to fat and maintenance. Its need for protein falls, while its appetite for energy stays high.

Protein sources such as [soybean meal](/products/soybean-meal) and fishmeal are the most expensive ingredients in a pig diet. Energy sources such as maize are cheaper. So each time you step a pig down to a lower-protein diet at the right weight, you cut the cost per kilogram of feed without hurting growth.

Most farms use four to five feeds for growing pigs, plus separate feeds for sows. The table below gives a general picture. Exact figures vary with breed, genetics and feed supplier, so treat these as approximate guides rather than fixed rules.

| Stage | Typical live weight | Approximate crude protein | Main goal |
| --- | --- | --- | --- |
| Pre-starter (creep) | 2 to 8 kg | 20 to 22% | Get piglets eating solid feed before weaning |
| Starter (weaner) | 8 to 25 kg | 18 to 20% | Keep pigs growing through the stress of weaning |
| Grower | 25 to 60 kg | 16 to 18% | Build lean muscle efficiently |
| Finisher | 60 kg to market | 14 to 16% | Reach market weight at the lowest feed cost |

## Pre-starter and starter: getting weaners off to a strong start

The first weeks of a pig's life set the pace for everything that follows. A piglet that stalls after weaning often reaches market days or weeks later than its penmates, eating extra feed the whole way.

Pre-starter (often called creep feed) is offered to piglets while they are still suckling, usually from about 7 to 10 days old. They eat very little of it at first. The point is to get their gut used to solid feed, so weaning is less of a shock.

Weaning is stressful. The piglet loses its mother's milk, is often moved and mixed with other litters, and its gut is still immature. It is common for weaners to eat little for the first day or two and lose condition. A good starter feed helps by being:

- **Highly digestible**, with ingredients such as milk products, cooked cereals and quality protein that a young gut can handle
- **Palatable**, so pigs start eating quickly
- **Rich in lysine** and other amino acids for fast muscle growth
- **Fresh**, offered little and often so it does not go stale in the feeder

These diets cost more per bag than grower or finisher feed, but pigs eat only small amounts of them. Cutting corners here tends to cost more later in slow growth and scouring.

Change from pre-starter to starter gradually over a few days by mixing the two feeds. Sudden changes upset the gut.

## Grower: building lean muscle

The grower phase runs from roughly 25 kg to 60 kg. This is when pigs convert feed into lean meat most efficiently, so it is the stage where good feeding pays off fastest.

Growers should have feed available at all times, or be fed enough that a little is left in the feeder at each meal. Restricting feed at this stage usually slows growth more than it saves money.

The diet can now rely more on locally available ingredients like maize and soybean meal, balanced with a vitamin and mineral [premix](/products/premix). Protein drops a little from the starter feed, but amino acid balance still matters. A grower feed short of lysine will produce a fatter, slower-growing pig even if the crude protein figure on the label looks fine. For more on this, see [feeding growers: protein, energy and lysine in practice](/knowledge/feeding-grower-pigs-protein-energy-lysine).

Water is just as important as feed. A growing pig drinks roughly two to three litres of water for every kilogram of feed it eats, more in hot weather. If drinkers are blocked or the water is warm and dirty, feed intake and growth drop.

## Finisher: reaching market weight at the lowest cost

From about 60 kg until slaughter, pigs eat the largest amount of feed of their lives. A finisher can eat 2.5 to 3 kg a day, so even a small saving per kilogram of feed adds up quickly across a batch.

At this stage the pig's need for protein is at its lowest, while its appetite is at its highest. Feeding a grower diet to finishers is one of the most common and expensive mistakes on pig farms. The extra protein does not produce extra meat; the pig simply breaks it down and excretes it.

The flip side is fat. If finishers get more energy than they need, they lay down excess back fat, and many abattoirs pay less for fat carcasses. Your target market matters here. Talk to your buyer about the carcass weight and grade they pay best for, and plan your finishing period around it.

Keep pigs on finisher feed through to market rather than switching back to cheaper scraps or bran in the final weeks. Those last weeks are when the pig puts on weight that you are paid for.

## Sows and boars: feeding the breeding herd

Breeding animals need their own feeds because their goals are different. You are not trying to grow them as fast as possible; you are trying to keep them productive for many litters.

**Gestation (pregnant sows).** A pregnant sow needs a moderate, controlled ration, typically around 2 to 2.5 kg a day of a gestation feed, adjusted to her body condition. Too much feed makes sows fat, which can lead to difficult farrowing and poor appetite later when she is feeding piglets. Too little leaves her thin and weakens the next litter. Many farmers raise the ration slightly in the last three to four weeks of pregnancy, when the piglets grow fastest.

**Lactation (sows with piglets).** Once she farrows, the sow's needs change sharply. Producing milk for a full litter takes a lot of energy and protein, so she should move onto a richer lactation feed and be fed generously. Build up her intake over the first few days after farrowing, then let her eat as much as she wants. A sow that loses too much condition while feeding a litter is slower to come back on heat and may have smaller litters next time.

**Boars.** A working boar needs a balanced diet that keeps him fit and active without getting fat, often around 2 to 3 kg a day of a breeder feed, depending on his size and how often he is used.

## Feed conversion ratio: measuring whether your feeding pays

Feed conversion ratio (FCR) tells you how many kilograms of feed it takes to produce one kilogram of live weight gain. It is the most useful single number for judging your feeding.

$$
\\text{FCR} = \\frac{\\text{feed eaten (kg)}}{\\text{weight gained (kg)}}
$$

A lower FCR is better. For example, if a batch of pigs eats 1,500 kg of feed and gains a total of 500 kg, the FCR is 1,500 ÷ 500 = 3.0. Each kilogram of weight gain cost 3 kg of feed.

To work it out on your farm:

1. Weigh the pigs, or a sample of them, when they go into a pen. A weighband is a cheap option if you have no scale.
2. Record every bag of feed that goes into that pen.
3. Weigh the pigs again when they leave, or at the end of each feeding phase.
4. Divide total feed used by total weight gained.

As a rough guide, young weaners convert feed very efficiently, often at an FCR below 2, while finishers are closer to 3 or higher. Your overall figure from weaning to market depends on genetics, health and housing as well as feed.

The real value comes from tracking FCR over time. If it suddenly worsens, look for causes such as feed wastage, disease, poor water supply, cold or overcrowded pens, or a change in feed quality. To turn FCR into money, see [feed cost per kg of gain](/knowledge/feed-cost-per-kg-gain).

## Common feeding mistakes and how to avoid them

- **One feed for all ages.** Young pigs grow slowly and older pigs waste protein. Use at least a starter, grower and finisher feed.
- **Feed wastage.** Badly adjusted or overfilled feeders can waste 5 to 10% of feed or more. Set feeders so only a small amount of feed shows in the trough, and fix broken ones quickly.
- **Diluting balanced feed.** Mixing a complete feed with extra maize, bran or kitchen waste upsets its balance. If you do mix your own feed, use a concentrate or premix designed for that purpose and follow the mixing guide.
- **Poor storage.** Feed kept in damp or hot conditions can grow mould, which may produce toxins that cut growth and harm sow fertility. Store bags off the floor, away from walls, in a dry, cool place, and use older stock first.
- **Sudden feed changes.** Switching diets overnight can cause scouring and a dip in intake. Mix old and new feed over three to five days.
- **Ignoring water.** Pigs that cannot drink enough will not eat enough. Check drinkers daily.

## Putting it into practice

Phase feeding is not complicated. It comes down to giving each pig the feed that matches its age and weight, changing diets gradually, cutting wastage, and keeping records so you can see what is working.

Start small if you need to. Even moving from one feed to separate grower and finisher feeds, and tracking FCR on a single pen, will show you where your money is going.

If you are unsure which feed suits your pigs at each stage, or want help planning a feeding programme for your herd, [get in touch with the FeedSport team](/contact). We are happy to help you match the right feed to every stage.
`,
  },
  {
    slug: 'how-to-formulate-pig-feed',
    title: 'How to formulate pig feed: a step-by-step guide',
    seoTitle: 'How to Formulate Pig Feed: Step-by-Step Guide for Farmers',
    description: 'A practical method for formulating pig feed from local ingredients: set nutrient targets, balance energy and lysine, add minerals and premix, then check the result.',
    topic: 'Feed formulation',
    image: animalImages.pigs,
    published: '2026-10-06',
    updated: '2026-10-06',
    ingredients: ['sorghum', 'soybean-meal', 'lysine', 'dcp', 'limestone', 'premix'],
    keywords: ['pig feed formulation', 'how to make pig feed', 'pig feed formula Zimbabwe', 'Pearson square pig feed', 'grower pig diet'],
    keyPoints: [
      'Formulate for one class of pig at a time: weaner, grower, finisher, dry sow or lactating sow.',
      'Balance energy and digestible lysine first. Crude protein follows.',
      'Reserve 3–4% of the mix for minerals, salt and premix before you balance the main ingredients.',
      'Check the finished diet against every target, not only protein.',
    ],
    body: `
Formulating pig feed means choosing ingredients and inclusion rates so that every kilogram of feed supplies what the pig needs for its stage of production, at the lowest practical cost. You can do it with a calculator and a notebook, but the steps are the same whether you use paper, a spreadsheet or our [formulation tool](/formulations).

## Step 1: Decide which pig you are feeding

A 10 kg weaner, a 70 kg finisher and a lactating sow need very different diets. Pick one class and formulate for it. The common classes are:

| Class | Typical live weight | What matters most |
| --- | --- | --- |
| Creep / weaner | 5–25 kg | Highly digestible protein, palatability |
| Grower | 25–60 kg | Lysine supply for lean growth |
| Finisher | 60–110 kg | Energy, feed cost |
| Dry (gestating) sow | — | Controlled energy, fibre for satiety |
| Lactating sow | — | High energy and lysine to protect milk yield |

## Step 2: Set your nutrient targets

At minimum, write down targets for:

- **Energy** (metabolisable or net energy, in kcal/kg)
- **Standardised ileal digestible (SID) lysine** (%)
- **Calcium** and **digestible phosphorus** (%)
- **Sodium or salt** (%)

Use a recognised reference for the numbers. Our formulation tool uses the Brazilian Tables for Poultry and Swine (2024), which are well suited to tropical conditions and ingredients such as sorghum and sunflower meal. Genetics suppliers also publish targets for their own pig lines.

Lysine is the first limiting amino acid in almost every pig diet built on cereals and soybean meal. That makes it more useful than crude protein: two diets with the same crude protein can supply very different amounts of digestible lysine.

## Step 3: List your ingredients with specifications and prices

For each ingredient, record crude protein, energy for pigs, lysine, calcium and phosphorus on the same basis (usually as fed), and the delivered price per kilogram. Use the supplier's specification, not a figure from memory. Our product pages show typical values for [sorghum](/products/sorghum), [soybean meal](/products/soybean-meal) and the other ingredients we stock. See also [how to read a feed ingredient specification](/knowledge/how-to-read-feed-ingredient-specification).

## Step 4: Reserve space for minerals, salt and premix

Before balancing the main ingredients, set aside the small-inclusion items. A typical grower diet reserves about 3–4% for:

- [Dicalcium phosphate](/products/dcp) for phosphorus and calcium
- [Feed limestone](/products/limestone) for calcium
- Salt
- [Vitamin and trace-mineral premix](/products/premix) at the manufacturer's stated inclusion

That leaves about 96–97% of the mix for energy and protein ingredients.

## Step 5: Balance energy and protein ingredients

With two main ingredients, the Pearson square is a quick way to find a starting ratio. For example, to reach about 16% crude protein from sorghum (8.65% CP) and soybean meal (45.6% CP):

1. Subtract the target from the protein meal: 45.6 − 16 = 29.6 parts sorghum.
2. Subtract the cereal from the target: 16 − 8.65 = 7.35 parts soybean meal.
3. Total parts: 29.6 + 7.35 = 36.95.
4. Sorghum: 29.6 ÷ 36.95 = 80%. Soybean meal: 7.35 ÷ 36.95 = 20%.

Because you reserved 3–4% for minerals and premix, you need to raise the protein target slightly (16 ÷ 0.965 ≈ 16.6%) before doing the square, then scale the result to 96.5% of the mix.

The Pearson square balances one nutrient only. Treat its answer as a first draft, then check lysine and energy. If lysine falls short, you can add more soybean meal or add a small amount of [L-lysine HCl](/products/lysine). Crystalline lysine is often the cheaper way to close a gap and lets you reduce expensive protein meal.

## Step 6: Check every nutrient

Multiply each ingredient's nutrient content by its inclusion rate and add them up. Compare the totals with your targets for energy, SID lysine, calcium, digestible phosphorus and salt. Adjust and repeat. This is where a formulation tool saves time: it does the arithmetic for every nutrient at once and shows which targets are below or above range.

## Step 7: Mix it properly and record what you did

Even a well-balanced formula fails if it is badly mixed. Small-inclusion items like premix and lysine need a pre-blend step. See [mixing on farm: getting an even mix](/knowledge/on-farm-feed-mixing). Write down the formula, the ingredient batches used and the date, so you can link performance back to the feed.

## When to ask for help

Get a formulation reviewed if you are changing a main ingredient, feeding a new genetic line, or seeing poorer growth or feed conversion than expected. Send us your ingredient list and targets on WhatsApp and we will check it with you.
`,
  },
  {
    slug: 'feeding-grower-pigs-protein-energy-lysine',
    title: 'Feeding growers: protein, energy and lysine in practice',
    seoTitle: 'Feeding Grower Pigs: Protein, Energy and Lysine Explained',
    description: 'How to tell whether a grower pig diet is short on energy or lysine, and what to change first. Practical guidance for pig farmers and feed mixers.',
    topic: 'Pig nutrition',
    image: knowledgeImages['pigs at the trough'],
    published: '2026-10-06',
    updated: '2026-10-06',
    ingredients: ['sorghum', 'soybean-meal', 'lysine', 'methionine'],
    keywords: ['grower pig feed', 'lysine for pigs', 'pig grower diet protein', 'pig feed energy', 'ideal protein pigs'],
    keyPoints: [
      'Grower pigs (about 25–60 kg) build lean tissue fast, so lysine supply drives growth.',
      'A lysine shortfall shows as slower growth, poorer feed conversion and fatter pigs.',
      'An energy shortfall shows as pigs eating more but still growing slowly and looking lean.',
      'Fix the limiting nutrient first, then balance the other amino acids to lysine.',
    ],
    body: `
The grower phase, roughly 25 to 60 kg live weight, is when pigs lay down lean meat fastest. It is also where a poorly balanced diet costs the most, because feed intake is rising quickly and every tonne of feed counts.

## Energy: the fuel for growth

Energy sets the pace. Pigs partly eat to meet their energy needs, so a low-energy diet makes them eat more, up to the limit of their gut capacity. In hot weather, or with bulky high-fibre diets, they hit that limit sooner and growth slows.

Cereal grains provide most of the energy in a grower diet. [Sorghum](/products/sorghum) is a good energy grain for pigs. On our specification it supplies about 3,358 kcal ME per kg as fed. Fibrous ingredients such as wheat bran and sunflower meal dilute energy and should be kept low in grower diets.

## Lysine: the nutrient that limits lean growth

Protein is made of amino acids, and pigs need them in roughly fixed proportions. Lysine is almost always the first one to run short in cereal and soybean meal diets, so lysine supply effectively sets the ceiling on lean growth.

Formulate on **standardised ileal digestible (SID) lysine**, not total lysine or crude protein. SID values account for how much of each ingredient's lysine the pig actually absorbs.

Once lysine is right, balance the other essential amino acids as a ratio to it. This is the "ideal protein" approach. Approximate ratios commonly used for growers are:

| Amino acid | Ratio to SID lysine |
| --- | --- |
| Methionine + cysteine | about 58–60% |
| Threonine | about 63–65% |
| Tryptophan | about 18–20% |
| Valine | about 65–70% |

## Crude protein: a result, not a target

Crude protein is still worth checking, but it is better treated as a result of meeting the amino acid targets. Adding crystalline [L-lysine HCl](/products/lysine), and where needed [methionine](/products/methionine), lets you meet amino acid targets with less soybean meal. That usually lowers cost and reduces the nitrogen pigs excrete.

Do not push crude protein too low with synthetic amino acids alone. Once threonine, tryptophan or valine become limiting, growth drops even if lysine looks fine.

## Reading the pigs: what a shortfall looks like

| What you see | Likely cause | First thing to check |
| --- | --- | --- |
| Slow growth, poor feed conversion, pigs carry more fat | Lysine or amino acid shortfall | SID lysine and the energy-to-lysine ratio |
| Pigs eat a lot but stay lean and grow slowly | Energy shortfall or very fibrous diet | Energy density and fibre level |
| Uneven growth within a pen | Feeder space, water, mixing or health | Feeder access, water flow, mix uniformity |
| Sudden drop in intake | Heat, water problems, feed spoilage | Water supply, feed freshness, temperature |

Feed is not the only possible cause. Disease, water supply, stocking density and genetics all affect growth. Rule them out before reformulating.

## The energy-to-lysine ratio

Energy and lysine work together. If you raise energy without raising lysine, pigs eat slightly less feed and may end up short of lysine per day. If you raise lysine without enough energy, the extra amino acids are burned for energy instead of building lean meat. Keep the ratio of SID lysine to energy consistent with your reference tables when you change either one.

## Practical steps

1. Get current specifications for your grain and protein meal.
2. Check the diet's SID lysine and energy against targets for the pigs' weight range.
3. If lysine is short, add soybean meal or a small amount of L-lysine HCl, then check threonine and methionine.
4. If energy is short, reduce fibrous ingredients or increase the grain share.
5. Recheck the full diet in the [formulation tool](/formulations) before mixing.

For a full walk-through of building a diet, see [how to formulate pig feed](/knowledge/how-to-formulate-pig-feed).
`,
  },
  {
    slug: 'how-to-read-feed-ingredient-specification',
    title: 'How to read a feed ingredient specification',
    seoTitle: 'How to Read a Feed Ingredient Specification Sheet',
    description: 'As-fed or dry matter, typical or batch values, and why the basis matters when you compare feed ingredient suppliers. A practical guide for feed buyers.',
    topic: 'Feed ingredients',
    image: knowledgeImages['spec sheet on a bag'],
    published: '2026-10-06',
    updated: '2026-10-06',
    ingredients: ['soybean-meal', 'sunflower-meal', 'sorghum', 'dcp'],
    keywords: ['feed ingredient specification', 'as fed vs dry matter', 'certificate of analysis feed', 'proximate analysis feed', 'compare feed suppliers'],
    keyPoints: [
      'Always check the basis: as-fed and dry-matter values are not comparable.',
      'A typical specification describes the product in general. A certificate of analysis describes one batch.',
      'Energy and digestible nutrients are species-specific. Compare pig values with pig values.',
      'Compare suppliers on cost per unit of the nutrient you are buying, such as cost per kg of protein.',
    ],
    body: `
A specification sheet tells you what is in an ingredient. Read carefully, it lets you compare suppliers fairly and formulate with confidence. Read carelessly, it can make a weaker product look like a bargain.

## As-fed versus dry matter

This is the most common source of confusion.

- **As-fed** (or "as is") values describe the ingredient as delivered, including its moisture.
- **Dry-matter (DM)** values describe the ingredient with all water removed.

Because dry-matter figures exclude water, they are always higher. To convert:

> Dry-matter value = as-fed value ÷ (DM% ÷ 100)

For example, sorghum at 8.65% crude protein as fed and 88% dry matter contains 8.65 ÷ 0.88 ≈ 9.8% protein on a dry-matter basis. If one supplier quotes DM and another quotes as-fed, the first will look better on paper without being better.

Most pig and poultry formulation is done on an as-fed basis. Most ruminant work uses dry matter. Our [product pages](/products) state the basis next to each value.

## Typical, guaranteed and batch values

- **Typical values** describe the product in general. They are useful for planning and first formulations.
- **Guaranteed values** are minimums or maximums the supplier commits to, for example "protein not less than 44%".
- **A certificate of analysis (CoA)** reports a laboratory analysis of a specific batch.

For high-value or variable ingredients, especially protein meals, ask for the batch CoA and reformulate if the result differs much from the typical value.

## The proximate analysis

Most specifications start with the proximate analysis:

| Item | What it tells you |
| --- | --- |
| Moisture | Water content. Above about 13–14% in grains increases the risk of mould. |
| Crude protein | Nitrogen × 6.25. A rough measure of protein, not of its quality. |
| Crude fat (ether extract) | Oil content, a major contributor to energy. |
| Crude fibre | Hard-to-digest structural material. Higher fibre usually means lower energy for pigs and poultry. |
| Ash | Total mineral content. High ash in a protein meal can indicate sand or soil. |

## Energy is species-specific

An ingredient has different energy values for different animals because they digest it differently. A specification may list ME for pigs, AMEn for poultry, and TDN or NE for cattle. Only compare like with like, and use the value for the animal you are feeding.

## Amino acids and digestibility

For pigs and poultry, the amino acid profile matters more than crude protein. Look for **digestible** amino acids (SID for pigs, standardised or true digestible for poultry), not only totals. Two soybean meals with the same crude protein can differ in digestible lysine if one was overheated or underheated during processing.

## Phosphorus: total versus digestible

Much of the phosphorus in plant ingredients is bound as phytate, which pigs and poultry digest poorly. Specifications for [dicalcium phosphate](/products/dcp) and other mineral sources often list digestible phosphorus (for example STTD phosphorus for pigs) as well as total phosphorus. Formulate on the digestible figure.

## Comparing suppliers fairly

Compare the price of the nutrient you are buying, not the price of the bag. For protein meals:

> Cost per kg of protein = price per kg ÷ (crude protein% ÷ 100)

With illustrative prices, a 46% protein meal at US$0.60/kg costs about US$1.30 per kg of protein. A 33% protein meal at US$0.40/kg costs about US$1.21 per kg of protein. The cheaper bag here is also slightly cheaper protein. But the 33% meal brings more fibre and less energy, which you then have to make up elsewhere in the diet. A [formulation tool](/formulations) shows the full effect on diet cost.

## Questions to ask your supplier

1. Are these values as-fed or dry matter?
2. Are they typical, guaranteed or from a batch analysis?
3. Which reference or laboratory produced them?
4. Can you supply a certificate of analysis for this batch?
5. Have mycotoxins (especially aflatoxin) been tested for grains and oilseed meals?

We publish typical specifications for every ingredient we sell and can supply batch documentation on request.
`,
  },
  {
    slug: 'wheat-bran-in-sow-diets',
    title: 'Using wheat bran in sow diets',
    seoTitle: 'Wheat Bran in Sow Diets: Benefits and Inclusion Rates',
    description: 'Where wheat bran fits in gestation and lactation diets, typical inclusion rates, and how to balance its phosphorus and energy. A practical guide for pig producers.',
    topic: 'Pig nutrition',
    image: knowledgeImages['wheat bran in hand'],
    published: '2026-10-06',
    updated: '2026-10-06',
    ingredients: ['wheat-bran', 'limestone', 'sorghum'],
    keywords: ['wheat bran for pigs', 'sow feed fibre', 'gestation sow diet', 'wheat bran inclusion rate', 'sow constipation feed'],
    keyPoints: [
      'Wheat bran works best in dry (gestating) sow diets, where fibre improves fullness and gut function.',
      'Gestation diets commonly include around 10–25% bran. Lactation diets need much less.',
      'Bran is high in phosphorus and low in calcium, so adjust limestone to keep the calcium-to-phosphorus ratio right.',
      'Bran is bulky and can go stale. Buy what you will use within a few weeks.',
    ],
    body: `
[Wheat bran](/products/wheat-bran) is the outer layer of the wheat grain, left over from flour milling. It is moderately high in protein, high in fibre and relatively low in energy. That combination makes it a poor fit for young, fast-growing pigs and a very good fit for sows.

## Why fibre helps gestating sows

Pregnant sows are fed a restricted amount of feed to stop them getting too fat. Restricted feeding leaves them hungry, which can lead to restlessness, bar-biting and aggression in group housing. Fibrous ingredients like wheat bran:

- **Increase fullness** without adding much energy, so sows are calmer between meals.
- **Support gut health.** Fibre is fermented in the large intestine, which helps keep droppings soft.
- **Reduce constipation around farrowing**, which is linked to longer farrowing and more stillborn piglets.

## Typical inclusion rates

| Diet | Typical wheat bran inclusion | Notes |
| --- | --- | --- |
| Gestation (dry sow) | about 10–25% | Higher rates are possible if energy is balanced |
| Late gestation / pre-farrowing | about 10–20% | Helps prevent constipation |
| Lactation | about 0–10% | Sows need high energy density to support milk |
| Weaners and growers | low or none | Fibre dilutes energy and slows growth |

These are general ranges. The right level depends on your other ingredients, the sow's body condition and how much feed she gets each day.

## Balancing the nutrients

On our specification, wheat bran contains about 15.2% crude protein, 9% crude fibre and about 2,370 kcal ME/kg for pigs. Compare that with about 3,358 kcal for [sorghum](/products/sorghum). When you replace grain with bran:

- **Energy falls.** In gestation that is often fine, or even the goal. Check that the sow's daily energy intake still matches her needs, and increase the daily feed allowance slightly if needed.
- **Phosphorus rises.** Bran is rich in phosphorus, much of it as phytate, which sows digest only partly. You may be able to reduce dicalcium phosphate.
- **Calcium stays low.** Bran contains very little calcium. Add [feed limestone](/products/limestone) to keep the calcium-to-phosphorus ratio within your target range.

## Lactation: use with care

A lactating sow eats as much as she can and still often loses body condition, because milk production is so demanding. Bulky, low-energy feed limits how much energy she can take in. Keep bran low in lactation diets, and focus on energy, lysine and plenty of clean water.

## Storage and quality

- Bran is bulky. A 40 kg bag holds much less feed value than a bag of grain, so plan storage space.
- The oil in bran goes rancid over time, especially in warm conditions. Store it dry and off the floor, and use it within a few weeks.
- Check for mould, insects and off smells before mixing.

## Getting started

Introduce bran gradually over a week and watch sow condition and dung consistency. Check the finished diet's energy and calcium-to-phosphorus ratio in the [formulation tool](/formulations), or ask us for a sow diet review.
`,
  },
  {
    slug: 'calcium-phosphorus-laying-hens',
    title: 'Calcium and phosphorus for laying hens',
    seoTitle: 'Calcium and Phosphorus for Laying Hens: Eggshell Quality Guide',
    description: 'How much calcium and phosphorus laying hens need, why limestone particle size matters, and how DCP and limestone support strong eggshells.',
    topic: 'Poultry nutrition',
    image: knowledgeImages['layer flock'],
    published: '2026-10-06',
    updated: '2026-10-06',
    ingredients: ['limestone', 'dcp', 'premix'],
    keywords: ['layer feed calcium', 'eggshell quality', 'limestone for layers', 'layer feed phosphorus', 'thin egg shells chickens'],
    keyPoints: [
      'A laying hen needs roughly 4 g of calcium a day, so layer feed usually contains about 3.5–4.2% calcium.',
      'Feed a good share of the limestone as coarse particles (about 2–4 mm) so calcium is available overnight, when the shell forms.',
      'Phosphorus needs fall as hens age. Too much phosphorus late in lay can weaken shells.',
      'Do not feed layer diets to pullets before they start laying.',
    ],
    body: `
Every eggshell is almost pure calcium carbonate. A hen in full lay deposits around 2 grams of calcium in shell every day, which is a large share of all the calcium in her body. Getting calcium and phosphorus right is the single biggest nutritional lever for shell quality.

## How much calcium do layers need?

A hen in lay needs roughly 4 grams of calcium a day. How that translates to the diet depends on how much she eats:

| Daily feed intake | Approximate dietary calcium for ~4 g/day |
| --- | --- |
| 100 g | about 4.0% |
| 110 g | about 3.6% |
| 120 g | about 3.3% |

Calcium needs rise as the flock ages, because older hens lay larger eggs and absorb calcium less efficiently. Many layer programmes raise calcium in steps through the laying cycle.

## Why limestone particle size matters

Most of the shell is formed at night, when the hen is not eating. If all her calcium comes as fine powder, it passes through quickly and she draws on her bones instead.

Coarse limestone particles, about 2–4 mm, stay in the gizzard longer and release calcium slowly through the night. A common approach is to supply about half to two-thirds of the limestone as coarse grit and the rest as fine powder. We supply [feed limestone](/products/limestone) in both fine and coarse grades.

Feeding more of the daily ration in the afternoon also helps, because it puts calcium in the gut when shell formation begins.

## Phosphorus: needed, but not too much

Phosphorus is essential for bone and for the hen's ability to mobilise calcium. Most of the phosphorus in grains and oilseed meals is bound as phytate and poorly available, so layer diets rely on a mineral source such as [dicalcium phosphate (DCP)](/products/dcp), which supplies both phosphorus and calcium.

Formulate on available or digestible phosphorus, not total phosphorus. Typical levels are higher at the start of lay and lower later. Excess phosphorus in older hens interferes with calcium mobilisation from bone and can make shells thinner.

## The pre-lay period

Pullets approaching lay start building calcium reserves in their bones. A pre-lay or pre-layer diet, typically fed from about 2 weeks before the first eggs, has more calcium than grower feed but less than layer feed.

Do not feed full layer diets to young pullets before they start laying. The high calcium is more than they can use and can damage their kidneys.

## Vitamin D3

Hens cannot absorb calcium properly without vitamin D3. It is supplied in the [vitamin and mineral premix](/products/premix). Use the premix at the full stated inclusion, and store it cool and dry, since vitamin activity declines over time.

## When shells are still poor

If calcium, phosphorus and vitamin D3 are right and shells are still weak, look at:

- **Heat stress.** Panting changes blood chemistry and reduces shell quality. Provide cool water and good ventilation.
- **Disease.** Infectious bronchitis and other conditions damage the shell gland.
- **Flock age.** Shell quality naturally declines late in lay.
- **Water quality** and access.
- **Mycotoxins** in grain.

## Quick checklist

1. Check calcium per hen per day, not only the percentage in the feed.
2. Supply a good share of limestone as coarse particles.
3. Formulate on available phosphorus and reduce it as the flock ages.
4. Use a pre-lay diet and do not feed layer feed to growing pullets.
5. Confirm the premix supplies vitamin D3 at the right level.
`,
  },
  {
    slug: 'feed-cost-per-kg-gain',
    title: 'Working out the cost of feed per kilogram of gain',
    seoTitle: 'Feed Cost per kg of Gain: How to Calculate It (with Examples)',
    description: 'A simple method for working out feed conversion ratio and feed cost per kilogram of live-weight gain from your own farm records, with worked examples.',
    topic: 'Farm economics',
    image: knowledgeImages['farmer with records'],
    published: '2026-10-06',
    updated: '2026-10-06',
    ingredients: ['sorghum', 'soybean-meal'],
    keywords: ['feed conversion ratio', 'FCR calculation', 'feed cost per kg gain', 'broiler FCR', 'pig feed cost'],
    keyPoints: [
      'Feed conversion ratio (FCR) = feed eaten ÷ weight gained.',
      'Feed cost per kg of gain = FCR × feed cost per kg.',
      'A cheaper feed is only cheaper if it does not worsen FCR by more than it saves.',
      'Accurate records of feed delivered, weights and mortality are all you need.',
    ],
    body: `
Feed is usually the largest cost in pig and poultry production. Knowing what it costs to put on each kilogram of live weight tells you more than the price of a bag ever will.

## The two numbers you need

**Feed conversion ratio (FCR)** is how many kilograms of feed it takes to produce one kilogram of live-weight gain:

> FCR = total feed eaten (kg) ÷ total weight gained (kg)

A lower FCR is better.

**Feed cost per kg of gain** combines FCR with the price of feed:

> Feed cost per kg gain = FCR × feed cost per kg

## Worked example: broilers

A batch of 500 broilers:

- Chicks placed: 500 at an average of 0.042 kg
- Birds sold: 485 at an average of 2.2 kg
- Feed used: 1,780 kg
- Average feed cost (illustrative): US$0.62 per kg

Total weight gained = (485 × 2.2) − (500 × 0.042) = 1,067 − 21 = 1,046 kg

FCR = 1,780 ÷ 1,046 = 1.70

Feed cost per kg gain = 1.70 × 0.62 = US$1.05

Note that the 15 birds that died ate feed too. This calculation counts their feed but not their weight, so mortality worsens FCR. That is correct: those losses are a real cost.

## Worked example: grower-finisher pigs

A pen of 20 pigs from 25 kg to 100 kg:

- Weight gained: 20 × 75 kg = 1,500 kg
- Feed used: 4,500 kg
- Average feed cost (illustrative): US$0.48 per kg

FCR = 4,500 ÷ 1,500 = 3.0

Feed cost per kg gain = 3.0 × 0.48 = US$1.44

## Is the cheaper feed really cheaper?

This is where the calculation earns its keep. Compare two feeds (illustrative figures):

| | Feed A | Feed B |
| --- | --- | --- |
| Price per kg | US$0.48 | US$0.44 |
| FCR achieved | 3.0 | 3.4 |
| Feed cost per kg gain | US$1.44 | US$1.50 |

Feed B is 8% cheaper per bag but costs more per kilogram of pig produced. It also takes longer to reach market weight, which adds housing, labour and interest costs.

## How to collect the records

1. **Weigh at the start.** Weigh all animals or a fair sample at placement or transfer.
2. **Record every bag.** Note the date and weight of feed delivered to the pen or house.
3. **Record deaths.** Note the date and, if possible, the weight.
4. **Account for leftover feed.** Weigh feed remaining in feeders and bins at the end.
5. **Weigh at the end.** Use sale weights or weigh a sample.

## Common reasons for a poor FCR

- **Feed wastage** from overfilled or badly adjusted feeders
- **Imbalanced diets**, especially low lysine or energy (see [feeding grower pigs](/knowledge/feeding-grower-pigs-protein-energy-lysine))
- **Poor mixing**, so some animals get too little of key nutrients (see [mixing on farm](/knowledge/on-farm-feed-mixing))
- **Disease, heat stress or poor water supply**
- **Keeping animals past their efficient weight**, since FCR worsens as animals get heavier

## Using the number

Track feed cost per kg of gain for every batch. When you change feed, an ingredient or a supplier, compare batches on this number. It is the clearest way to see whether a change paid off. You can test the cost of different ingredient combinations before you buy using our [formulation tool](/formulations).
`,
  },
  {
    slug: 'on-farm-feed-mixing',
    title: 'Mixing on farm: getting an even mix',
    seoTitle: 'On-Farm Feed Mixing: How to Get an Even Mix',
    description: 'Order of addition, mixing time, pre-blending premix and how to check mix uniformity. A practical guide to mixing livestock feed on farm.',
    topic: 'Feed manufacturing',
    image: knowledgeImages['on-farm mixer'],
    published: '2026-10-06',
    updated: '2026-10-06',
    ingredients: ['premix', 'lysine', 'methionine', 'sorghum'],
    keywords: ['how to mix animal feed', 'on farm feed mixing', 'feed mixer', 'premix mixing', 'feed mixing order'],
    keyPoints: [
      'Pre-blend premix, amino acids and salt with a carrier before adding them to the main batch.',
      'Add ingredients in a set order: part of the grain, then the pre-blend, then protein meals, then the rest of the grain, then liquids last.',
      'Follow the mixer manufacturer\'s mixing time. Under-mixing is common, and over-mixing can cause separation.',
      'Grind ingredients to a similar particle size to reduce separation after mixing.',
    ],
    body: `
A diet is only as good as the mix. If premix, amino acids or minerals are not evenly distributed, some animals get too much and others too little, even though the formula is correct on paper.

## Why small ingredients are the problem

Major ingredients like [sorghum](/products/sorghum) and soybean meal make up most of the batch and spread easily. The difficult ones are the small-inclusion items:

- [Vitamin and mineral premix](/products/premix), often 0.25–0.5% of the diet
- Crystalline [lysine](/products/lysine) and [methionine](/products/methionine)
- Salt
- Any medication or additive

A few hundred grams in a one-tonne batch will not spread evenly on their own.

## Step 1: Weigh accurately

Use a scale suited to the amount you are weighing. A platform scale for bags of grain is not accurate enough for 2.5 kg of premix. Use a smaller kitchen or bench scale for the small items.

## Step 2: Pre-blend the small ingredients

Mix the premix, amino acids and salt with a carrier before they go into the main batch. A good carrier is ground grain or wheat bran, at about ten times the weight of the small ingredients. Mix the pre-blend thoroughly in a bucket or small drum.

## Step 3: Follow a set order of addition

A common order is:

1. About half of the main grain
2. The pre-blend of small ingredients
3. Protein meals
4. The rest of the grain
5. Liquids such as oil or molasses, last, once dry ingredients are mixed

Putting the small ingredients in the middle of the batch, not on the bottom or top, helps them spread through the whole load.

## Step 4: Mix for the right time

Mixing time depends on the mixer:

| Mixer type | Typical mixing time after the last ingredient |
| --- | --- |
| Horizontal ribbon or paddle | about 3–5 minutes |
| Vertical screw | about 10–15 minutes |
| Hand mixing on a clean floor | turn the pile at least 3–4 times |

These are general guides. Check the manufacturer's recommendation and do not overfill: a mixer loaded beyond its rated capacity will not mix properly. Over-long mixing can also cause separation.

## Hand mixing

If you mix by hand on a concrete floor:

1. Spread the main grain in a flat layer.
2. Sprinkle the pre-blend evenly across it.
3. Add the protein meals.
4. Shovel the whole pile into a cone in a new spot, then repeat at least three or four times.

Always pre-blend premix before hand mixing.

## Step 5: Reduce separation after mixing

A well-mixed batch can still separate during handling, especially if particles differ greatly in size or density. To reduce it:

- Grind grains to a similar particle size to the meals.
- Avoid dropping feed from a height into bins.
- Minimise transport and handling between mixer and feeder.
- Adding a small amount of oil can help fine particles stick.

## Step 6: Check your mix

A simple uniformity test uses salt as a marker. Take ten samples from different parts of the batch and test each for salt using chloride test strips. The **coefficient of variation (CV)** of the results shows how even the mix is. A CV below about 10% is generally considered a good mix.

## Clean between batches

If you mix medicated feed, run a flush batch of plain grain afterwards or clean the mixer thoroughly, to avoid carrying medication into feed for other animals.

## Record keeping

Write down each batch: date, formula, ingredient batches and weights. If performance drops, you can trace back to the feed. For help checking a formula before you mix, use our [formulation tool](/formulations).
`,
  },
  {
    slug: 'sunflower-meal-for-dairy-cows',
    title: 'Sunflower meal for dairy cows',
    seoTitle: 'Sunflower Meal for Dairy Cows: Replacing Soybean Meal',
    description: 'How to replace part of the soybean meal in a dairy concentrate with sunflower meal without losing milk, including protein and energy adjustments.',
    topic: 'Cattle nutrition',
    image: knowledgeImages['dairy cows feeding'],
    published: '2026-10-06',
    updated: '2026-10-06',
    ingredients: ['sunflower-meal', 'soybean-meal', 'sorghum'],
    keywords: ['sunflower meal dairy cows', 'dairy concentrate Zimbabwe', 'replace soybean meal', 'dairy cow protein', 'sunflower cake cattle'],
    keyPoints: [
      'Sunflower meal is a locally available, palatable protein source well suited to cattle.',
      'Replace soybean meal on a protein basis, not kilogram for kilogram: about 1.4 kg of 33% sunflower meal supplies the protein of 1 kg of 46% soybean meal.',
      'Sunflower meal is higher in fibre and lower in energy, so add energy elsewhere in the ration.',
      'High-yielding cows may still need some soybean meal or other higher-quality protein.',
    ],
    body: `
[Soybean meal](/products/soybean-meal) is the standard protein ingredient in dairy concentrates, but it is often expensive. [Sunflower meal](/products/sunflower-meal), produced locally from sunflower oil extraction, can replace a large part of it in dairy rations. Done carefully, milk yield holds while concentrate cost falls.

## Why sunflower meal suits ruminants

Cows rely heavily on the microbes in the rumen. Those microbes break down feed protein and build their own, which the cow then digests. This makes cattle less sensitive to an ingredient's amino acid profile than pigs or poultry. Sunflower meal's lower lysine content, a drawback in pig and poultry feed, matters much less for cows.

Sunflower meal is also palatable, and its fibre is useful in a dairy ration.

## Know your sunflower meal

Sunflower meal varies widely. Its protein content depends mainly on how much of the hull is removed before oil extraction:

- **Non-decorticated** (hulls left in): lower protein, higher fibre
- **Partly or fully decorticated** (hulls removed): higher protein, lower fibre

On our specification, sunflower meal contains about 33% crude protein and about 26% crude fibre. Always check the batch specification before formulating. See [how to read a feed ingredient specification](/knowledge/how-to-read-feed-ingredient-specification).

## Replace on a protein basis

The most common mistake is swapping sunflower meal for soybean meal kilogram for kilogram. That lowers the protein in the ration. Instead, match the protein:

> Sunflower meal needed = soybean meal removed × (soybean CP% ÷ sunflower CP%)

Using our specifications: 45.6 ÷ 33 ≈ 1.4. So **about 1.4 kg of sunflower meal replaces the protein in 1 kg of soybean meal**.

## Make up the energy

Because sunflower meal is high in fibre, it supplies less energy than soybean meal. When you increase it in the concentrate:

- Watch the ration's total energy. Lower energy reduces milk yield and can cause cows to lose condition.
- Add an energy source such as [sorghum](/products/sorghum) or maize to compensate.
- Keep the overall fibre balance in mind, especially if forage is already fibrous.

## How far can you go?

| Cow group | Practical approach |
| --- | --- |
| Dry cows and heifers | Sunflower meal can usually supply most or all supplementary protein |
| Moderate yielders | Replace a large share of soybean meal, balancing energy |
| High yielders, early lactation | Keep some soybean meal or other high-quality protein; replace part only |

High-yielding cows in early lactation have very high protein requirements. They may need protein that escapes rumen breakdown, which soybean meal supplies more of than sunflower meal.

## Making the switch

1. Get the batch specification for your sunflower meal.
2. Calculate the replacement on a protein basis.
3. Add energy to make up the shortfall.
4. Change the ration over about a week to give the rumen time to adapt.
5. Watch milk yield, butterfat, body condition and dung consistency for the next two to three weeks.

## Storage

Store sunflower meal dry and off the ground. Check for mould, which can carry mycotoxins harmful to cows and that may pass into milk.

Ask us for a dairy concentrate review using your current forage, or check a draft in the [formulation tool](/formulations).
`,
  },
  {
    slug: 'sorghum-vs-maize-animal-feed',
    title: 'Sorghum vs maize in pig and poultry feed',
    seoTitle: 'Sorghum vs Maize for Pig and Poultry Feed: Which Is Better?',
    description: 'How sorghum compares with maize as an energy grain in pig and poultry diets: energy value, tannins, pigmentation, grinding and when sorghum makes sense.',
    topic: 'Feed ingredients',
    image: productImages.sorghum,
    published: '2026-10-06',
    updated: '2026-10-06',
    ingredients: ['sorghum', 'soybean-meal', 'lysine'],
    keywords: ['sorghum vs maize', 'sorghum in pig feed', 'sorghum for chickens', 'maize substitute animal feed', 'low tannin sorghum'],
    keyPoints: [
      'Low-tannin sorghum has an energy value close to maize for pigs and poultry and can replace it fully in balanced diets.',
      'High-tannin (bird-resistant) sorghum reduces protein digestibility. Ask which type you are buying.',
      'Sorghum lacks the yellow pigments in maize, so egg yolks and broiler skin will be paler.',
      'Grind sorghum finely for pigs: its small, hard kernels are poorly digested if coarse.',
    ],
    body: `
Maize is the reference energy grain in pig and poultry feed. [Sorghum](/products/sorghum) is drought-tolerant, widely grown in Zimbabwe, and often available when maize is scarce or expensive. Here is how the two compare and what changes when you switch.

## Energy value

Both are starchy cereals. For pigs, good-quality sorghum typically has an energy value close to that of maize, in the range of about 95–100%. On our specification, sorghum supplies about 3,358 kcal ME/kg for pigs as fed. For poultry, sorghum is usually slightly lower in energy than maize.

In practice, low-tannin sorghum can replace maize completely in pig and broiler diets when the formula is rebalanced for its nutrient profile.

## Protein and amino acids

Sorghum usually contains a little more crude protein than maize. Ours is about 8.65% as fed. Like maize, it is low in lysine, so diets still rely on soybean meal or other protein meals, plus crystalline [lysine](/products/lysine) where it is cost-effective.

## Tannins: the key quality question

Some sorghum varieties contain condensed tannins, which protect the grain from birds but bind protein and reduce digestibility.

- **Low-tannin sorghum** (most white and many red varieties) performs close to maize.
- **High-tannin (bird-resistant) sorghum**, often darker brown, reduces protein and energy digestibility and can lower growth and feed efficiency, especially in young animals.

Ask your supplier which type you are buying.

## Pigmentation

Yellow maize contains xanthophylls, natural pigments that colour egg yolks and broiler skin. Sorghum does not. When sorghum replaces maize:

- **Layer flocks** produce paler yolks.
- **Broilers** have paler skin and fat.

This does not affect nutritional value, but some markets prefer darker yolks. If yours does, keep some yellow maize in the diet or add a permitted pigment source.

## Grinding

Sorghum kernels are small and hard. Whole or coarsely cracked kernels pass through pigs undigested, which wastes feed.

- **Pigs:** grind sorghum finely, with a hammer mill screen around 2–3 mm, finer than you would usually grind maize.
- **Poultry:** chickens grind grain in the gizzard, so sorghum can be fed ground or, in some programmes, partly whole.

We supply sorghum whole or hammer-milled.

## Quick comparison

| | Maize | Low-tannin sorghum |
| --- | --- | --- |
| Energy (pigs) | Reference | Close to maize |
| Energy (poultry) | Reference | Slightly lower |
| Crude protein | Lower | Slightly higher |
| Yolk and skin colour | Yellow | Pale |
| Grinding for pigs | Standard | Finer |
| Drought tolerance | Lower | Higher |

## When sorghum makes sense

Sorghum is worth using when it costs less than maize per unit of energy, when maize supply is tight, or when you want to buy locally grown grain. Compare the two on cost per unit of energy, not price per tonne, and check the full diet in our [formulation tool](/formulations).

To build a complete diet around sorghum, see [how to formulate pig feed](/knowledge/how-to-formulate-pig-feed).
`,
  },
  {
    slug: 'broiler-starter-grower-finisher-feed',
    title: 'Broiler starter, grower and finisher feed explained',
    seoTitle: 'Broiler Starter, Grower and Finisher Feed: What Changes and When',
    description: 'What changes between broiler starter, grower and finisher feeds, when to switch, and why each phase matters for growth and feed conversion.',
    topic: 'Poultry nutrition',
    image: animalImages.poultry,
    published: '2026-10-06',
    updated: '2026-10-06',
    ingredients: ['soybean-meal', 'sorghum', 'methionine', 'lysine', 'dcp', 'limestone', 'premix'],
    keywords: ['broiler starter feed', 'broiler grower feed', 'broiler finisher feed', 'broiler feeding programme', 'broiler feed protein'],
    keyPoints: [
      'Broiler feeding programmes usually use three phases: starter, grower and finisher.',
      'Protein, amino acid, calcium and phosphorus levels fall from one phase to the next, while energy stays similar or rises.',
      'The starter phase has the biggest effect on final performance. Do not cut it short.',
      'Methionine is typically the first limiting amino acid in broiler diets, with lysine close behind.',
    ],
    body: `
Modern broilers grow extremely fast. Their nutrient needs change week by week, so feeding programmes are split into phases. Each feed is matched to the bird's stage, which keeps growth on track without paying for nutrients the bird no longer needs.

## The three phases

| Phase | Typical age | Feed form | Main goal |
| --- | --- | --- | --- |
| Starter | about 0–10 days | Crumble or mini-pellet | Early growth, gut and immune development |
| Grower | about 11–24 days | Pellet | Rapid lean growth |
| Finisher | about 25 days to slaughter | Pellet | Efficient gain at lowest cost |

Exact switch-over ages depend on the genetic line and target slaughter weight. Follow the feeding guide from your chick supplier.

## What changes between phases

As broilers grow, their requirement for protein relative to energy falls. Roughly:

| | Starter | Grower | Finisher |
| --- | --- | --- | --- |
| Crude protein | about 22–23% | about 20–21% | about 18–19% |
| Energy (AMEn) | about 2,950–3,050 kcal/kg | about 3,050–3,150 kcal/kg | about 3,100–3,200 kcal/kg |
| Calcium | about 0.9–1.0% | about 0.8–0.9% | about 0.75–0.85% |
| Available phosphorus | about 0.45–0.50% | about 0.40–0.45% | about 0.35–0.42% |

These are indicative ranges. Breed-specific guides give exact digestible amino acid targets.

## Amino acids matter more than crude protein

Broilers need specific amino acids in balance. In typical cereal and [soybean meal](/products/soybean-meal) diets:

- **Methionine** is usually the first limiting amino acid. Crystalline [methionine](/products/methionine) is added to almost all broiler feeds.
- **Lysine** is close behind and drives breast meat yield. [L-lysine HCl](/products/lysine) is often added.
- **Threonine** may be third limiting in lower-protein diets.

Formulating on digestible amino acids, not crude protein alone, gives more consistent growth and often lower cost.

## The starter phase: do not cut corners

Starter feed is the most expensive per kilogram but the smallest share of total feed. It sets up the gut, immune system and skeleton for the rest of the bird's life. Poor starter nutrition shows up later as uneven flocks, leg problems and poorer feed conversion, even if grower and finisher feeds are good.

- Keep feed and water easy to reach from day one.
- Feed starter for the full recommended period or quantity.
- Use crumbles or mini-pellets that chicks can pick up easily.

## Minerals and premix

Calcium and phosphorus build the skeleton that carries a fast-growing bird. [Dicalcium phosphate](/products/dcp) and [feed limestone](/products/limestone) supply them. A broiler-specific [vitamin and mineral premix](/products/premix) supplies vitamins, including D3, and trace minerals. Use a premix designed for broilers and the correct phase where the supplier makes separate products.

## Switching between feeds

- Switch on time. Feeding starter too long adds cost. Switching too early can hold back growth.
- Some farms blend the old and new feed for a day or two to smooth the change.
- Watch water and feed intake around each change.

## Measuring success

Track average weight, uniformity, mortality and feed conversion ratio for every batch. See [working out the cost of feed per kilogram of gain](/knowledge/feed-cost-per-kg-gain) for a simple way to compare batches and feeds.
`,
  },
];

export function articlesForIngredient(articles: KnowledgeArticle[], productId: string) {
  return articles.filter((article) => article.ingredients.includes(productId));
}

export function relatedArticles(articles: KnowledgeArticle[], article: KnowledgeArticle, limit = 3) {
  return articles
    .filter((item) => item.slug !== article.slug)
    .map((item) => ({
      item,
      score: (item.topic === article.topic ? 3 : 0) + item.ingredients.filter((id) => article.ingredients.includes(id)).length,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ item }) => item);
}

export function headingId(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function articleHeadings(article: KnowledgeArticle) {
  return [...article.body.matchAll(/^## (.+)$/gm)].map(([, text]) => ({ text, id: headingId(text) }));
}

export function readingMinutes(article: KnowledgeArticle) {
  return Math.max(1, Math.round(article.body.split(/\s+/).length / 220));
}
