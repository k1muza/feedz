import Link from "next/link";
import StudioTourPlayer from "@/components/studio-tour/StudioTourPlayer";

import { studioMono, studioSans } from "./fonts";
import { IngredientPoolPanel, type IngredientPoolRow } from "./ingredient-pool-panel";
import { sx } from "./sx";

// The public page introducing FeedSport Studio, at /studio-tour. It sits
// inside the site's own menu and footer; the sections between are the inline
// CSS strings from design/FeedSport Studio Page.html, kept verbatim through
// sx() like the studio views.

export interface LandingFeatured {
  id: string;
  prog: string;
  name: string;
  desc: string;
  ings: string;
  author: string;
  role: string;
}

const SIGNUP = "/studio/signup";
const ASK = "https://wa.me/263774684534?text=I%20have%20a%20question%20about%20FeedSport%20Studio";

const LANDING_CSS =
  "body:has(.fs-landing){background:#faf8f3}" +
  ".fs-landing{background:#faf8f3;font-family:var(--font-fs-sans),sans-serif;color:#222420;-webkit-font-smoothing:antialiased;font-variant-numeric:tabular-nums;line-height:normal}" +
  ".fs-landing *{box-sizing:border-box}" +
  ".fs-landing a{color:#2f5a3f}.fs-landing a:hover{color:#1f3e2b}" +
  ".fs-landing a.fsl-green:hover{background:#28503a}.fs-landing a.fsl-amber:hover{background:#e8b55a}" +
  ".fs-landing a.fsl-light:hover{background:#f3f0e8}" +
  ".fs-landing a.fsl-ghost:hover{background:#28503a}" +
  "@media (max-width:560px){.fs-landing .fsl-premix-points{grid-template-columns:1fr!important}.fs-landing .fsl-row{grid-template-columns:1fr!important;gap:4px!important}}";

const EYEBROW = "font:500 12px/1 'IBM Plex Mono',monospace;letter-spacing:0.08em;text-transform:uppercase;color:#64665c";
const H2 = "margin:0;font:600 clamp(28px,3.4vw,38px)/1.15 'IBM Plex Sans',sans-serif;letter-spacing:-0.02em;text-wrap:balance";

const STEPS = [
  ["Choose the animal and stage", "Requirements load from the feeding programme, based on Brazilian Tables 2024. You don't type targets in."],
  ["Add your ingredients and prices", "Use a saved list such as “Farm stock”, or pick from the catalogue. Your prices, or ours where you leave them blank."],
  ["Formulate", "You get the mix in kilograms for your batch, the cost per tonne and per bag, and whether every hard requirement is met."],
  ["Adjust, save, compare", "Change a price, a limit or the premix and re-run. Save each result as a version and compare it with the last."],
];

const INGREDIENT_POINTS = [
  ["Saved lists", "Keep a list for each store or season and start from it every time."],
  ["Your price or ours", "Every price shows whether it's yours or a FeedSport default. Old prices are flagged."],
  ["Limits and locks", "Set a minimum, a maximum, or lock an amount. FeedSport stage limits still apply."],
];

const LANDING_INGREDIENT_ROWS: IngredientPoolRow[] = [
  { name: "Corn, Grain", short: "Available", chip: { deco: "none" }, nameColor: "#222420", roleColor: "#2f5a3f" },
  { name: "Soybean meal 45.6% CP", short: "Available", chip: { deco: "none" }, nameColor: "#222420", roleColor: "#2f5a3f" },
  { name: "Wheat, Bran", short: "max 15%", chip: { deco: "none" }, nameColor: "#222420", roleColor: "#2f5a3f" },
  { name: "Limestone", short: "Available", chip: { deco: "none" }, nameColor: "#222420", roleColor: "#2f5a3f" },
  { name: "Dicalcium phosphate", short: "Available", chip: { deco: "none" }, nameColor: "#222420", roleColor: "#2f5a3f" },
  { name: "Salt", short: "Available", chip: { deco: "none" }, nameColor: "#222420", roleColor: "#2f5a3f" },
  { name: "L-Lysine HCl", short: "Available", chip: { deco: "none" }, nameColor: "#222420", roleColor: "#2f5a3f" },
  { name: "L-Threonine", short: "Available", chip: { deco: "none" }, nameColor: "#222420", roleColor: "#2f5a3f" },
  { name: "DL-Methionine", short: "Available", chip: { deco: "none" }, nameColor: "#222420", roleColor: "#2f5a3f" },
  { name: "Soybean, Full-Fat Extruded", short: "Available", chip: { deco: "none" }, nameColor: "#222420", roleColor: "#2f5a3f" },
  { name: "Sunflower meal", short: "max 10%", chip: { deco: "none" }, nameColor: "#222420", roleColor: "#2f5a3f" },
  { name: "Vegetable oil", short: "max 5%", chip: { deco: "none" }, nameColor: "#222420", roleColor: "#2f5a3f" },
];

const PREMIX_POINTS = [
  ["Compare before you switch", "Each premix is re-run with your ingredients and prices, so you see the real cost difference."],
  ["Replace, never stack", "Replacing removes the old premix and re-optimises the whole diet."],
  ["Honest about gaps", "Values the manufacturer doesn't publish are marked missing, not counted as zero."],
  ["Advice stays advice", "Vitamin recommendations are compared, not treated as failures."],
];

const VERSION_COLS = "display:grid;grid-template-columns:minmax(0,1.4fr) 1fr 1fr 90px;gap:12px;";
const VERSION_ROWS: { what: string; before: string; after: string; change: string; good?: boolean }[] = [
  { what: "Soybean meal price", before: "$680 / t", after: "$640 / t", change: "−$40", good: true },
  { what: "Premix", before: "Piglet premix", after: "GlyPro X912", change: "replaced" },
  { what: "L-Lysine HCl", before: "0.25%", after: "0.18%", change: "−0.07" },
];

const initials = (name: string) => name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

export function StudioLanding({ featured }: { featured: LandingFeatured[] }) {
  return (
    <div className={`fs-landing ${studioSans.variable} ${studioMono.variable}`}>
      <style dangerouslySetInnerHTML={{ __html: LANDING_CSS }} />

      <main>
        <section style={sx("max-width:1240px;margin:0 auto;padding:64px 24px 40px;display:flex;flex-direction:column;gap:40px")}>
          <div style={sx("display:flex;flex-direction:column;gap:20px;max-width:820px")}>
            <span style={sx(EYEBROW)}>Formulation · FeedSport Studio · Free with an account</span>
            <h1 style={sx("margin:0;font:600 clamp(36px,5vw,56px)/1.05 'IBM Plex Sans',sans-serif;letter-spacing:-0.03em;text-wrap:balance")}>Formulate feed from the ingredients you actually have.</h1>
            <p style={sx("margin:0;font:400 19px/1.55 'IBM Plex Sans',sans-serif;color:#45473f;max-width:680px;text-wrap:pretty")}>Choose the animal and stage, tell Studio what&apos;s in your store and what you paid, and get a least-cost recipe that meets the nutritional requirements. Change anything and re-run without starting over.</p>
            <div style={sx("display:flex;gap:12px;flex-wrap:wrap;padding-top:4px")}>
              <Link href={SIGNUP} className="fsl-green" style={sx("font:600 16px/1 'IBM Plex Sans',sans-serif;padding:16px 22px;border-radius:8px;background:#2f5a3f;color:#fff;text-decoration:none")}>Create a free account</Link>
              <Link href="/formulations" className="fsl-light" style={sx("font:500 16px/1 'IBM Plex Sans',sans-serif;padding:15px 20px;border-radius:8px;border:1px solid #d0cdc3;background:#fff;color:#222420;text-decoration:none")}>Try the quick calculator</Link>
            </div>
            <span style={sx("font:400 14px/1.5 'IBM Plex Sans',sans-serif;color:#64665c")}>For farmers mixing their own feed, nutritionists and agro-dealers. Pigs and poultry today.</span>
          </div>
          <StudioTourPlayer />
        </section>

        <section style={sx("max-width:1240px;margin:0 auto;padding:24px 24px 72px")}>
          <div style={sx("display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:16px")}>
            <div style={sx("background:#fff;border:1px solid #e2dfd6;border-radius:12px;padding:24px;display:flex;flex-direction:column;gap:12px")}>
              <span style={sx("font:500 12px/1 'IBM Plex Mono',monospace;letter-spacing:0.06em;text-transform:uppercase;color:#64665c")}>Quick calculator · no account</span>
              <span style={sx("font:600 20px/1.25 'IBM Plex Sans',sans-serif")}>Check a formulation you already have</span>
              <ul style={sx("margin:0;padding-left:18px;display:flex;flex-direction:column;gap:6px;font:400 15px/1.5 'IBM Plex Sans',sans-serif;color:#45473f")}>
                <li>Enter inclusion rates and see which nutrients fall short</li>
                <li>Standard targets by animal and stage</li>
                <li>Nothing is saved</li>
              </ul>
              <Link href="/formulations" style={sx("margin-top:auto;font:600 14px/1 'IBM Plex Sans',sans-serif;padding-top:6px")}>Open the quick calculator →</Link>
            </div>
            <div style={sx("background:#2f5a3f;color:#faf8f3;border-radius:12px;padding:24px;display:flex;flex-direction:column;gap:12px")}>
              <span style={sx("font:500 12px/1 'IBM Plex Mono',monospace;letter-spacing:0.06em;text-transform:uppercase;color:#cfe0d2")}>FeedSport Studio · free account</span>
              <span style={sx("font:600 20px/1.25 'IBM Plex Sans',sans-serif")}>Let FeedSport work out the recipe</span>
              <ul style={sx("margin:0;padding-left:18px;display:flex;flex-direction:column;gap:6px;font:400 15px/1.5 'IBM Plex Sans',sans-serif;color:#e2ebe3")}>
                <li>Least-cost recipe from your ingredient list and prices</li>
                <li>Commercial premixes counted at the manufacturer&apos;s dose</li>
                <li>Saved versions you can reopen and compare</li>
              </ul>
              <Link href={SIGNUP} className="fsl-amber" style={sx("margin-top:auto;align-self:flex-start;font:600 14px/1 'IBM Plex Sans',sans-serif;padding:12px 16px;border-radius:7px;background:#e3aa45;color:#222420;text-decoration:none")}>Create a free account</Link>
            </div>
          </div>
        </section>

        <section id="how" style={sx("background:#fff;border-top:1px solid #e2dfd6;border-bottom:1px solid #e2dfd6;scroll-margin-top:80px")}>
          <div style={sx("max-width:1240px;margin:0 auto;padding:72px 24px;display:flex;flex-direction:column;gap:36px")}>
            <div style={sx("display:flex;flex-direction:column;gap:12px;max-width:720px")}>
              <span style={sx(EYEBROW)}>How it works</span>
              <h2 style={sx(H2)}>Four steps, about two minutes the first time</h2>
            </div>
            <ol style={sx("margin:0;padding:0;list-style:none;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr));gap:16px")}>
              {STEPS.map(([title, body], i) => (
                <li key={title} style={sx("display:flex;flex-direction:column;gap:10px;padding:22px;border:1px solid #e2dfd6;border-radius:12px;background:#faf8f3")}>
                  <span style={sx("font:500 13px/1 'IBM Plex Mono',monospace;color:#8a5f18")}>{String(i + 1).padStart(2, "0")}</span>
                  <span style={sx("font:600 18px/1.3 'IBM Plex Sans',sans-serif")}>{title}</span>
                  <span style={sx("font:400 15px/1.55 'IBM Plex Sans',sans-serif;color:#45473f")}>{body}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="ingredients" style={sx("max-width:1240px;margin:0 auto;padding:88px 24px;display:flex;flex-wrap:wrap;gap:48px;align-items:center;scroll-margin-top:80px")}>
          <div style={sx("flex:1 1 380px;min-width:0;display:flex;flex-direction:column;gap:18px")}>
            <span style={sx(EYEBROW)}>Your ingredients and prices</span>
            <h2 style={sx(H2)}>Only what&apos;s in your store. Only what you paid.</h2>
            <p style={sx("margin:0;font:400 17px/1.6 'IBM Plex Sans',sans-serif;color:#45473f")}>Studio never adds an ingredient you didn&apos;t choose. If something would help, it&apos;s suggested and you decide.</p>
            <div style={sx("display:flex;flex-direction:column;border-top:1px solid #e2dfd6")}>
              {INGREDIENT_POINTS.map(([title, body]) => (
                <div key={title} className="fsl-row" style={sx("display:grid;grid-template-columns:150px minmax(0,1fr);gap:16px;padding:14px 0;border-bottom:1px solid #e2dfd6;font:400 15px/1.5 'IBM Plex Sans',sans-serif")}>
                  <b style={sx("font-weight:600")}>{title}</b>
                  <span style={sx("color:#45473f")}>{body}</span>
                </div>
              ))}
            </div>
          </div>
          <div
            role="region"
            aria-label="Example Studio ingredient pool"
            style={sx("flex:1 1 300px;max-width:420px;min-width:0;overflow:hidden;border-radius:12px;background:#fff;border:1px solid #e2dfd6;box-shadow:0 20px 50px rgba(34,36,32,.12)")}
          >
            <IngredientPoolPanel
              poolCount={13}
              premixPoolRow={{ sku: "Sustar GlyPro X912", sub: "Fixed 2 kg/t · manufacturer dose" }}
              poolRows={LANDING_INGREDIENT_ROWS}
              previewCount={7}
            />
          </div>
        </section>

        <section id="premixes" style={sx("background:#222420;color:#faf8f3;scroll-margin-top:80px")}>
          <div style={sx("max-width:1240px;margin:0 auto;padding:88px 24px;display:flex;flex-direction:column;gap:40px")}>
            <div style={sx("display:flex;flex-wrap:wrap;gap:40px;align-items:flex-end")}>
              <div style={sx("flex:1 1 460px;min-width:0;display:flex;flex-direction:column;gap:16px")}>
                <span style={sx("font:500 12px/1 'IBM Plex Mono',monospace;letter-spacing:0.08em;text-transform:uppercase;color:#b9b6ab")}>Premixes</span>
                <h2 style={sx(H2)}>Your premix counts as a real ingredient</h2>
                <p style={sx("margin:0;font:400 17px/1.6 'IBM Plex Sans',sans-serif;color:#d0cdc3")}>If your premix supplies lysine, calcium or phosphorus, Studio counts it once, at the manufacturer&apos;s dose, and adds only what&apos;s still needed.</p>
              </div>
              <div className="fsl-premix-points" style={sx("flex:1 1 420px;min-width:0;display:grid;grid-template-columns:1fr 1fr;gap:16px")}>
                {PREMIX_POINTS.map(([title, body]) => (
                  <div key={title} style={sx("display:flex;flex-direction:column;gap:6px;padding-top:12px;border-top:1px solid #45473f")}>
                    <b style={sx("font:600 15px/1.3 'IBM Plex Sans',sans-serif")}>{title}</b>
                    <span style={sx("font:400 14px/1.5 'IBM Plex Sans',sans-serif;color:#b9b6ab")}>{body}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="versions" style={sx("max-width:1240px;margin:0 auto;padding:88px 24px;display:flex;flex-wrap:wrap;gap:48px;align-items:center;scroll-margin-top:80px")}>
          <div style={sx("flex:1 1 360px;min-width:0;display:flex;flex-direction:column;gap:18px")}>
            <span style={sx(EYEBROW)}>Saved versions</span>
            <h2 style={sx(H2)}>A record of every recipe you&apos;ve mixed</h2>
            <p style={sx("margin:0;font:400 17px/1.6 'IBM Plex Sans',sans-serif;color:#45473f")}>Each save keeps the programme, ingredients, prices, limits and premix, so you can reopen it months later and get the same result. Compare two versions to see what changed and what it did to the cost.</p>
            <Link href={SIGNUP} style={sx("align-self:flex-start;font:600 15px/1 'IBM Plex Sans',sans-serif")}>Create a free account →</Link>
          </div>
          <div style={sx("flex:1 1 520px;min-width:0;background:#fff;border:1px solid #e2dfd6;border-radius:12px;overflow:hidden;box-shadow:0 20px 50px rgba(34,36,32,.1)")}>
            <div style={sx("display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid #e2dfd6")}>
              <span style={sx("font:600 15px/1.2 'IBM Plex Sans',sans-serif")}>Finisher · Farm stock</span>
              <span style={sx("font:500 11px/1 'IBM Plex Mono',monospace;color:#64665c")}>v2 → v3</span>
            </div>
            <div style={sx(VERSION_COLS + "padding:10px 18px;background:#faf8f3;font:500 11px/1 'IBM Plex Mono',monospace;color:#64665c;text-transform:uppercase;letter-spacing:0.04em")}>
              <span>What changed</span><span>v2 · Sep</span><span>v3 · Oct</span><span style={sx("text-align:right")}>Change</span>
            </div>
            {VERSION_ROWS.map((r) => (
              <div key={r.what} style={sx(VERSION_COLS + "padding:12px 18px;border-top:1px solid #ece8df;font:400 14px/1.3 'IBM Plex Sans',sans-serif")}>
                <span>{r.what}</span><span>{r.before}</span><span style={sx("font-weight:500")}>{r.after}</span>
                <span style={sx(`text-align:right;color:${r.good ? "#2b6a42" : "#45473f"}`)}>{r.change}</span>
              </div>
            ))}
            <div style={sx(VERSION_COLS + "padding:12px 18px;border-top:1px solid #ece8df;font:600 14px/1.3 'IBM Plex Sans',sans-serif;background:#faf8f3")}>
              <span>Cost per tonne</span><span style={sx("font-weight:400")}>$411.20</span><span>$402.16</span><span style={sx("text-align:right;color:#2b6a42")}>−$9.04</span>
            </div>
            <div style={sx("padding:10px 18px;border-top:1px solid #ece8df;font:400 12px/1.4 'IBM Plex Sans',sans-serif;color:#64665c")}>Illustrative example</div>
          </div>
        </section>

        {featured.length > 0 && (
          <section id="featured" style={sx("background:#fff;border-top:1px solid #e2dfd6;border-bottom:1px solid #e2dfd6;scroll-margin-top:80px")}>
            <div style={sx("max-width:1240px;margin:0 auto;padding:80px 24px;display:flex;flex-direction:column;gap:32px")}>
              <div style={sx("display:flex;flex-wrap:wrap;gap:20px;justify-content:space-between;align-items:flex-end")}>
                <div style={sx("display:flex;flex-direction:column;gap:12px;max-width:640px")}>
                  <span style={sx(EYEBROW)}>Featured formulations</span>
                  <h2 style={sx("margin:0;font:600 clamp(28px,3.4vw,38px)/1.15 'IBM Plex Sans',sans-serif;letter-spacing:-0.02em")}>Start from a recipe that already works</h2>
                  <p style={sx("margin:0;font:400 16px/1.6 'IBM Plex Sans',sans-serif;color:#45473f")}>Published by FeedSport nutritionists. Open one as your own copy, then swap in your ingredients and prices.</p>
                </div>
                <Link href="/studio" style={sx("font:600 15px/1 'IBM Plex Sans',sans-serif")}>Browse all in Studio →</Link>
              </div>
              <div style={sx("display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:16px")}>
                {featured.map((p) => (
                  <div key={p.id} style={sx("background:#faf8f3;border:1px solid #e2dfd6;border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:12px")}>
                    <div style={sx("display:flex;justify-content:space-between;align-items:center;gap:8px")}>
                      <span style={sx("font:500 11px/1.3 'IBM Plex Mono',monospace;color:#64665c;text-transform:uppercase;letter-spacing:0.05em")}>{p.prog}</span>
                      <span style={sx("flex:none;display:flex;align-items:center;gap:5px;font:500 11px/1 'IBM Plex Sans',sans-serif;color:#1f3e2b;background:#eef3ee;border-radius:99px;padding:4px 8px")}>
                        <span style={sx("width:6px;height:6px;border-radius:50%;background:#2f7a4a")} />
                        Reviewed by FeedSport
                      </span>
                    </div>
                    <span style={sx("font:600 17px/1.3 'IBM Plex Sans',sans-serif")}>{p.name}</span>
                    <span style={sx("font:400 14px/1.5 'IBM Plex Sans',sans-serif;color:#45473f")}>{p.desc}</span>
                    <span style={sx("font:400 13px/1.5 'IBM Plex Sans',sans-serif;color:#64665c")}>{p.ings}</span>
                    <div style={sx("display:flex;align-items:center;gap:10px;padding-top:12px;margin-top:auto;border-top:1px solid #e2dfd6")}>
                      <span style={sx("flex:none;width:30px;height:30px;border-radius:50%;background:#2f5a3f;color:#faf8f3;font:600 11px/30px 'IBM Plex Sans',sans-serif;text-align:center")}>{initials(p.author)}</span>
                      <span style={sx("display:flex;flex-direction:column;gap:3px")}>
                        <span style={sx("font:500 13px/1.2 'IBM Plex Sans',sans-serif")}>{p.author}</span>
                        <span style={sx("font:400 12px/1.2 'IBM Plex Sans',sans-serif;color:#64665c")}>{p.role}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <section id="signup" style={sx("max-width:1240px;margin:0 auto;padding:88px 24px;scroll-margin-top:80px")}>
          <div style={sx("background:#2f5a3f;color:#faf8f3;border-radius:16px;padding:clamp(28px,5vw,56px);display:flex;flex-wrap:wrap;gap:36px;align-items:center")}>
            <div style={sx("flex:1 1 420px;min-width:0;display:flex;flex-direction:column;gap:14px")}>
              <h2 style={sx("margin:0;font:600 clamp(28px,3.6vw,40px)/1.12 'IBM Plex Sans',sans-serif;letter-spacing:-0.02em;text-wrap:balance")}>Formulate your next batch with Studio</h2>
              <p style={sx("margin:0;font:400 17px/1.6 'IBM Plex Sans',sans-serif;color:#e2ebe3")}>Free with an account. Your ingredient lists, prices and saved formulations stay private to you.</p>
            </div>
            <div style={sx("flex:1 1 320px;min-width:0;display:flex;flex-direction:column;gap:12px")}>
              <Link href={SIGNUP} className="fsl-amber" style={sx("font:600 16px/1 'IBM Plex Sans',sans-serif;padding:17px 22px;border-radius:9px;background:#e3aa45;color:#222420;text-decoration:none;text-align:center")}>Create a free account</Link>
              <a href={ASK} className="fsl-ghost" style={sx("font:500 15px/1 'IBM Plex Sans',sans-serif;padding:15px 20px;border-radius:9px;border:1px solid #6f9479;color:#faf8f3;text-decoration:none;text-align:center")}>Questions? Ask us on WhatsApp</a>
            </div>
          </div>
        </section>
      </main>

    </div>
  );
}
