import { Trash2 } from "lucide-react";
import { useState } from "react";

import { CAT_PAGE_SIZES, type ShellVals, type StudioVals } from "./studio";
import { STUDIO_CSS, hv, sx } from "./sx";

// Markup for the formulation studio, transcribed from the prototype template in
// design/FeedSport Prototype.html. Inline style strings are kept as written in
// the design; see sx.ts.

const MONO_LABEL = "font:500 12px/1 'IBM Plex Mono',monospace;color:#64665c;text-transform:uppercase;letter-spacing:0.05em";

export function StudioView(props: { loading: true; shell: ShellVals } | { loading?: false; shell: ShellVals; v: StudioVals }) {
  const { shell } = props;
  const v = props.loading ? null : props.v;
  const nav = v ? shell.nav : [];
  const refNav = v ? shell.refNav : [];
  return (
    <div className="fs-studio">
      <style dangerouslySetInnerHTML={{ __html: STUDIO_CSS }} />
      <div style={sx("display:flex;min-height:100vh;font-variant-numeric:tabular-nums;font-family:'IBM Plex Sans',sans-serif")}>
        {shell.wide && (
          <div className="fs-sidebar" style={sx("flex:none;background:#222420;color:#d0cdc3;display:flex;flex-direction:column;padding:20px 14px;gap:22px;position:sticky;top:0;height:100vh")}>
            <div style={sx("display:flex;align-items:center;gap:10px;padding:0 8px")}>
              <div style={sx("width:24px;height:24px;border-radius:6px;background:#e3aa45")} />
              <div style={sx("font:600 16px/1 'IBM Plex Sans',sans-serif;color:#faf8f3")}>FeedSport</div>
            </div>
            <button onClick={shell.startGuided} className={hv("amber")} style={sx("border:0;background:#e3aa45;color:#222420;font:600 13px/1 'IBM Plex Sans',sans-serif;padding:11px 12px;border-radius:7px;display:flex;justify-content:space-between;align-items:center")}>
              <span>New formulation</span>
              <span style={sx("font:500 15px/1 'IBM Plex Mono',monospace")}>+</span>
            </button>
            <div style={sx("display:flex;flex-direction:column;gap:2px")}>
              <div style={sx("font:500 11px/1 'IBM Plex Mono',monospace;color:#8d8a80;letter-spacing:0.06em;text-transform:uppercase;padding:0 10px 8px")}>Workspace</div>
              {nav.map((it) => (
                <button key={it.label} onClick={it.go} className={hv("nav")} style={sx(`border:0;text-align:left;display:flex;justify-content:space-between;padding:9px 10px;border-radius:6px;background:${it.bg};color:${it.color};font:400 14px/1.2 'IBM Plex Sans',sans-serif;box-shadow:${it.shadow}`)}>
                  <span>{it.label}</span>
                  <span style={sx("color:#8d8a80;font:400 12px/1.2 'IBM Plex Mono',monospace")}>{it.count}</span>
                </button>
              ))}
            </div>
            <div style={sx("display:flex;flex-direction:column;gap:2px")}>
              <div style={sx("font:500 11px/1 'IBM Plex Mono',monospace;color:#8d8a80;letter-spacing:0.06em;text-transform:uppercase;padding:0 10px 8px")}>Reference data</div>
              {refNav.map((it) => (
                <button key={it.label} onClick={it.go} className={hv("nav")} style={sx(`border:0;text-align:left;padding:9px 10px;border-radius:6px;background:${it.bg};color:${it.color};box-shadow:${it.shadow};font:400 14px/1.2 'IBM Plex Sans',sans-serif`)}>
                  {it.label}
                </button>
              ))}
            </div>
            <div style={sx("margin-top:auto;background:#2b2d29;border:1px solid #3a3c36;border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:10px")}>
              <div style={sx("display:flex;align-items:center;gap:8px")}>
                <span style={sx("flex:none;width:8px;height:8px;border-radius:50%;background:#7fc28f;box-shadow:0 0 0 3px rgba(127,194,143,.18)")} />
                <span style={sx("font:500 11px/1 'IBM Plex Mono',monospace;color:#b9b6ab;letter-spacing:0.06em;text-transform:uppercase")}>Nutritionists available</span>
              </div>
              <span style={sx("font:600 15px/1.3 'IBM Plex Sans',sans-serif;color:#faf8f3")}>Talk to a nutritionist</span>
              <span style={sx("font:400 13px/1.5 'IBM Plex Sans',sans-serif;color:#b9b6ab")}>Get a FeedSport nutritionist to check a recipe or help with a tricky stage.</span>
              <a href={shell.waHref} target="_blank" rel="noopener" className={hv("light")} style={sx("display:flex;align-items:center;justify-content:center;gap:8px;padding:11px 12px;border-radius:7px;background:#faf8f3;color:#222420;font:600 13px/1 'IBM Plex Sans',sans-serif;text-decoration:none")}>
                <span style={sx("flex:none;width:8px;height:8px;border-radius:50%;background:#2f7a4a")} />
                Chat on WhatsApp
              </a>
              <a href="tel:+263774684534" className={hv("signout")} style={sx("font:400 12px/1.3 'IBM Plex Sans',sans-serif;color:#b9b6ab;text-decoration:none;text-align:center")}>or call +263 77 468 4534</a>
            </div>
          </div>
        )}

        <div style={sx("flex:1;min-width:0;display:flex;flex-direction:column")}>
          {v && v.anyMenu && <div onClick={v.closeMenus} style={sx("position:fixed;inset:0;z-index:9")} />}
          {(shell.narrow || (v && v.showTop)) && (
            <div style={sx("position:sticky;top:0;z-index:10")}>
              {shell.narrow && (
                <div style={sx("display:flex;align-items:center;gap:14px;padding:12px 16px;background:#222420;color:#faf8f3")}>
                  <div style={sx("width:20px;height:20px;border-radius:5px;background:#e3aa45")} />
                  <button onClick={shell.goHome} style={sx("border:0;background:transparent;color:#faf8f3;font:600 15px/1 'IBM Plex Sans',sans-serif;padding:6px 0")}>FeedSport</button>
                  <div data-navscroll="1" style={sx("display:flex;gap:16px;overflow-x:auto;min-width:0;flex:1;scrollbar-width:none;-ms-overflow-style:none")}>
                    {[...nav, ...refNav].map((it) => (
                      <button key={it.label} onClick={it.go} style={sx(`flex:none;border:0;background:transparent;color:${it.color};font:400 14px/1 'IBM Plex Sans',sans-serif;padding:6px 0;white-space:nowrap;box-shadow:${it.barShadow}`)}>
                        {it.label}
                      </button>
                    ))}
                  </div>
                  <button onClick={shell.startGuided} style={sx("flex:none;border:0;background:#e3aa45;color:#222420;font:600 13px/1 'IBM Plex Sans',sans-serif;padding:10px 12px;border-radius:6px")}>New</button>
                </div>
              )}
              {v && v.showTop && <TopBar v={v} shell={shell} />}
            </div>
          )}

          {v && v.auth && <Auth a={v.auth} />}
          {!v && <div style={sx("padding:60px;font:400 15px/1.4 'IBM Plex Sans',sans-serif;color:#64665c")}>Loading formulation engine…</div>}

          {v && v.isHome && <Home v={v} />}
          {v && v.isSetup && <Setup v={v} />}
          {v && v.isWorkspace && <Workspace v={v} />}
          {v && v.isList && <List v={v} />}
          {v && v.isIngredients && <MyIngredients v={v} />}
          {v && v.isProgrammes && <Programmes v={v} />}
          {v && v.isNutrientsRef && <NutrientData v={v} />}
          {v && v.isCatalogue && <Catalogue v={v} />}
          {v && v.isCompare && <Compare v={v} />}
        </div>

        {v && v.d && <Drawer v={v} d={v.d} />}
        {v && v.advisoriesOpen && <AdvisoryDrawer v={v} />}
        {v && v.addOpen && <AddIngredient v={v} />}
        {v && v.rulesOpen && <Rules v={v} />}
        {v && v.cOpen && <Contact v={v} />}
        {v && v.hasToast && (
          <div style={sx("position:fixed;bottom:24px;left:0;right:0;margin:0 auto;width:fit-content;background:#222420;color:#faf8f3;padding:13px 18px;border-radius:9px;font:500 14px/1.3 'IBM Plex Sans',sans-serif;z-index:40;box-shadow:0 10px 30px rgba(0,0,0,.25);animation:fsin .2s ease-out;max-width:92vw")}>{v.toast}</div>
        )}
      </div>
    </div>
  );
}

type V = { v: StudioVals };

// The top bar lines up with the screen below it: capped and centred like the
// content pages, full width like the workspace and guided setup.
function topBarFrame(v: StudioVals) {
  if (v.isWorkspace) return "max-width:none;padding:10px clamp(16px,3vw,32px)";
  if (v.isSetup) return "max-width:none;padding:10px clamp(16px,4vw,48px)";
  if (v.isHome) return "max-width:1600px;padding:10px clamp(16px,4vw,48px)";
  return "max-width:1600px;padding:10px clamp(16px,4vw,40px)";
}

function TopBar({ v, shell }: V & { shell: ShellVals }) {
  return (
    <div style={sx("background:#fff;border-bottom:1px solid #e2dfd6")}>
      <div style={sx("display:flex;align-items:center;gap:14px;width:100%;margin:0 auto;" + topBarFrame(v))}>
        <div style={sx("position:relative;flex:1;max-width:600px;min-width:0")}>
          <div style={sx(`display:flex;align-items:center;gap:10px;padding:0 8px 0 12px;border:1px solid ${v.sBd};border-radius:8px;background:${v.sBg};box-shadow:${v.sRing}`)}>
            <span style={sx("flex:none;width:12px;height:12px;border:1.5px solid #64665c;border-radius:50%")} />
            <input
              ref={v.searchRef}
              value={v.sq}
              onChange={v.onSq}
              onFocus={v.onSFocus}
              onKeyDown={v.onSKey}
              placeholder="Search formulations, ingredients, programmes…"
              aria-label="Search FeedSport"
              role="combobox"
              aria-expanded={v.sOpen}
              autoComplete="off"
              style={sx("flex:1;min-width:0;border:0;padding:10px 0;font:400 14px/1 'IBM Plex Sans',sans-serif;outline:none;background:transparent;color:#222420")}
            />
            <span style={sx("flex:none;font:500 11px/1 'IBM Plex Mono',monospace;color:#64665c;border:1px solid #d0cdc3;border-radius:4px;padding:3px 6px;background:#fff")}>/</span>
          </div>
          {v.sOpen && (
            <div role="listbox" style={sx("position:absolute;top:calc(100% + 6px);left:0;width:max(100%, min(560px, 92vw));max-height:min(70vh,540px);overflow-y:auto;background:#fff;border:1px solid #e2dfd6;border-radius:10px;box-shadow:0 16px 40px rgba(34,36,32,.18);padding:6px 0;animation:fsin .15s ease-out")}>
              {v.sGroups.map((g) => (
                <div key={g.title}>
                  <div style={sx("padding:10px 14px 4px;font:500 11px/1 'IBM Plex Mono',monospace;color:#64665c;text-transform:uppercase;letter-spacing:0.05em")}>{g.title}</div>
                  {g.items.map((it) => (
                    <button key={it.key} onClick={it.go} onMouseEnter={it.hover} role="option" aria-selected={it.enter === "1"} style={sx(`width:100%;border:0;background:${it.bg};text-align:left;display:flex;align-items:center;gap:12px;padding:8px 14px;color:#222420`)}>
                      <span style={sx(`flex:none;width:28px;height:28px;border-radius:6px;background:${it.iconBg};color:${it.iconFg};font:600 12px/28px 'IBM Plex Mono',monospace;text-align:center`)}>{it.icon}</span>
                      <span style={sx("flex:1;min-width:0;display:flex;flex-direction:column;gap:3px")}>
                        <span style={sx("font:500 14px/1.2 'IBM Plex Sans',sans-serif")}>{it.label}</span>
                        <span style={sx("font:400 12px/1.3 'IBM Plex Sans',sans-serif;color:#64665c;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{it.sub}</span>
                      </span>
                      <span style={sx(`flex:none;font:500 12px/1 'IBM Plex Mono',monospace;color:#2f5a3f;opacity:${it.enter}`)}>↵</span>
                    </button>
                  ))}
                </div>
              ))}
              {v.sEmpty && (
                <div style={sx("padding:14px 16px;display:flex;flex-direction:column;gap:4px;font:400 14px/1.45 'IBM Plex Sans',sans-serif;color:#45473f")}>
                  <span style={sx("font-weight:600;color:#222420")}>{v.sEmptyTitle}</span>
                  <span style={sx("font-size:13px;color:#64665c")}>Try an ingredient such as maize, a stage such as grower, or a nutrient such as lysine.</span>
                </div>
              )}
              <div style={sx("display:flex;gap:14px;padding:10px 14px 6px;margin-top:4px;border-top:1px solid #ece8df;font:400 12px/1 'IBM Plex Sans',sans-serif;color:#64665c;flex-wrap:wrap")}>
                <span>↑ ↓ to move</span>
                <span>↵ to open</span>
                <span>esc to close</span>
                <span style={sx("margin-left:auto")}>/ or Ctrl K from anywhere</span>
              </div>
            </div>
          )}
        </div>
        <a href="/" target="_blank" rel="noopener" title="Open the FeedSport website in a new tab" className={hv("soft")} style={sx("flex:none;margin-left:auto;display:flex;align-items:center;gap:6px;padding:8px 10px;border-radius:7px;font:500 13px/1 'IBM Plex Sans',sans-serif;color:#45473f;text-decoration:none;white-space:nowrap")}>
          <span aria-hidden>←</span>
          {v.siteLabel}
        </a>
        <div style={sx("position:relative;flex:none")}>
          <button onClick={v.toggleNotifications} aria-haspopup="menu" aria-expanded={v.nOpen} aria-label={v.nLabel} title={v.nLabel} className={hv("soft")} style={sx(`position:relative;display:flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:99px;border:1px solid ${v.nOpen ? "#d0cdc3" : "transparent"};background:${v.nOpen ? "#f3f0e8" : "transparent"};color:#45473f`)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            {v.nUnread > 0 && (
              <span style={sx("position:absolute;top:2px;right:1px;min-width:18px;height:18px;padding:0 5px;border-radius:99px;background:#b2412e;color:#fff;border:2px solid #fff;font:600 10px/14px 'IBM Plex Sans',sans-serif;text-align:center;box-sizing:border-box")}>{v.nBadge}</span>
            )}
          </button>
          {v.nOpen && (
            <div role="menu" style={sx("position:absolute;right:0;top:calc(100% + 6px);width:360px;max-width:92vw;max-height:min(70vh,520px);display:flex;flex-direction:column;background:#fff;border:1px solid #e2dfd6;border-radius:10px;box-shadow:0 16px 40px rgba(34,36,32,.18);overflow:hidden;animation:fsin .15s ease-out;z-index:5")}>
              <div style={sx("display:flex;justify-content:space-between;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid #ece8df")}>
                <span style={sx("font:600 15px/1.2 'IBM Plex Sans',sans-serif")}>Advice from FeedSport</span>
                {v.nUnread > 0 && <button onClick={v.markAllRead} style={sx("border:0;background:transparent;padding:0;font:500 13px/1 'IBM Plex Sans',sans-serif;color:#2f5a3f")}>Mark all read</button>}
              </div>
              <div style={sx("overflow-y:auto")}>
                {v.nItems.map((n) => (
                  <button key={n.key} onClick={n.go} role="menuitem" className={hv("row")} style={sx(`width:100%;border:0;border-top:1px solid #ece8df;background:${n.unread ? "#f4f8f4" : "#fff"};text-align:left;display:flex;gap:10px;padding:12px 16px;color:#222420`)}>
                    <span style={sx(`flex:none;margin-top:5px;width:8px;height:8px;border-radius:50%;background:${n.unread ? "#2f5a3f" : "transparent"}`)} />
                    <span style={sx("flex:1;min-width:0;display:flex;flex-direction:column;gap:4px")}>
                      <span style={sx("display:flex;justify-content:space-between;gap:10px")}>
                        <span style={sx(`font:${n.unread ? 600 : 500} 14px/1.25 'IBM Plex Sans',sans-serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap`)}>{n.title}</span>
                        <span style={sx("flex:none;font:400 12px/1.25 'IBM Plex Sans',sans-serif;color:#64665c")}>{n.date}</span>
                      </span>
                      <span style={sx("font:400 13px/1.45 'IBM Plex Sans',sans-serif;color:#45473f;overflow-wrap:anywhere")}>
                        <b style={sx("font-weight:600")}>{n.author}:</b> {n.text}
                      </span>
                    </span>
                  </button>
                ))}
                {v.nEmpty && <div style={sx("padding:18px 16px;font:400 13px/1.5 'IBM Plex Sans',sans-serif;color:#64665c")}>No advice yet. When a FeedSport nutritionist reviews one of your formulations, their notes appear here.</div>}
              </div>
            </div>
          )}
        </div>
        <div style={sx("position:relative;flex:none")}>
          <button onClick={v.toggleUser} aria-haspopup="menu" aria-expanded={v.uOpen} className={hv("pool")} style={sx(`display:flex;align-items:center;gap:10px;border:1px solid ${v.uBtnBd};background:${v.uBtnBg};padding:4px 10px 4px 4px;border-radius:99px;color:#222420`)}>
            <span style={sx("flex:none;width:30px;height:30px;border-radius:50%;background:#2f5a3f;color:#faf8f3;font:600 12px/30px 'IBM Plex Sans',sans-serif;text-align:center")}>{shell.userInitials}</span>
            {shell.wide && (
              <span style={sx("display:flex;flex-direction:column;gap:3px;text-align:left;max-width:180px")}>
                <span style={sx("font:500 13px/1.1 'IBM Plex Sans',sans-serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{shell.userName}</span>
                <span style={sx("font:400 12px/1 'IBM Plex Sans',sans-serif;color:#64665c")}>{shell.userRole}</span>
              </span>
            )}
            <span style={sx("font:400 11px/1 'IBM Plex Sans',sans-serif;color:#64665c")}>▾</span>
          </button>
          {v.uOpen && (
            <div role="menu" style={sx("position:absolute;right:0;top:calc(100% + 6px);width:290px;max-width:92vw;background:#fff;border:1px solid #e2dfd6;border-radius:10px;box-shadow:0 16px 40px rgba(34,36,32,.18);overflow:hidden;animation:fsin .15s ease-out")}>
              <div style={sx("display:flex;gap:12px;align-items:center;padding:16px;border-bottom:1px solid #ece8df")}>
                <span style={sx("flex:none;width:40px;height:40px;border-radius:50%;background:#2f5a3f;color:#faf8f3;font:600 14px/40px 'IBM Plex Sans',sans-serif;text-align:center")}>{shell.userInitials}</span>
                <span style={sx("display:flex;flex-direction:column;gap:4px;min-width:0")}>
                  <span style={sx("font:600 15px/1.2 'IBM Plex Sans',sans-serif")}>{shell.userName}</span>
                  <span style={sx("font:400 13px/1.2 'IBM Plex Sans',sans-serif;color:#64665c;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{v.userEmail}</span>
                  <span style={sx("align-self:flex-start;font:500 11px/1 'IBM Plex Mono',monospace;color:#1f3e2b;background:#eef3ee;border-radius:4px;padding:4px 6px;text-transform:uppercase;letter-spacing:0.04em")}>{shell.userRole}</span>
                </span>
              </div>
              <div style={sx("display:flex;flex-direction:column;padding:6px 0")}>
                {v.uItems.map((m) => (
                  <button key={m.label} onClick={m.go} role="menuitem" className={hv("row")} style={sx("border:0;background:transparent;text-align:left;display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 16px;color:#222420")}>
                    <span style={sx("font:500 14px/1.2 'IBM Plex Sans',sans-serif")}>{m.label}</span>
                    <span style={sx("font:400 12px/1.2 'IBM Plex Sans',sans-serif;color:#64665c")}>{m.sub}</span>
                  </button>
                ))}
              </div>
              <div style={sx("display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 16px 12px;border-top:1px solid #ece8df")}>
                <span style={sx("font:500 13px/1.2 'IBM Plex Sans',sans-serif;color:#45473f")}>Show prices</span>
                <div style={sx("display:flex;background:#f3f0e8;border-radius:7px;padding:3px")}>
                  {v.uUnits.map((u) => (
                    <button key={u.label} onClick={u.pick} role="menuitemradio" aria-checked={u.w === "600"} style={sx(`border:0;padding:7px 10px;border-radius:5px;background:${u.bg};box-shadow:${u.sh};font:${u.w} 12px/1 'IBM Plex Sans',sans-serif;color:#222420`)}>{u.label}</button>
                  ))}
                </div>
              </div>
              <a href="/" target="_blank" rel="noopener" role="menuitem" className={hv("row")} style={sx("display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-top:1px solid #ece8df;font:500 14px/1 'IBM Plex Sans',sans-serif;color:#222420;text-decoration:none")}>
                <span>FeedSport website</span>
                <span style={sx("font:400 12px/1 'IBM Plex Sans',sans-serif;color:#64665c")}>feedsport.co.zw ↗</span>
              </a>
              <button onClick={shell.signOut} role="menuitem" className={hv("danger")} style={sx("width:100%;border:0;border-top:1px solid #ece8df;background:transparent;text-align:left;padding:12px 16px;font:500 14px/1 'IBM Plex Sans',sans-serif;color:#a63d2a")}>Sign out</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Contact({ v }: V) {
  return (
    <>
      <div onClick={v.closeContact} style={sx("position:fixed;inset:0;background:rgba(34,36,32,.38);z-index:30")} />
      <div role="dialog" aria-label="Talk to a nutritionist" style={sx("position:fixed;top:6vh;left:0;right:0;margin:0 auto;width:min(520px,94vw);max-height:88vh;overflow-y:auto;background:#fff;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.25);z-index:31;display:flex;flex-direction:column;animation:fsin .2s ease-out")}>
        <div style={sx("padding:20px 22px 16px;border-bottom:1px solid #e2dfd6;display:flex;justify-content:space-between;align-items:flex-start;gap:12px")}>
          <div style={sx("display:flex;flex-direction:column;gap:6px")}>
            <span style={sx("font:600 20px/1.2 'IBM Plex Sans',sans-serif")}>Talk to a nutritionist</span>
            <span style={sx("font:400 13px/1.5 'IBM Plex Sans',sans-serif;color:#64665c")}>A FeedSport nutritionist will reply within one working day.</span>
          </div>
          <button onClick={v.closeContact} aria-label="Close" style={sx("border:0;background:transparent;font:400 24px/1 'IBM Plex Sans',sans-serif;color:#64665c;padding:0")}>×</button>
        </div>
        {v.cSent ? (
          <div style={sx("padding:28px 22px;display:flex;flex-direction:column;gap:14px")}>
            <span style={sx("display:flex;align-items:center;gap:10px;font:600 17px/1.3 'IBM Plex Sans',sans-serif;color:#2b6a42")}>
              <span style={sx("flex:none;width:10px;height:10px;border-radius:50%;background:#2f7a4a")} />
              Request sent
            </span>
            <span style={sx("font:400 14px/1.6 'IBM Plex Sans',sans-serif;color:#45473f")}>{v.cSentText}</span>
            <button onClick={v.closeContact} style={sx("align-self:flex-start;border:0;background:#2f5a3f;color:#fff;font:600 14px/1 'IBM Plex Sans',sans-serif;padding:12px 18px;border-radius:8px")}>Done</button>
          </div>
        ) : (
          <>
            <div style={sx("padding:18px 22px;display:flex;flex-direction:column;gap:16px")}>
              <div style={sx("display:flex;flex-direction:column;gap:8px")}>
                <span style={sx("font:500 14px/1 'IBM Plex Sans',sans-serif")}>What do you need help with?</span>
                {v.cTopics.map((t) => (
                  <button key={t.key} onClick={t.pick} style={sx(`text-align:left;display:flex;gap:12px;align-items:center;padding:11px 13px;border-radius:8px;border:1px solid #d0cdc3;box-shadow:${t.ring};background:${t.bg};color:#222420`)}>
                    <span style={sx(`flex:none;width:16px;height:16px;border-radius:50%;border:${t.radio}`)} />
                    <span style={sx("font:500 14px/1.3 'IBM Plex Sans',sans-serif")}>{t.label}</span>
                  </button>
                ))}
              </div>
              {v.cCanAttach && (
                <button onClick={v.cToggleAttach} style={sx("text-align:left;display:flex;gap:12px;align-items:flex-start;padding:12px 13px;border-radius:8px;border:1px solid #e2dfd6;background:#faf8f3;color:#222420")}>
                  <span style={sx(`flex:none;margin-top:1px;width:18px;height:18px;border-radius:4px;border:1.5px solid ${v.cAttachBd};background:${v.cAttachBg};color:#fff;font:600 11px/15px 'IBM Plex Sans',sans-serif;text-align:center`)}>{v.cAttachMark}</span>
                  <span style={sx("display:flex;flex-direction:column;gap:3px")}>
                    <span style={sx("font:500 14px/1.3 'IBM Plex Sans',sans-serif")}>Attach “{v.cDocName}”</span>
                    <span style={sx("font:400 12px/1.4 'IBM Plex Sans',sans-serif;color:#64665c")}>{v.cDocSub}</span>
                  </span>
                </button>
              )}
              <label style={sx("display:flex;flex-direction:column;gap:7px;font:500 14px/1 'IBM Plex Sans',sans-serif")}>
                Phone or WhatsApp
                <input type="tel" value={v.cPhone} onChange={v.onCPhone} placeholder="+263 …" autoComplete="tel" style={sx(`padding:11px 12px;border:1px solid ${v.cPhoneBd};border-radius:8px;font:400 15px/1 'IBM Plex Sans',sans-serif`)} />
                {v.cPhoneErr && <span style={sx("font:400 13px/1.3 'IBM Plex Sans',sans-serif;color:#a63d2a")}>{v.cPhoneErr}</span>}
                <span style={sx("font:400 12px/1.3 'IBM Plex Sans',sans-serif;color:#64665c")}>We&apos;ll also reply to {v.userEmail}.</span>
              </label>
              <label style={sx("display:flex;flex-direction:column;gap:7px;font:500 14px/1 'IBM Plex Sans',sans-serif")}>
                <span>
                  Message <span style={sx("font-weight:400;color:#64665c;font-size:13px")}>Optional</span>
                </span>
                <textarea value={v.cMsg} onChange={v.onCMsg} rows={3} placeholder="e.g. Herd size, what you're seeing, what you've tried" style={sx("padding:11px 12px;border:1px solid #d0cdc3;border-radius:8px;font:400 14px/1.45 'IBM Plex Sans',sans-serif;resize:vertical")} />
              </label>
            </div>
            <div style={sx("padding:14px 22px 18px;border-top:1px solid #e2dfd6;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap")}>
              <a href={v.waHref} target="_blank" rel="noopener" style={sx("display:flex;align-items:center;gap:7px;font:600 13px/1.3 'IBM Plex Sans',sans-serif;color:#2f5a3f")}>
                <span style={sx("flex:none;width:8px;height:8px;border-radius:50%;background:#2f7a4a")} />
                Prefer WhatsApp? Chat now ↗
              </a>
              <div style={sx("display:flex;gap:10px")}>
                <button onClick={v.closeContact} style={sx("border:1px solid #d0cdc3;background:#fff;font:500 14px/1 'IBM Plex Sans',sans-serif;padding:12px 16px;border-radius:8px;color:#222420")}>Cancel</button>
                <button onClick={v.sendContact} disabled={v.cBusy} style={sx(`border:0;background:${v.cBtnBg};color:#fff;font:600 14px/1 'IBM Plex Sans',sans-serif;padding:12px 18px;border-radius:8px`)}>{v.cBtn}</button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// Saved formulations load from the database: say so while they do, if they
// can't, and when there are none yet.
function SavedState({ v, empty }: V & { empty: boolean }) {
  if (v.savedError)
    return (
      <div style={sx("padding:14px 20px;border-top:1px solid #ece8df;font:400 14px/1.5 'IBM Plex Sans',sans-serif;color:#64665c;display:flex;gap:12px;flex-wrap:wrap")}>
        <span style={sx("color:#a63d2a")}>Couldn’t load your formulations.</span>
        <button onClick={v.retrySaved} style={sx("border:0;background:transparent;padding:0;font:600 13px/1.5 'IBM Plex Sans',sans-serif;color:#2f5a3f")}>Try again</button>
      </div>
    );
  if (v.savedLoading) return <div style={sx("padding:14px 20px;border-top:1px solid #ece8df;font:400 14px/1.5 'IBM Plex Sans',sans-serif;color:#64665c")}>Loading your formulations…</div>;
  if (empty) return <div style={sx("padding:14px 20px;border-top:1px solid #ece8df;font:400 14px/1.5 'IBM Plex Sans',sans-serif;color:#64665c")}>No saved formulations yet. Formulate a feed and press Save to keep it here.</div>;
  return null;
}

const AUTH_LABEL = "display:flex;flex-direction:column;gap:7px;font:500 14px/1 'IBM Plex Sans',sans-serif";
const AUTH_ERR = "font:400 13px/1.3 'IBM Plex Sans',sans-serif;color:#a63d2a";
const AUTH_LINK = "border:0;background:transparent;padding:0;font:600 14px/1 'IBM Plex Sans',sans-serif;color:#2f5a3f";

function Auth({ a }: { a: NonNullable<StudioVals["auth"]> }) {
  return (
    <div style={sx("min-height:100vh;display:flex;flex-wrap:wrap;background:#faf8f3")}>
      {/* fs-auth-aside pins this panel to the viewport on desktop; see STUDIO_CSS. */}
      <div className="fs-auth-aside" style={sx("flex:1 1 420px;background:#2f5a3f;color:#faf8f3;padding:clamp(28px,5vw,64px);display:flex;flex-direction:column;justify-content:space-between;gap:40px;min-height:220px")}>
        <div style={sx("display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap")}>
          <div style={sx("display:flex;align-items:center;gap:10px")}>
            <div style={sx("width:26px;height:26px;border-radius:7px;background:#e3aa45")} />
            <span style={sx("font:600 18px/1 'IBM Plex Sans',sans-serif")}>FeedSport</span>
          </div>
          <a href="/" className={hv("signout")} style={sx("color:#dbe7dc;font:500 14px/1 'IBM Plex Sans',sans-serif;text-decoration:none")}>← Back to FeedSport site</a>
        </div>
        <div style={sx("display:flex;flex-direction:column;gap:18px;max-width:440px")}>
          <span style={sx("font:600 clamp(26px,3.2vw,38px)/1.15 'IBM Plex Sans',sans-serif;letter-spacing:-0.02em;text-wrap:balance")}>Balanced feed from the ingredients you actually have.</span>
          <span style={sx("font:400 16px/1.6 'IBM Plex Sans',sans-serif;color:#dbe7dc")}>Choose the animal and stage, tell FeedSport what&apos;s in your store, and get a least-cost recipe that meets every requirement.</span>
        </div>
        <span style={sx("font:400 13px/1.5 'IBM Plex Sans',sans-serif;color:#b9d0bd")}>FeedSport International · Harare, Zimbabwe</span>
      </div>
      <div style={sx("flex:1 1 460px;display:flex;align-items:center;justify-content:center;padding:clamp(28px,5vw,64px) 24px")}>
        <form onSubmit={a.aSubmit} noValidate style={sx("width:100%;max-width:400px;display:flex;flex-direction:column;gap:18px;animation:fsin .25s ease-out")}>
          <div style={sx("display:flex;flex-direction:column;gap:8px")}>
            <span style={sx("font:600 26px/1.2 'IBM Plex Sans',sans-serif;letter-spacing:-0.015em")}>{a.aTitle}</span>
            <span style={sx("font:400 14px/1.55 'IBM Plex Sans',sans-serif;color:#45473f")}>{a.aSub}</span>
          </div>

          {a.aHasFormErr && (
            <div style={sx("display:flex;gap:10px;align-items:flex-start;padding:12px 14px;background:#f7e4df;border:1px solid #e9b9ad;border-radius:8px;font:500 13px/1.45 'IBM Plex Sans',sans-serif;color:#7a2a1c")}>
              <span style={sx("flex:none;margin-top:4px;width:8px;height:8px;background:#b2412e")} />
              {a.aFormErr}
            </div>
          )}

          {a.aSent && (
            <div style={sx("display:flex;flex-direction:column;gap:12px")}>
              <button type="button" onClick={a.goSignin} style={sx("border:0;background:#2f5a3f;color:#fff;font:600 15px/1 'IBM Plex Sans',sans-serif;padding:14px;border-radius:8px")}>Back to sign in</button>
              <button type="button" onClick={a.aResend} style={sx("border:1px solid #d0cdc3;background:#fff;color:#222420;font:500 14px/1 'IBM Plex Sans',sans-serif;padding:13px;border-radius:8px")}>Resend the link</button>
              <span style={sx("font:400 13px/1.5 'IBM Plex Sans',sans-serif;color:#64665c")}>Can&apos;t find it? Check spam, or contact FeedSport on WhatsApp.</span>
            </div>
          )}

          {a.aForm && (
            <>
              {a.aSignup && (
                <label style={sx(AUTH_LABEL)}>
                  Your name
                  <input value={a.aName.val} onChange={a.aName.on} autoComplete="name" style={sx(`padding:12px 13px;border:1px solid ${a.aName.bd};border-radius:8px;font:400 15px/1 'IBM Plex Sans',sans-serif;background:#fff`)} />
                  {a.aName.hasErr && <span style={sx(AUTH_ERR)}>{a.aName.err}</span>}
                </label>
              )}
              {a.aNeedsEmail && (
              <label style={sx(AUTH_LABEL)}>
                Email
                <input type="email" value={a.aEmail.val} onChange={a.aEmail.on} autoComplete="email" placeholder="you@farm.co.zw" style={sx(`padding:12px 13px;border:1px solid ${a.aEmail.bd};border-radius:8px;font:400 15px/1 'IBM Plex Sans',sans-serif;background:#fff`)} />
                {a.aEmail.hasErr && <span style={sx(AUTH_ERR)}>{a.aEmail.err}</span>}
              </label>
              )}
              {a.aNeedsPass && (
                // A div, not a label: a label wrapping the "Forgot password?" button
                // would hand clicks on "Password" to that button.
                <div style={sx(AUTH_LABEL)}>
                  <span style={sx("display:flex;justify-content:space-between;align-items:baseline")}>
                    <label htmlFor="fs-auth-password">{a.aReset ? "New password" : "Password"}</label>
                    {a.aSignin && <button type="button" onClick={a.goForgot} style={sx("border:0;background:transparent;padding:0;font:500 13px/1 'IBM Plex Sans',sans-serif;color:#2f5a3f")}>Forgot password?</button>}
                  </span>
                  <div style={sx(`display:flex;align-items:center;border:1px solid ${a.aPass.bd};border-radius:8px;background:#fff;padding-right:6px`)}>
                    <input id="fs-auth-password" type={a.aPassType} value={a.aPass.val} onChange={a.aPass.on} autoComplete={a.aSignin ? "current-password" : "new-password"} style={sx("flex:1;min-width:0;border:0;padding:12px 13px;font:400 15px/1 'IBM Plex Sans',sans-serif;outline:none;background:transparent;border-radius:8px")} />
                    <button type="button" onClick={a.aToggleShow} style={sx("border:0;background:transparent;font:500 13px/1 'IBM Plex Sans',sans-serif;color:#45473f;padding:8px")}>{a.aShowLabel}</button>
                  </div>
                  {a.aPass.hasErr && <span style={sx(AUTH_ERR)}>{a.aPass.err}</span>}
                  {a.aShowChecks && (
                    <span style={sx("display:flex;gap:14px;font:400 12px/1 'IBM Plex Sans',sans-serif")}>
                      {a.aChecks.map((c) => (
                        <span key={c.label} style={sx(`color:${c.color}`)}>
                          {c.mark} {c.label}
                        </span>
                      ))}
                    </span>
                  )}
                </div>
              )}
              {a.aSignup && (
                <>
                  <label style={sx(AUTH_LABEL)}>
                    Farm or company <span style={sx("font-weight:400;color:#64665c;font-size:13px;margin-top:-2px")}>Optional</span>
                    <input value={a.aOrg.val} onChange={a.aOrg.on} autoComplete="organization" style={sx("padding:12px 13px;border:1px solid #d0cdc3;border-radius:8px;font:400 15px/1 'IBM Plex Sans',sans-serif;background:#fff")} />
                  </label>
                  <div style={sx("display:flex;flex-direction:column;gap:8px")}>
                    <span style={sx("font:500 14px/1 'IBM Plex Sans',sans-serif")}>Which describes you?</span>
                    {a.aRoles.map((r) => (
                      <button key={r.label} type="button" onClick={r.pick} style={sx(`text-align:left;display:flex;gap:12px;align-items:flex-start;padding:11px 13px;border-radius:8px;border:1px solid #d0cdc3;box-shadow:${r.ring};background:${r.bg};color:#222420`)}>
                        <span style={sx(`flex:none;margin-top:1px;width:16px;height:16px;border-radius:50%;border:${r.radio}`)} />
                        <span style={sx("display:flex;flex-direction:column;gap:3px")}>
                          <span style={sx("font:600 14px/1.2 'IBM Plex Sans',sans-serif")}>{r.label}</span>
                          <span style={sx("font:400 12px/1.35 'IBM Plex Sans',sans-serif;color:#45473f")}>{r.sub}</span>
                        </span>
                      </button>
                    ))}
                    <span style={sx("font:400 12px/1.4 'IBM Plex Sans',sans-serif;color:#64665c")}>Only used to tailor where you start. Everyone gets the same tools.</span>
                  </div>
                </>
              )}
              <button type="submit" disabled={a.aBusy} style={sx(`display:flex;align-items:center;justify-content:center;gap:10px;border:0;background:${a.aBtnBg};color:#fff;font:600 15px/1 'IBM Plex Sans',sans-serif;padding:14px;border-radius:8px`)}>{a.aBtn}</button>
              {a.aShowGoogle && (
                <>
                  <div style={sx("display:flex;align-items:center;gap:12px;font:400 12px/1 'IBM Plex Sans',sans-serif;color:#8d8a80")}>
                    <span style={sx("flex:1;height:1px;background:#e2dfd6")} />
                    or
                    <span style={sx("flex:1;height:1px;background:#e2dfd6")} />
                  </div>
                  <button type="button" onClick={a.aGoogle} disabled={a.aBusy} style={sx("border:1px solid #d0cdc3;background:#fff;color:#222420;font:500 15px/1 'IBM Plex Sans',sans-serif;padding:13px;border-radius:8px")}>{a.aGoogleLabel}</button>
                </>
              )}
            </>
          )}

          <div style={sx("font:400 14px/1.5 'IBM Plex Sans',sans-serif;color:#45473f;text-align:center;padding-top:4px")}>
            {a.aSignin && (
              <span>
                New to FeedSport? <button type="button" onClick={a.goSignup} style={sx(AUTH_LINK)}>Create an account</button>
              </span>
            )}
            {a.aSignup && (
              <span>
                Already have an account? <button type="button" onClick={a.goSignin} style={sx(AUTH_LINK)}>Sign in</button>
              </span>
            )}
            {a.aForgot && <button type="button" onClick={a.goSignin} style={sx(AUTH_LINK)}>Back to sign in</button>}
          </div>
        </form>
      </div>
    </div>
  );
}

function Home({ v }: V) {
  return (
    <div style={sx("padding:40px clamp(16px,4vw,48px);display:flex;flex-direction:column;gap:28px;max-width:1600px;width:100%;margin:0 auto;animation:fsin .25s ease-out")}>
      <div style={sx("font:600 26px/1.2 'IBM Plex Sans',sans-serif;letter-spacing:-0.015em")}>Home</div>
      <div style={sx("display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px")}>
        <button onClick={v.startGuided} className={hv("green")} style={sx("text-align:left;border:0;background:#2f5a3f;color:#faf8f3;border-radius:10px;padding:24px;display:flex;flex-direction:column;gap:12px;min-height:170px")}>
          <span style={sx("font:500 12px/1 'IBM Plex Mono',monospace;letter-spacing:0.06em;text-transform:uppercase;color:#cfe0d2")}>Guided</span>
          <span style={sx("font:600 20px/1.25 'IBM Plex Sans',sans-serif")}>Formulate a feed</span>
          <span style={sx("font:400 14px/1.5 'IBM Plex Sans',sans-serif;color:#e2ebe3")}>Choose the animal, tell us what ingredients you have, and get a balanced recipe.</span>
          <span style={sx("margin-top:auto;background:#e3aa45;color:#222420;font:600 14px/1 'IBM Plex Sans',sans-serif;padding:11px 16px;border-radius:7px")}>Start</span>
        </button>
        <button onClick={v.startBlank} className={hv("card")} style={sx("text-align:left;background:#fff;border:1px solid #e2dfd6;border-radius:10px;padding:24px;display:flex;flex-direction:column;gap:12px;color:#222420")}>
          <span style={sx("font:500 12px/1 'IBM Plex Mono',monospace;letter-spacing:0.06em;text-transform:uppercase;color:#64665c")}>Advanced</span>
          <span style={sx("font:600 18px/1.25 'IBM Plex Sans',sans-serif")}>Open a blank workspace</span>
          <span style={sx("font:400 14px/1.5 'IBM Plex Sans',sans-serif;color:#64665c")}>Skip the guide. Set programme, ingredients, limits and overrides in one place.</span>
        </button>
        <button onClick={v.goList} className={hv("card")} style={sx("text-align:left;background:#fff;border:1px solid #e2dfd6;border-radius:10px;padding:24px;display:flex;flex-direction:column;gap:12px;color:#222420")}>
          <span style={sx("font:500 12px/1 'IBM Plex Mono',monospace;letter-spacing:0.06em;text-transform:uppercase;color:#64665c")}>Reuse</span>
          <span style={sx("font:600 18px/1.25 'IBM Plex Sans',sans-serif")}>Start from a saved formulation</span>
          <span style={sx("font:400 14px/1.5 'IBM Plex Sans',sans-serif;color:#64665c")}>Reopen any version. Saving again creates a new version.</span>
        </button>
      </div>
      <div style={sx("background:#fff;border:1px solid #e2dfd6;border-radius:10px;overflow:hidden")}>
        <div style={sx("display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid #e2dfd6")}>
          <span style={sx("font:600 16px/1 'IBM Plex Sans',sans-serif")}>Recent formulations</span>
          <button onClick={v.goList} style={sx("border:0;background:transparent;font:500 13px/1 'IBM Plex Sans',sans-serif;color:#2f5a3f")}>All formulations</button>
        </div>
        <SavedState v={v} empty={v.recent.length === 0} />
        {v.recent.map((d, i) => (
          <button key={i} onClick={d.open} className={hv("row")} style={sx("width:100%;border:0;border-top:1px solid #ece8df;background:#fff;text-align:left;display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1.5fr) minmax(0,1.3fr) 90px;gap:12px;padding:14px 20px;font:400 14px/1.3 'IBM Plex Sans',sans-serif;align-items:center;color:#222420")}>
            <span style={sx("font-weight:500")}>
              {d.name} <span style={sx("color:#64665c;font-weight:400")}>v{d.v}</span>
            </span>
            <span style={sx("color:#45473f")}>{d.prog}</span>
            <span style={sx(`display:flex;align-items:center;gap:7px;color:${d.st.color}`)}>
              <span style={sx(`flex:none;width:8px;height:8px;background:${d.st.bg};border-radius:${d.st.r};transform:rotate(${d.st.rot})`)} />
              {d.st.label}
            </span>
            <span style={sx("text-align:right")}>{d.cost}</span>
          </button>
        ))}
      </div>
      <Featured v={v} />
    </div>
  );
}

const FEAT_LABEL = "font:400 11px/1 'IBM Plex Sans',sans-serif;color:#64665c";

function Featured({ v }: V) {
  return (
    <div style={sx("display:flex;flex-direction:column;gap:14px")}>
      <div style={sx("display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap")}>
        <div style={sx("display:flex;flex-direction:column;gap:6px")}>
          <span style={sx("font:600 16px/1 'IBM Plex Sans',sans-serif")}>Featured formulations</span>
          <span style={sx("font:400 13px/1.45 'IBM Plex Sans',sans-serif;color:#64665c")}>Published by FeedSport nutritionists. Use one as a starting point; it opens as your own copy.</span>
        </div>
        <div style={sx("display:flex;background:#f3f0e8;border-radius:7px;padding:3px")}>
          {v.featFilters.map((o) => (
            <button key={o.label} onClick={o.pick} style={sx(`border:0;padding:7px 12px;border-radius:5px;background:${o.bg};box-shadow:${o.sh};font:${o.w} 13px/1 'IBM Plex Sans',sans-serif;color:#222420`)}>{o.label}</button>
          ))}
        </div>
      </div>
      {v.featLoading && <div style={sx("padding:18px;background:#fff;border:1px solid #e2dfd6;border-radius:10px;font:400 14px/1.5 'IBM Plex Sans',sans-serif;color:#64665c")}>Formulating featured recipes against today’s programmes and prices…</div>}
      <div style={sx("display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px")}>
        {v.featured.map((p) => (
          <div key={p.id} style={sx("background:#fff;border:1px solid #e2dfd6;border-radius:10px;padding:18px;display:flex;flex-direction:column;gap:12px")}>
            <div style={sx("display:flex;justify-content:space-between;align-items:center;gap:8px")}>
              <span style={sx("font:500 11px/1.3 'IBM Plex Mono',monospace;color:#64665c;text-transform:uppercase;letter-spacing:0.05em")}>{p.prog}</span>
              {p.verified && (
                <span style={sx("flex:none;display:flex;align-items:center;gap:5px;font:500 11px/1 'IBM Plex Sans',sans-serif;color:#1f3e2b;background:#eef3ee;border-radius:99px;padding:4px 8px")}>
                  <span style={sx("width:6px;height:6px;border-radius:50%;background:#2f7a4a")} />
                  Reviewed by FeedSport
                </span>
              )}
            </div>
            <div style={sx("display:flex;flex-direction:column;gap:6px")}>
              <span style={sx("font:600 16px/1.3 'IBM Plex Sans',sans-serif")}>{p.name}</span>
              <span style={sx("font:400 13px/1.5 'IBM Plex Sans',sans-serif;color:#45473f")}>{p.desc}</span>
            </div>
            <span style={sx("font:400 12px/1.5 'IBM Plex Sans',sans-serif;color:#64665c")}>{p.ings}</span>
            <div style={sx("display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;padding:10px 0;border-top:1px solid #ece8df;border-bottom:1px solid #ece8df")}>
              <div style={sx("display:flex;flex-direction:column;gap:4px")}>
                <span style={sx(FEAT_LABEL)}>Cost / t</span>
                <span style={sx("font:600 14px/1 'IBM Plex Sans',sans-serif")}>{p.cost}</span>
              </div>
              <div style={sx("display:flex;flex-direction:column;gap:4px")}>
                <span style={sx(FEAT_LABEL)}>Requirements</span>
                <span style={sx(`font:600 14px/1 'IBM Plex Sans',sans-serif;color:${p.metColor}`)}>{p.met}</span>
              </div>
              <div style={sx("display:flex;flex-direction:column;gap:4px")}>
                <span style={sx(FEAT_LABEL)}>Goal</span>
                <span style={sx("font:600 14px/1.2 'IBM Plex Sans',sans-serif")}>{p.goal}</span>
              </div>
            </div>
            <div style={sx("display:flex;align-items:center;gap:10px")}>
              <span style={sx("flex:none;width:30px;height:30px;border-radius:50%;background:#2f5a3f;color:#faf8f3;font:600 11px/30px 'IBM Plex Sans',sans-serif;text-align:center")}>{p.initials}</span>
              <span style={sx("flex:1;min-width:0;display:flex;flex-direction:column;gap:3px")}>
                <span style={sx("font:500 13px/1.2 'IBM Plex Sans',sans-serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{p.author}</span>
                <span style={sx("font:400 12px/1.2 'IBM Plex Sans',sans-serif;color:#64665c")}>{p.meta}</span>
              </span>
            </div>
            <button onClick={p.use} className={hv("outline")} style={sx("margin-top:auto;border:1px solid #2f5a3f;background:#fff;color:#2f5a3f;font:600 13px/1 'IBM Plex Sans',sans-serif;padding:11px 12px;border-radius:7px")}>Use as a starting point</button>
          </div>
        ))}
      </div>
      {v.featEmpty && <div style={sx("padding:18px;background:#fff;border:1px dashed #b9b6ab;border-radius:10px;font:400 14px/1.5 'IBM Plex Sans',sans-serif;color:#45473f")}>No featured formulations for this animal yet.</div>}
      <span style={sx("font:400 12px/1.5 'IBM Plex Sans',sans-serif;color:#64665c")}>Costs use FeedSport planning prices and are re-checked against the current programme and ingredient data each time you visit. Enter your own prices in the copy before mixing.</span>
    </div>
  );
}

// Ingredient step table: tick, name, price, limits (FeedSport Prototype (2)).
const ING_COLS = "display:grid;grid-template-columns:30px minmax(0,1fr) 150px 120px;gap:12px";

function Setup({ v }: V) {
  return (
    <div style={sx("flex:1;display:flex;flex-direction:column;animation:fsin .25s ease-out")}>
      <div style={sx("display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px clamp(16px,4vw,48px);border-bottom:1px solid #e2dfd6;background:#fff;flex-wrap:wrap")}>
        <div style={sx("display:flex;gap:18px;align-items:center;flex-wrap:wrap")}>
          {v.steps.map((st, i) => (
            <button key={i} onClick={st.go} style={sx(`border:0;background:transparent;display:flex;gap:8px;align-items:center;font:500 14px/1 'IBM Plex Sans',sans-serif;color:${st.color};padding:4px 0`)}>
              <span style={sx(`width:22px;height:22px;border-radius:50%;background:${st.bg};color:${st.fg};border:1px solid ${st.bd};font:500 12px/20px 'IBM Plex Mono',monospace;text-align:center`)}>{st.mark}</span>
              {st.label}
            </button>
          ))}
        </div>
        <button onClick={v.skipToWorkspace} style={sx("border:0;background:transparent;font:500 13px/1 'IBM Plex Sans',sans-serif;color:#64665c")}>Skip to workspace</button>
      </div>
      <div style={sx("flex:1;display:flex;flex-wrap:wrap")}>
        <div style={sx("flex:1 1 560px;min-width:0;padding:32px clamp(16px,4vw,48px);display:flex;flex-direction:column;gap:24px")}>
          {v.step1 && (
            <>
              <div style={sx("font:600 26px/1.2 'IBM Plex Sans',sans-serif;letter-spacing:-0.015em")}>What are you feeding?</div>
              <div style={sx("display:flex;gap:12px")}>
                {v.speciesOpts.map((o) => (
                  <button key={o.label} onClick={o.pick} style={sx(`padding:14px 22px;border-radius:8px;border:1px solid #d0cdc3;box-shadow:${o.ring};background:${o.bg};font:600 15px/1 'IBM Plex Sans',sans-serif;color:#222420`)}>{o.label}</button>
                ))}
              </div>
              <label htmlFor="fs-setup-programme" style={sx("font:500 13px/1 'IBM Plex Mono',monospace;color:#64665c;text-transform:uppercase;letter-spacing:0.05em")}>Programme</label>
              <select id="fs-setup-programme" value={v.setupProgrammeId} onChange={v.onSetupProgramme} style={sx("font:600 15px/1.3 'IBM Plex Sans',sans-serif;padding:8px 10px;border:1px solid #d0cdc3;border-radius:7px;background:#fff;color:#222420;max-width:520px")}>
                {v.setupProgrammes.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <div style={sx("font:500 13px/1 'IBM Plex Mono',monospace;color:#64665c;text-transform:uppercase;letter-spacing:0.05em")}>Stage</div>
              <div style={sx("display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px")}>
                {v.stageOpts.map((o, i) => (
                  <button key={i} onClick={o.pick} disabled={o.disabled} style={sx(`text-align:left;background:${o.bg};border:1px ${o.bs} ${o.bd};box-shadow:${o.ring};border-radius:8px;padding:16px;display:flex;flex-direction:column;gap:6px;color:#222420;cursor:${o.cursor}`)}>
                    <span style={sx("font:600 15px/1.2 'IBM Plex Sans',sans-serif")}>{o.label}</span>
                    <span style={sx("font:400 13px/1.3 'IBM Plex Sans',sans-serif;color:#64665c")}>{o.range}</span>
                  </button>
                ))}
              </div>
              <div style={sx("font:400 13px/1.5 'IBM Plex Sans',sans-serif;color:#64665c;max-width:620px")}>Stages are the phases of the chosen feeding programme, each with its own published requirements.</div>
            </>
          )}
          {v.step2 && (
            <>
              <div style={sx("display:flex;flex-direction:column;gap:8px")}>
                <div style={sx("font:600 26px/1.2 'IBM Plex Sans',sans-serif;letter-spacing:-0.015em")}>Which ingredients can you use?</div>
                <div style={sx("font:400 15px/1.5 'IBM Plex Sans',sans-serif;color:#45473f;max-width:640px")}>Tick what you have. FeedSport only uses ticked ingredients and never adds others on its own.</div>
              </div>
              <div style={sx("display:flex;flex-direction:column;gap:10px")}>
                <div style={sx("display:flex;align-self:flex-start;background:#f3f0e8;border-radius:8px;padding:3px;flex-wrap:wrap")}>
                  {v.setOpts.map((o) => (
                    <button key={o.label} onClick={o.pick} style={sx(`border:0;padding:10px 16px;border-radius:6px;background:${o.segBg};box-shadow:${o.segSh};font:${o.segW} 14px/1 'IBM Plex Sans',sans-serif;color:#222420`)}>{o.label}</button>
                  ))}
                </div>
                <div style={sx("display:flex;align-items:center;gap:12px;flex-wrap:wrap;font:400 13px/1.45 'IBM Plex Sans',sans-serif;color:#45473f")}>
                  <span>{v.setNote}</span>
                  {v.userSetPick && (
                    <>
                      <select value={v.userSetKey} onChange={v.onUserSet} aria-label="Saved list" style={sx("font:500 13px/1.2 'IBM Plex Sans',sans-serif;padding:6px 8px;border:1px solid #d0cdc3;border-radius:6px;background:#fff;color:#222420")}>
                        {v.userSetList.map((o) => (
                          <option key={o.id} value={o.id}>{o.label}</option>
                        ))}
                      </select>
                      <button onClick={v.manageLists} style={sx("border:0;background:transparent;padding:0;font:500 13px/1 'IBM Plex Sans',sans-serif;color:#2f5a3f")}>Manage lists</button>
                    </>
                  )}
                </div>
              </div>
              <div style={sx("background:#fff;border:1px solid #e2dfd6;border-radius:10px;overflow:hidden")}>
                <div style={sx("display:flex;gap:12px;align-items:center;padding:10px 14px;border-bottom:1px solid #e2dfd6;flex-wrap:wrap")}>
                  <div style={sx("flex:1 1 260px;display:flex;align-items:center;gap:8px;padding:0 10px;border:1px solid #d0cdc3;border-radius:7px")}>
                    <span style={sx("flex:none;width:11px;height:11px;border:1.5px solid #8d8a80;border-radius:50%")} />
                    <input value={v.ingQ} onChange={v.onIngQ} placeholder="Search your list, or find more in the catalogue" aria-label="Search ingredients" style={sx("flex:1;min-width:0;border:0;padding:9px 0;font:400 14px/1 'IBM Plex Sans',sans-serif;outline:none")} />
                  </div>
                  <span style={sx("font:500 13px/1 'IBM Plex Sans',sans-serif;color:#45473f")}>{v.tickCount}</span>
                </div>
                <div style={sx(`${ING_COLS};padding:8px 14px;font:500 11px/1 'IBM Plex Mono',monospace;color:#64665c;text-transform:uppercase;letter-spacing:0.04em;background:#faf8f3`)}>
                  <span />
                  <span>Ingredient</span>
                  <span>Your price / t</span>
                  <span>Limits</span>
                </div>
                {v.ingGroups.map((g) => (
                  <div key={g.cat}>
                    <div style={sx("padding:9px 14px 5px;font:500 11px/1 'IBM Plex Mono',monospace;color:#8a5f18;text-transform:uppercase;letter-spacing:0.05em;border-top:1px solid #ece8df")}>{g.cat}</div>
                    {g.rows.map((r) => (
                      <div key={r.id} className={hv("row")} style={sx(`${ING_COLS};padding:7px 14px;align-items:center;font:400 14px/1.2 'IBM Plex Sans',sans-serif;opacity:${r.opacity}`)}>
                        <button onClick={r.toggle} aria-label={r.cbLabel} aria-pressed={!!r.check} style={sx(`width:20px;height:20px;border-radius:5px;border:1.5px solid ${r.cbBd};background:${r.cbBg};color:#fff;font:600 12px/17px 'IBM Plex Sans',sans-serif;padding:0`)}>{r.check}</button>
                        <span style={sx("display:flex;flex-direction:column;gap:3px;min-width:0")}>
                          <span style={sx(`font-weight:500;text-decoration:${r.deco}`)}>{r.name}</span>
                          {r.hasNote && <span style={sx(`font-size:12px;color:${r.noteColor}`)}>{r.note}</span>}
                        </span>
                        <div style={sx("display:flex;align-items:center;gap:6px;padding:0 8px;border:1px solid #d0cdc3;border-radius:6px;background:#fff")}>
                          <span style={sx("color:#64665c;font-size:13px")}>$</span>
                          <input type="number" min="0" step="any" value={r.price} onChange={r.onPrice} placeholder={r.pricePh} aria-label={"Price per tonne for " + r.name} style={sx("width:100%;min-width:0;border:0;padding:7px 0;font:500 14px/1 'IBM Plex Sans',sans-serif;outline:none;background:transparent")} />
                          <span style={sx(`flex:none;font:500 9px/1 'IBM Plex Mono',monospace;color:${r.tagFg}`)}>{r.tag}</span>
                        </div>
                        <button onClick={r.open} style={sx("border:0;background:transparent;padding:4px 0;text-align:left;font:500 13px/1.2 'IBM Plex Sans',sans-serif;color:#2f5a3f;text-decoration:underline;text-decoration-color:#cfe0d2;text-underline-offset:3px")}>{r.limits}</button>
                      </div>
                    ))}
                  </div>
                ))}
                {v.ingNoMatch && <div style={sx("padding:12px 14px;border-top:1px solid #ece8df;font:400 13px/1.4 'IBM Plex Sans',sans-serif;color:#64665c")}>Nothing in your list matches.</div>}
                {v.hasCatMatches && (
                  <>
                    <div style={sx("padding:9px 14px 5px;font:500 11px/1 'IBM Plex Mono',monospace;color:#64665c;text-transform:uppercase;letter-spacing:0.05em;border-top:1px solid #e2dfd6;background:#faf8f3")}>Not in your list · from the catalogue</div>
                    {v.catMatches.map((a) => (
                      <div key={a.name} style={sx("display:grid;grid-template-columns:30px minmax(0,1fr) auto;gap:12px;padding:8px 14px;align-items:center;background:#faf8f3;font:400 14px/1.2 'IBM Plex Sans',sans-serif")}>
                        <span />
                        <span style={sx("display:flex;flex-direction:column;gap:3px")}>
                          <span style={sx("font-weight:500")}>{a.name}</span>
                          <span style={sx(`font-size:12px;color:${a.subColor}`)}>{a.sub}</span>
                        </span>
                        <button onClick={a.add} style={sx("border:1px solid #2f5a3f;background:#fff;color:#2f5a3f;font:600 13px/1 'IBM Plex Sans',sans-serif;padding:7px 10px;border-radius:6px")}>+ Add</button>
                      </div>
                    ))}
                  </>
                )}
              </div>
              <div style={sx(`display:flex;gap:10px;align-items:center;font:400 13px/1.4 'IBM Plex Sans',sans-serif;color:${v.dataLine.color}`)}>
                <span style={sx(`flex:none;width:8px;height:8px;border-radius:${v.dataLine.r};transform:rotate(${v.dataLine.rot});background:${v.dataLine.bg}`)} />
                {v.dataLine.text}
              </div>
            </>
          )}
          {v.step3 && (
            <>
              <div style={sx("font:600 26px/1.2 'IBM Plex Sans',sans-serif;letter-spacing:-0.015em")}>How much, and what matters most?</div>
              <div style={sx("display:flex;flex-direction:column;gap:10px")}>
                <span style={sx("font:500 13px/1 'IBM Plex Mono',monospace;color:#64665c;text-transform:uppercase;letter-spacing:0.05em")}>Batch size</span>
                <div style={sx("display:flex;gap:8px;flex-wrap:wrap;align-items:center")}>
                  {v.batchOpts.map((b) => (
                    <button key={b.label} onClick={b.pick} style={sx(`padding:12px 18px;border-radius:8px;border:1px solid #d0cdc3;box-shadow:${b.ring};background:${b.bg};font:600 14px/1 'IBM Plex Sans',sans-serif;color:#222420`)}>{b.label}</button>
                  ))}
                  {v.batchCustom && <input type="number" min="1" value={v.customBatch} onChange={v.onCustomBatch} placeholder="kg" style={sx("width:110px;padding:11px 12px;border:1px solid #d0cdc3;border-radius:8px;font:500 14px/1 'IBM Plex Sans',sans-serif")} />}
                </div>
              </div>
              <div style={sx("display:flex;flex-direction:column;gap:10px;max-width:640px")}>
                <span style={sx("font:500 13px/1 'IBM Plex Mono',monospace;color:#64665c;text-transform:uppercase;letter-spacing:0.05em")}>Goal</span>
                {v.goalOpts.map((g) => (
                  <button key={g.label} onClick={g.pick} style={sx(`text-align:left;display:flex;gap:12px;align-items:flex-start;padding:14px 16px;border-radius:8px;border:1px solid #d0cdc3;box-shadow:${g.ring};background:${g.bg};color:#222420`)}>
                    <span style={sx(`flex:none;margin-top:2px;width:16px;height:16px;border-radius:50%;border:${g.radio}`)} />
                    <span style={sx("display:flex;flex-direction:column;gap:4px")}>
                      <span style={sx("font:600 15px/1.2 'IBM Plex Sans',sans-serif")}>{g.label}</span>
                      <span style={sx("font:400 13px/1.45 'IBM Plex Sans',sans-serif;color:#45473f")}>{g.desc}</span>
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <div style={sx("flex:1 1 320px;max-width:100%;border-left:1px solid #e2dfd6;background:#fff;padding:28px;display:flex;flex-direction:column;gap:18px")}>
          <div style={sx("font:500 12px/1 'IBM Plex Mono',monospace;color:#64665c;text-transform:uppercase;letter-spacing:0.05em")}>Your formulation</div>
          <div style={sx("display:flex;flex-direction:column;gap:6px")}>
            <span style={sx("font:600 19px/1.25 'IBM Plex Sans',sans-serif")}>{v.prog.name}</span>
            <span style={sx("font:400 14px/1.4 'IBM Plex Sans',sans-serif;color:#64665c")}>
              Source: {v.prog.source} · {v.prog.nReq} requirements · {v.prog.nGuide} practical guidelines
            </span>
          </div>
          <div style={sx("display:flex;flex-direction:column;border-top:1px solid #ece8df")}>
            {[
              ["Ingredients", v.poolCount],
              ["Batch", v.batchLabel],
              ["Goal", v.goalLabel],
            ].map(([k, val]) => (
              <div key={k} style={sx("display:flex;justify-content:space-between;padding:11px 0;border-bottom:1px solid #ece8df;font:400 14px/1.3 'IBM Plex Sans',sans-serif")}>
                <span>{k}</span>
                <span style={sx("font-weight:500")}>{val}</span>
              </div>
            ))}
          </div>
          {v.step2 && (
            <div style={sx("display:flex;flex-direction:column;gap:10px;font:400 13px/1.55 'IBM Plex Sans',sans-serif;color:#45473f")}>
              <span>Only ticked ingredients can go into the recipe. Leave a price blank to use the FeedSport default.</span>
              <span>
                Use <b style={sx("font-weight:600")}>Limits</b> to set a minimum, a maximum, or a fixed amount.
              </span>
            </div>
          )}
          {v.step2 && v.completionPanel.show && (
            <div style={sx(`border:1px ${v.completionPanel.complete ? "solid #9fc2a7" : v.completionPanel.problem ? "solid #e9b9ad" : "dashed #b9b6ab"};background:${v.completionPanel.complete ? "#f4f8f4" : v.completionPanel.problem ? "#fff8f6" : "transparent"};border-radius:8px;padding:16px 18px;display:flex;flex-direction:column;gap:10px`)}>
              <div style={sx("display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap")}>
                <div style={sx("display:flex;align-items:center;gap:9px;font:600 14px/1.3 'IBM Plex Sans',sans-serif")}>
                  {v.completionPanel.loading && <span style={sx("width:14px;height:14px;border-radius:50%;border:2px solid #d0cdc3;border-top-color:#2f5a3f;animation:fsspin .8s linear infinite;flex:none")} />}
                  {v.completionPanel.complete && <span style={sx("width:16px;height:16px;border-radius:50%;background:#2f7a4a;color:#fff;font:600 11px/16px 'IBM Plex Sans',sans-serif;text-align:center;flex:none")}>✓</span>}
                  {v.completionPanel.title}
                </div>
                {v.completionPanel.canAddAll && <button onClick={v.completionPanel.addAll} className={hv("green")} style={sx("border:0;background:#2f5a3f;color:#fff;font:600 12px/1 'IBM Plex Sans',sans-serif;padding:8px 11px;border-radius:6px")}>{v.completionPanel.actionLabel}</button>}
              </div>
              <div style={sx("font:400 12px/1.5 'IBM Plex Sans',sans-serif;color:#64665c;max-width:680px")}>{v.completionPanel.body}</div>
              {v.completionPanel.hasItems && (
                <div style={sx("display:flex;flex-direction:column;gap:8px")}>
                  {v.completionPanel.itemsTitle && <div style={sx("font:500 11px/1 'IBM Plex Mono',monospace;color:#64665c;text-transform:uppercase;letter-spacing:0.05em")}>{v.completionPanel.itemsTitle}</div>}
                  <div style={sx("display:flex;gap:8px;flex-wrap:wrap")}>
                    {v.completionPanel.items.map((g) => (
                      <button key={g.name} onClick={g.add} className={hv("chip")} style={sx("font:500 13px/1.15 'IBM Plex Sans',sans-serif;padding:8px 12px;border-radius:99px;border:1px solid #d0cdc3;background:#fff;color:#222420;display:flex;gap:7px;align-items:center")}>
                        <span>{g.action} {g.name}</span>
                        <span style={sx("font:400 10px/1 'IBM Plex Mono',monospace;color:#64665c")}>{g.modelPct}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {(v.completionPanel.ready || v.completionPanel.complete) && <div style={sx("font:400 12px/1.4 'IBM Plex Sans',sans-serif;color:#64665c")}>Practical-inclusion guidance and missing nutrient data still apply. Suggestions are only added when you choose them and are rechecked after every change.</div>}
            </div>
          )}
          {v.step1 && <div style={sx("font:400 13px/1.55 'IBM Plex Sans',sans-serif;color:#45473f")}>Requirements load automatically. Nutritionists can review or override them later under Rules.</div>}
          <div style={sx("margin:auto -28px -28px;padding:16px 28px 28px;display:flex;gap:10px;position:sticky;bottom:0;z-index:5;background:#fff;border-top:1px solid #ece8df")}>
            {v.canBack && <button onClick={v.stepBack} style={sx("flex:1;border:1px solid #d0cdc3;background:#fff;font:500 15px/1 'IBM Plex Sans',sans-serif;padding:14px;border-radius:8px;color:#222420")}>Back</button>}
            <button onClick={v.stepNext} disabled={v.nextDisabled} style={sx(`flex:2;border:0;background:${v.nextBg};color:#fff;font:600 15px/1 'IBM Plex Sans',sans-serif;padding:14px;border-radius:8px`)}>{v.nextLabel}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const POOL_PREVIEW = 5;

function Workspace({ v }: V) {
  const [allPool, setAllPool] = useState(false);
  const poolShown = allPool ? v.poolRows : v.poolRows.slice(0, POOL_PREVIEW);
  const poolHidden = v.poolRows.length - POOL_PREVIEW;
  return (
    <div style={sx("flex:1;display:flex;flex-direction:column")}>
      <div style={sx("display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap;padding:16px clamp(16px,3vw,32px);background:#fff;border-bottom:1px solid #e2dfd6")}>
        <div style={sx("display:flex;flex-direction:column;gap:6px;min-width:0")}>
          <button onClick={v.goList} style={sx("align-self:flex-start;border:0;background:transparent;padding:0;font:400 14px/1 'IBM Plex Sans',sans-serif;color:#64665c")}>Formulations /</button>
          <div style={sx("display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;min-width:0")}>
            <input value={v.docName} onChange={v.onName} size={Math.max(8, v.docName.length)} aria-label="Formulation name" title="Rename formulation" style={sx("max-width:100%;border:0;border-bottom:1px dashed transparent;background:transparent;padding:0;font:600 24px/1.25 'IBM Plex Sans',sans-serif;color:#222420;letter-spacing:-0.01em")} />
            <span style={sx(`font:500 13px/1 'IBM Plex Mono',monospace;letter-spacing:0.03em;color:${v.saveState.color}`)}>{v.saveState.label}</span>
          </div>
        </div>
        <div style={sx("display:flex;gap:10px;flex-wrap:wrap")}>
          <button onClick={v.goList} style={sx("font:500 14px/1 'IBM Plex Sans',sans-serif;padding:11px 16px;border:1px solid #d0cdc3;border-radius:7px;background:#fff;color:#222420")}>Compare</button>
          <button onClick={v.doExport} disabled={v.exportDisabled} title={v.exportTitle} style={sx(`font:500 14px/1 'IBM Plex Sans',sans-serif;padding:11px 16px;border:1px solid #d0cdc3;border-radius:7px;background:#fff;color:${v.exportColor}`)}>{v.exportLabel}</button>
          <button onClick={v.save} disabled={v.saveDisabled} title={v.saveTitle} style={sx(`font:600 14px/1 'IBM Plex Sans',sans-serif;padding:11px 20px;border:0;background:${v.saveBg};color:#fff;border-radius:7px`)}>Save</button>
        </div>
      </div>
      <div style={sx("flex:1;display:flex;flex-wrap:wrap;align-items:stretch")}>
        <div style={sx(`flex:0 1 ${v.leftW};width:${v.leftW};border-right:1px solid #e2dfd6;background:#fff;display:flex;flex-direction:column`)}>
          <div style={sx("padding:18px 22px;border-bottom:1px solid #ece8df;display:flex;flex-direction:column;gap:8px")}>
            <span style={sx(MONO_LABEL)}>1 · Programme</span>
            <select value={v.programmeId} onChange={v.onProgramme} aria-label="Programme" style={sx("font:600 15px/1.3 'IBM Plex Sans',sans-serif;padding:8px 10px;border:1px solid #d0cdc3;border-radius:7px;background:#fff;color:#222420")}>
              {v.progList.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <select value={v.phaseId} onChange={v.onPhase} aria-label="Stage" style={sx("font:600 15px/1.3 'IBM Plex Sans',sans-serif;padding:8px 10px;border:1px solid #d0cdc3;border-radius:7px;background:#fff;color:#222420;font-weight:500;font-size:14px")}>
              {v.phaseList.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <span style={sx("font:400 13px/1.3 'IBM Plex Sans',sans-serif;color:#64665c")}>
              {v.prog.source} · {v.prog.nReq} requirements · {v.overrideText}
            </span>
          </div>
          <div style={sx("padding:18px 22px;border-bottom:1px solid #ece8df;display:flex;flex-direction:column;gap:4px")}>
            <div style={sx("display:flex;justify-content:space-between;align-items:center;padding-bottom:6px")}>
              <span style={sx(MONO_LABEL)}>2 · Ingredients · {v.poolCount}</span>
              <button onClick={v.openAdd} style={sx("border:0;background:transparent;font:600 13px/1 'IBM Plex Sans',sans-serif;color:#2f5a3f;padding:4px 0")}>+ Add</button>
            </div>
            {poolShown.map((c) => (
              <button key={c.name} onClick={c.open} className={hv("pool")} style={sx("border:0;background:transparent;display:flex;justify-content:space-between;align-items:center;gap:8px;padding:7px 8px;margin:0 -8px;border-radius:6px;font:400 14px/1.2 'IBM Plex Sans',sans-serif;color:#222420;text-align:left")}>
                <span style={sx(`text-decoration:${c.chip.deco};color:${c.nameColor}`)}>{c.name}</span>
                <span style={sx(`font:500 12px/1 'IBM Plex Sans',sans-serif;color:${c.roleColor}`)}>{c.short}</span>
              </button>
            ))}
            {poolHidden > 0 && (
              <button onClick={() => setAllPool(!allPool)} style={sx("align-self:flex-start;border:0;background:transparent;padding:8px 0 0;font:600 14px/1 'IBM Plex Sans',sans-serif;color:#2f5a3f")}>
                {allPool ? "Show fewer" : "Show all " + v.poolRows.length + " · " + poolHidden + " more available"}
              </button>
            )}
            {v.poolEmpty && <span style={sx("font:400 13px/1.4 'IBM Plex Sans',sans-serif;color:#64665c")}>No ingredients yet.</span>}
          </div>
          <div style={sx("padding:18px 22px;border-bottom:1px solid #ece8df;display:flex;flex-direction:column;gap:8px")}>
            <span style={sx(MONO_LABEL)}>3 · Goal</span>
            {v.goalOpts.map((g) => (
              <button key={g.label} onClick={g.pick} style={sx("border:0;background:transparent;text-align:left;display:flex;gap:10px;align-items:flex-start;padding:4px 0;color:#222420")}>
                <span style={sx(`flex:none;margin-top:2px;width:14px;height:14px;border-radius:50%;border:${g.radio}`)} />
                <span style={sx(`font:${g.weight} 14px/1.3 'IBM Plex Sans',sans-serif`)}>{g.label}</span>
              </button>
            ))}
            <span style={sx("font:400 12px/1.45 'IBM Plex Sans',sans-serif;color:#64665c")}>{v.goalDesc}</span>
          </div>
          <div style={sx("padding:18px 22px;border-bottom:1px solid #ece8df;display:flex;flex-direction:column;gap:8px")}>
            <div style={sx("display:flex;justify-content:space-between")}>
              <span style={sx(MONO_LABEL)}>4 · Rules</span>
              <button onClick={v.openRules} style={sx("border:0;background:transparent;font:600 13px/1 'IBM Plex Sans',sans-serif;color:#2f5a3f;padding:0")}>Review</button>
            </div>
            <span style={sx("font:400 13px/1.45 'IBM Plex Sans',sans-serif;color:#45473f")}>Programme requirements, FeedSport ingredient limits and {v.settingsCount} of your ingredient settings.</span>
          </div>
          <div style={sx("margin-top:auto;padding:18px 22px;display:flex;flex-direction:column;gap:10px;border-top:1px solid #e2dfd6;position:sticky;bottom:0;background:#fff")}>
            <div style={sx(`display:flex;align-items:center;gap:8px;font:500 13px/1.3 'IBM Plex Sans',sans-serif;color:${v.runState.color}`)}>
              <span style={sx(`width:8px;height:8px;border-radius:${v.runState.r};background:${v.runState.bg}`)} />
              {v.runState.label}
            </div>
            <button onClick={v.run} disabled={v.running} style={sx(`border:0;background:${v.runState.btnBg};color:${v.runState.btnFg};font:600 15px/1 'IBM Plex Sans',sans-serif;padding:14px;border-radius:8px`)}>{v.runState.btn}</button>
          </div>
        </div>

        <div style={sx("flex:1 1 600px;min-width:0;padding:24px clamp(16px,3vw,32px);display:flex;flex-direction:column;gap:20px;position:relative")}>
          {v.running && (
            <div style={sx("display:flex;align-items:center;gap:12px;padding:14px 18px;background:#222420;color:#faf8f3;border-radius:10px;font:400 14px/1.3 'IBM Plex Sans',sans-serif;animation:fsin .2s ease-out")}>
              {v.spinner}
              <span style={sx("font-weight:600")}>Formulating…</span>
              <span style={sx("color:#b9b6ab")}>{v.runningText}</span>
            </div>
          )}
          {v.isStale && (
            <div style={sx("background:#fff;border:1px solid #222420;border-radius:10px;padding:16px 18px;display:flex;flex-direction:column;gap:10px")}>
              <div style={sx("display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap")}>
                <span style={sx("font:600 15px/1.3 'IBM Plex Sans',sans-serif")}>{v.staleTitle}</span>
                <div style={sx("display:flex;gap:8px")}>
                  <button onClick={v.undoChanges} style={sx("border:0;background:transparent;font:500 13px/1 'IBM Plex Sans',sans-serif;padding:10px 12px;color:#45473f")}>Undo changes</button>
                  <button onClick={v.run} style={sx("border:0;font:600 13px/1 'IBM Plex Sans',sans-serif;padding:10px 14px;background:#2f5a3f;color:#fff;border-radius:7px")}>Re-formulate</button>
                </div>
              </div>
              <div style={sx("display:flex;flex-direction:column;gap:4px;font:400 14px/1.4 'IBM Plex Sans',sans-serif;color:#45473f")}>
                {v.changes.map((ch, i) => (
                  <span key={i}>· {ch}</span>
                ))}
              </div>
              <span style={sx("font:400 12px/1.4 'IBM Plex Sans',sans-serif;color:#64665c")}>The result below is from the previous run. Save and Export are off until you re-formulate.</span>
            </div>
          )}

          {v.hasRecoveryUndo && (
            <div style={sx("display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 16px;background:#eef3ee;border:1px solid #c5d8c8;border-radius:10px;font:400 13px/1.4 'IBM Plex Sans',sans-serif;color:#1f3e2b;flex-wrap:wrap")}>
              <span>{v.recoveryUndoText}</span>
              <button onClick={v.undoRecovery} style={sx("border:1px solid #2f5a3f;background:#fff;color:#2f5a3f;font:600 13px/1 'IBM Plex Sans',sans-serif;padding:9px 12px;border-radius:6px")}>Undo</button>
            </div>
          )}

          {v.hasAdvice && !v.pendingDoc && !v.opt && !v.inf && (
            <button type="button" onClick={v.openAdvisories} style={sx("display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:12px 16px;background:#eef3ee;border:1px solid #c5d8c8;border-radius:10px;font:600 14px/1.3 'IBM Plex Sans',sans-serif;color:#2f5a3f;cursor:pointer")}>
              <span style={sx("flex:none;width:8px;height:8px;border-radius:50%;background:#2f5a3f")} />
              <span style={sx("flex:1")}>{v.advisoriesLabel}</span>
              <span style={sx("font-weight:500;text-decoration:underline;text-underline-offset:3px")}>View</span>
            </button>
          )}

          {v.pendingDoc && (
            <div style={sx("display:flex;align-items:center;gap:10px;padding:20px;font:400 14px/1.3 'IBM Plex Sans',sans-serif;color:#64665c")}>
              {v.spinnerDark}Opening your formulation…
            </div>
          )}
          {v.view.none && !v.pendingDoc && (
            <div style={sx("display:flex;justify-content:center;padding:40px 0")}>
              <div style={sx("width:100%;max-width:460px;display:flex;flex-direction:column;gap:16px")}>
                <span style={sx("font:600 22px/1.25 'IBM Plex Sans',sans-serif")}>{v.emptyTitle}</span>
                <div style={sx("display:flex;flex-direction:column;background:#fff;border:1px solid #e2dfd6;border-radius:10px")}>
                  {v.checklist.map((k, i) => (
                    <div key={i} style={sx("display:flex;gap:12px;align-items:center;padding:14px 16px;border-bottom:1px solid #ece8df")}>
                      <span style={sx(`flex:none;width:20px;height:20px;border-radius:50%;background:${k.bg};border:1.5px solid ${k.bd};color:#2f5a3f;font:600 11px/17px 'IBM Plex Sans',sans-serif;text-align:center`)}>{k.mark}</span>
                      <span style={sx("font:400 14px/1.3 'IBM Plex Sans',sans-serif;flex:1")}>{k.text}</span>
                    </div>
                  ))}
                </div>
                <span style={sx("font:400 13px/1.5 'IBM Plex Sans',sans-serif;color:#64665c")}>Press Formulate when the list is complete. You can change anything afterwards without starting over.</span>
              </div>
            </div>
          )}

          {v.view.blocked && (
            <div style={sx("display:flex;flex-direction:column;gap:12px")}>
              <div style={sx("font:500 12px/1 'IBM Plex Mono',monospace;color:#a63d2a;text-transform:uppercase;letter-spacing:0.05em")}>Must fix before formulating</div>
              {v.blockErrs.map((e, i) => (
                <div key={i} style={sx("background:#fff;border:1px solid #e9b9ad;border-radius:10px;padding:16px 18px;display:flex;flex-direction:column;gap:8px")}>
                  <span style={sx("display:flex;align-items:center;gap:8px;font:600 15px/1.3 'IBM Plex Sans',sans-serif;color:#7a2a1c")}>
                    <span style={sx("flex:none;width:9px;height:9px;background:#b2412e")} />
                    {e.title}
                  </span>
                  <span style={sx("font:400 14px/1.5 'IBM Plex Sans',sans-serif;color:#45473f")}>{e.body}</span>
                  {e.hasEdit && <button onClick={e.edit} style={sx("align-self:flex-start;border:0;background:transparent;padding:0;font:600 13px/1 'IBM Plex Sans',sans-serif;color:#2f5a3f")}>{e.editLabel}</button>}
                </div>
              ))}
            </div>
          )}

          {v.manufacturerResult && (
            <section role="status" aria-live="polite" style={sx("background:#fff;border:1px solid #e2dfd6;border-radius:10px;padding:20px;display:flex;flex-direction:column;gap:14px")}>
              <div style={sx("display:flex;align-items:flex-start;gap:12px;padding:14px;background:#fdf6e8;border:1px solid #f0c97f;border-radius:8px")}>
                <span aria-hidden style={sx("flex:none;width:26px;height:26px;border:2px solid #5c4012;border-radius:50%;font:600 14px/22px 'IBM Plex Sans',sans-serif;text-align:center;color:#5c4012")}>?</span>
                <span style={sx("display:flex;flex-direction:column;gap:5px")}>
                  <strong style={sx("font:600 19px/1.25 'IBM Plex Sans',sans-serif;color:#5c4012")}>{v.manufacturerResult.verdict}</strong>
                  <span style={sx("font:400 14px/1.5 'IBM Plex Sans',sans-serif;color:#45473f")}>{v.manufacturerResult.summary}</span>
                  <span style={sx("font:600 13px/1.45 'IBM Plex Sans',sans-serif;color:#5c4012")}>Next step: {v.manufacturerResult.guidance}</span>
                </span>
              </div>
              <h2 style={sx("font:600 21px/1.3 'IBM Plex Sans',sans-serif;color:#222420;margin:0")}>
                Manufacturer's fixed mixing recipe
              </h2>
              <p style={sx("font:400 14px/1.5 'IBM Plex Sans',sans-serif;color:#45473f;margin:0")}>
                These are the supplier's prescribed proportions, not a FeedSport least-cost optimisation. Do not change the formulation without manufacturer approval.
              </p>
              <div style={sx("border:1px solid #ece8df;border-radius:6px;overflow:hidden")}>
                {v.manufacturerResult.recipe.map((row: { id: string; name: string; pct: number }) => (
                  <div key={row.id} style={sx("display:flex;justify-content:space-between;gap:16px;padding:11px 14px;border-bottom:1px solid #ece8df;font:400 14px/1.4 'IBM Plex Sans',sans-serif")}>
                    <span>{row.name}</span><strong>{row.pct}%</strong>
                  </div>
                ))}
              </div>
              <strong style={sx("font:600 15px/1.4 'IBM Plex Sans',sans-serif")}>{v.manufacturerResult.costText}</strong>
              <p style={sx("font:400 13px/1.5 'IBM Plex Sans',sans-serif;color:#8a5f18;margin:0")}>
                {v.manufacturerResult.message}
              </p>
            </section>
          )}
          {v.inf && <Infeasible v={v} inf={v.inf} />}
          {v.opt && <Optimal v={v} opt={v.opt} />}

          {v.hasWarns && (
            <div style={sx("display:flex;flex-direction:column;gap:8px")}>
              {v.warns.map((w, i) => (
                <div key={i} style={sx(`display:flex;gap:10px;align-items:flex-start;padding:12px 14px;background:${w.bg};border:1px solid ${w.bd};border-radius:8px`)}>
                  <span style={sx(`flex:none;margin-top:5px;width:8px;height:8px;background:${w.dot};border-radius:${w.r};transform:rotate(${w.rot})`)} />
                  <div style={sx("flex:1;display:flex;flex-direction:column;gap:3px")}>
                    <span style={sx(`font:600 13px/1.35 'IBM Plex Sans',sans-serif;color:${w.fg}`)}>{w.title}</span>
                    <span style={sx("font:400 13px/1.45 'IBM Plex Sans',sans-serif;color:#45473f")}>{w.body}</span>
                  </div>
                  {w.hasEdit && <button onClick={w.edit} style={sx("flex:none;border:0;background:transparent;font:600 13px/1 'IBM Plex Sans',sans-serif;color:#2f5a3f;padding:4px 0")}>Edit</button>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Infeasible({ v, inf }: V & { inf: NonNullable<StudioVals["inf"]> }) {
  const [hidden, setHidden] = useState(false);
  const [why, setWhy] = useState<string | null>(null);
  const link = "border:0;background:transparent;padding:0;font:500 13px/1.3 'IBM Plex Sans',sans-serif;color:#222420;text-decoration:underline;text-underline-offset:3px;cursor:pointer";
  return (
    <div style={sx(`display:flex;flex-direction:column;gap:12px;opacity:${v.dimOpacity};transition:opacity .2s`)}>
      <section role="status" aria-live="polite" aria-label={inf.headline + ": " + inf.counts} style={sx("background:#fff;border:1px solid #e2dfd6;border-radius:10px;overflow:hidden;color:#222420")}>
        <div style={sx("display:flex;align-items:center;gap:8px 18px;padding:13px 18px;flex-wrap:wrap")}>
          <span style={sx("flex:1 1 320px;min-width:0;display:flex;align-items:center;gap:10px;flex-wrap:wrap")}>
            <StatusGlyph shape="square" color="#a63d2a" size={11} />
            <h2 style={sx("font:600 16px/1.3 'IBM Plex Sans',sans-serif;margin:0")}>{inf.headline}</h2>
            <span style={sx("font:400 14px/1.3 'IBM Plex Sans',sans-serif;color:#45473f")}>{inf.counts}</span>
          </span>
          <span style={sx("display:flex;align-items:center;gap:12px;font:400 13px/1.3 'IBM Plex Sans',sans-serif;color:#45473f;flex-wrap:wrap")}>
            {inf.othersMet && (
              <span title={inf.othersTitle} style={sx("display:flex;align-items:center;gap:7px;color:#2b6a42")}>
                <StatusGlyph shape="dot" color="#2f7a4a" size={7} />
                {inf.othersMet}
              </span>
            )}
            {inf.hasAdvice && (
              <>
                <span style={sx("width:1px;height:14px;background:#d0cdc3")} />
                <button type="button" onClick={v.openAdvisories} aria-label={`Open ${inf.adviceLabel}`} style={sx("display:flex;align-items:center;gap:7px;color:#8a5f18;border:0;background:transparent;padding:0;font:500 13px/1.3 'IBM Plex Sans',sans-serif;text-decoration:underline;text-decoration-color:#d7ad62;text-underline-offset:3px;cursor:pointer")}>
                  <span style={sx("width:7px;height:7px;background:#c98a1e;transform:rotate(45deg)")} />
                  {inf.adviceLabel}
                </button>
              </>
            )}
            <span style={sx("width:1px;height:14px;background:#d0cdc3")} />
            <button type="button" onClick={() => setHidden(!hidden)} aria-expanded={!hidden} style={sx("border:0;background:transparent;padding:0;font:500 13px/1.3 'IBM Plex Sans',sans-serif;color:#45473f;display:flex;align-items:center;gap:6px")}>
              {hidden ? "Show" : "Hide"}
              <span aria-hidden style={sx(`font-size:8px;display:inline-block;transform:rotate(${hidden ? "180deg" : "0deg"})`)}>▲</span>
            </button>
          </span>
        </div>
        {!hidden && (
          <>
            <div role="table" aria-label="Requirements these ingredients can't meet">
              {inf.rows.map((row) => (
                <div key={row.key} role="row" style={sx("border-top:1px solid #ece8df")}>
                  <div className={VERIFY_COLS} style={sx("padding:10px 18px;align-items:center;font:400 13px/1.4 'IBM Plex Sans',sans-serif")}>
                    <span role="cell" style={sx("display:flex;align-items:center;gap:8px;color:#a63d2a;font-weight:600")}>
                      <StatusGlyph shape="square" color="#b2412e" />
                      Can&apos;t meet
                    </span>
                    <span role="cell" style={sx("font:600 14px/1.3 'IBM Plex Sans',sans-serif")}>{row.name}</span>
                    <span role="cell" style={sx("display:flex;align-items:center;flex-wrap:wrap;gap:4px 10px;color:#45473f;min-width:0")}>
                      <span>best <b style={sx("font-weight:600;color:#222420;font-size:14px")}>{row.best}</b> / {row.req}</span>
                      <span style={sx("position:relative;flex:0 0 44px;height:5px;background:#f3f0e8;border-radius:3px")}>
                        <span style={sx(`position:absolute;left:0;top:0;bottom:0;width:${row.w};background:#e7b3a6;border-radius:3px`)} />
                        <span style={sx(`position:absolute;left:${row.m};top:-4px;width:2px;height:13px;background:#222420`)} />
                      </span>
                    </span>
                    <span role="cell" style={sx("display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0")}>
                      {row.chips.length > 0 && (
                        <span role="list" aria-label={`Ingredients that fix ${row.name}`} style={sx("display:contents")}>
                          {row.chips.map((chip) => <RescueChip key={chip.key} chip={chip} />)}
                        </span>
                      )}
                      {row.note && <span style={sx("font-size:12px;color:#64665c")}>{row.note}</span>}
                    </span>
                    <span role="cell" style={sx("text-align:right")}>
                      <button type="button" onClick={() => setWhy(why === row.key ? null : row.key)} aria-expanded={why === row.key} style={sx(link)}>Why?</button>
                    </span>
                  </div>
                  {why === row.key && (
                    <div style={sx("margin:0 18px 10px;padding:9px 12px;background:#faf8f3;border:1px solid #ece8df;border-radius:7px;font:400 13px/1.5 'IBM Plex Sans',sans-serif;color:#45473f")}>{row.why}</div>
                  )}
                </div>
              ))}
              {!inf.rows.length && (
                <div style={sx("padding:12px 18px;border-top:1px solid #ece8df;font:400 13px/1.5 'IBM Plex Sans',sans-serif;color:#45473f")}>{inf.body}</div>
              )}
              {inf.possible.map((p, i) => (
                <div key={i} style={sx("padding:10px 18px;border-top:1px solid #ece8df;font:400 13px/1.5 'IBM Plex Sans',sans-serif;color:#45473f")}><b style={sx("font-weight:600")}>Possibly contributing:</b> {p}</div>
              ))}
              {inf.notes.map((note, i) => (
                <div key={i} role="row" className={VERIFY_COLS} style={sx("padding:10px 18px;border-top:1px solid #ece8df;align-items:center;font:400 13px/1.45 'IBM Plex Sans',sans-serif")}>
                  <span role="cell" style={sx(`display:flex;align-items:center;gap:8px;color:${note.color};font-weight:600`)}>
                    <span aria-hidden style={sx(`flex:none;width:7px;height:7px;background:${note.dot};transform:rotate(45deg)`)} />
                    {note.label}
                  </span>
                  <span role="cell" title={note.title} style={sx("grid-column:span 3;color:#45473f;min-width:0")}>
                    <b style={sx("font-weight:600;color:#222420")}>{note.subject}</b>{" "}
                    {note.body}
                    {note.url && (
                      <>
                        {" "}
                        <a href={note.url} target="_blank" rel="noopener" style={sx("color:#222420;text-underline-offset:3px")}>Supplier page ↗</a>
                      </>
                    )}
                  </span>
                  <span role="cell" style={sx("text-align:right")}>
                    {note.hasEdit && <button type="button" onClick={note.edit} style={sx(link)}>Edit</button>}
                  </span>
                </div>
              ))}
            </div>
            <div style={sx("display:flex;justify-content:space-between;align-items:center;gap:10px 18px;padding:10px 18px;border-top:1px solid #e2dfd6;background:#faf8f3;font:400 12px/1.45 'IBM Plex Sans',sans-serif;color:#64665c;flex-wrap:wrap")}>
              <span>{inf.footnote}</span>
              <span style={sx("display:flex;align-items:center;gap:18px;flex-wrap:wrap")}>
                {!inf.primary && <button type="button" onClick={inf.browseIngredients} style={sx(link)}>Browse ingredients</button>}
                <button type="button" onClick={inf.askNutritionist} style={sx(link)}>Ask a nutritionist</button>
                {inf.primary && (
                  <button type="button" onClick={inf.primary.go} style={sx("border:0;border-radius:6px;padding:9px 13px;background:#2f5a3f;color:#fff;font:600 13px/1 'IBM Plex Sans',sans-serif")}>{inf.primary.label}</button>
                )}
              </span>
            </div>
          </>
        )}
      </section>
      <div aria-hidden style={sx("display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px")}>
        {inf.figures.map((label) => (
          <div key={label} style={sx("border:1px dashed #d0cdc3;border-radius:10px;padding:15px 18px;display:flex;flex-direction:column;gap:8px")}>
            <span style={sx("font:400 13px/1 'IBM Plex Sans',sans-serif;color:#64665c")}>{label}</span>
            <span style={sx("font:600 26px/1 'IBM Plex Sans',sans-serif;color:#b9b6ab")}>—</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const RECIPE_COLS = "display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1.6fr) 0.6fr 0.9fr;gap:12px";

function StatusGlyph({ shape, color, size = 9 }: { shape: string; color: string; size?: number }) {
  const base = `flex:none;display:inline-block;width:${size}px;height:${size}px;background:${color}`;
  return <span aria-hidden style={sx(shape === "triangle" ? `${base};width:${size + 2}px;clip-path:polygon(50% 0,100% 100%,0 100%)` : shape === "dot" ? `${base};border-radius:50%` : base)} />;
}

type VerificationVals = NonNullable<NonNullable<StudioVals["opt"]>["verification"]>;

const VERIFY_COLS = "fs-verify-row";

type ChipVals = { key: string; primary: boolean; label: string; fixes: string; delta: string; title: string; go: () => void };

const CHIP = "display:inline-flex;align-items:center;gap:6px;max-width:100%;min-width:0;padding:5px 10px;border-radius:99px;font:600 12.5px/1.2 'IBM Plex Sans',sans-serif;text-align:left;white-space:nowrap";

/** An ingredient that rescued the recipe in a background re-formulation; green is the cheapest. */
function RescueChip({ chip }: { chip: ChipVals }) {
  const meta = [chip.fixes, chip.delta].filter(Boolean).join(" · ");
  return (
    <button type="button" role="listitem" onClick={chip.go} title={chip.label + (meta ? " · " + meta : "") + "\n" + chip.title} aria-label={`Add ${chip.label}${meta ? ", " + meta : ""}. ${chip.title}`} className={hv("chip")} style={sx(`${CHIP};border:1px solid ${chip.primary ? "#2f5a3f" : "#d0cdc3"};background:${chip.primary ? "#eef3ee" : "#fff"};color:#222420`)}>
      <span aria-hidden style={sx("flex:none;font-weight:700")}>+</span>
      <span style={sx("min-width:0;max-width:26ch;overflow:hidden;text-overflow:ellipsis")}>{chip.label}</span>
      {meta && <span style={sx("flex:none;font-weight:400;color:#64665c")}>{meta}</span>}
    </button>
  );
}

function VerificationCard({ v, card, strip }: V & { card: VerificationVals; strip: NonNullable<StudioVals["opt"]>["strip"] }) {
  const [hidden, setHidden] = useState(false);
  const [why, setWhy] = useState<string | null>(null);
  const link = "border:0;background:transparent;padding:0;font:500 13px/1.3 'IBM Plex Sans',sans-serif;color:#222420;text-decoration:underline;text-underline-offset:3px;cursor:pointer";
  return (
    <section role="status" aria-live="polite" aria-label={card.headline + ": " + card.counts} style={sx("background:#fff;border:1px solid #e2dfd6;border-radius:10px;overflow:hidden;color:#222420")}>
      <div style={sx("display:flex;align-items:center;gap:8px 18px;padding:13px 18px;flex-wrap:wrap")}>
        <span style={sx("flex:1 1 320px;min-width:0;display:flex;align-items:center;gap:10px;flex-wrap:wrap")}>
          <StatusGlyph shape={card.mark.shape} color={card.mark.color} size={11} />
          <h2 style={sx("font:600 16px/1.3 'IBM Plex Sans',sans-serif;margin:0")}>{card.headline}</h2>
          <span style={sx("font:400 14px/1.3 'IBM Plex Sans',sans-serif;color:#45473f")}>{card.counts}</span>
        </span>
        <span style={sx("display:flex;align-items:center;gap:12px;font:400 13px/1.3 'IBM Plex Sans',sans-serif;color:#45473f;flex-wrap:wrap")}>
          {card.othersVerified && (
            <span title={card.verified ? "Verified: " + card.verified : undefined} style={sx("display:flex;align-items:center;gap:7px;color:#2b6a42")}>
              <StatusGlyph shape="dot" color="#2f7a4a" size={7} />
              {card.othersVerified}
            </span>
          )}
          {strip.hasAdv && (
            <>
              <span style={sx("width:1px;height:14px;background:#d0cdc3")} />
              <button type="button" onClick={v.openAdvisories} aria-label={`Open ${strip.adv}`} style={sx("display:flex;align-items:center;gap:7px;color:#8a5f18;border:0;background:transparent;padding:0;font:500 13px/1.3 'IBM Plex Sans',sans-serif;text-decoration:underline;text-decoration-color:#d7ad62;text-underline-offset:3px;cursor:pointer")}>
                <span style={sx("width:7px;height:7px;background:#c98a1e;transform:rotate(45deg)")} />
                {strip.adv}
              </button>
            </>
          )}
          <span style={sx("width:1px;height:14px;background:#d0cdc3")} />
          <button type="button" onClick={() => setHidden(!hidden)} aria-expanded={!hidden} title={card.meta} style={sx("border:0;background:transparent;padding:0;font:500 13px/1.3 'IBM Plex Sans',sans-serif;color:#45473f;display:flex;align-items:center;gap:6px")}>
            {hidden ? "Show" : "Hide"}
            <span aria-hidden style={sx(`font-size:8px;display:inline-block;transform:rotate(${hidden ? "180deg" : "0deg"})`)}>▲</span>
          </button>
        </span>
      </div>
      {!hidden && (
        <>
          <div role="table" aria-label="Unresolved nutrients">
            {card.rows.map((row) => (
              <div key={row.key} role="row" style={sx("border-top:1px solid #ece8df")}>
                <div className={VERIFY_COLS} style={sx("padding:10px 18px;align-items:center;font:400 13px/1.4 'IBM Plex Sans',sans-serif")}>
                  <span role="cell" style={sx(`display:flex;align-items:center;gap:8px;color:${row.status.color};font-weight:600`)}>
                    <StatusGlyph shape={row.status.shape} color={row.status.bg} />
                    {row.status.label}
                  </span>
                  <span role="cell" title={row.sub} style={sx("font:600 14px/1.3 'IBM Plex Sans',sans-serif")}>{row.name}</span>
                  <span role="cell" style={sx("display:flex;align-items:center;flex-wrap:wrap;gap:4px 10px;color:#45473f;min-width:0")}>
                    {row.known ? (
                      <>
                        <span><b style={sx("font-weight:600;color:#222420;font-size:14px")}>{row.actual}</b> / {row.limitShort}</span>
                        <span title={row.bar.delta} style={sx("position:relative;flex:0 0 60px;height:5px;background:#f3f0e8;border-radius:3px")}>
                          <span style={sx(`position:absolute;left:0;top:0;bottom:0;width:${row.bar.fill};background:#e7b3a6;border-radius:3px`)} />
                          <span style={sx(`position:absolute;left:${row.bar.marker};top:-4px;width:2px;height:13px;background:#222420`)} />
                        </span>
                      </>
                    ) : <span>{row.missingTxt}</span>}
                  </span>
                  <span role="cell" style={sx("display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0")}>
                    {row.chips.length > 0 && (
                      <span role="list" aria-label={`Ingredients that fix ${row.name}`} style={sx("display:contents")}>
                        {row.chips.map((chip) => <RescueChip key={chip.key} chip={chip} />)}
                      </span>
                    )}
                    {row.fixLink && <button type="button" onClick={row.fixLink.go} className={hv("chip")} style={sx(`${CHIP};font-weight:500;border:1px dashed #b9b6ab;background:#fff;color:#45473f`)}>{row.fixLink.label}</button>}
                    {row.fixNote && <span style={sx("font-size:12px;color:#64665c")}>{row.fixNote}</span>}
                  </span>
                  <span role="cell" style={sx("text-align:right")}>
                    <button type="button" onClick={() => setWhy(why === row.key ? null : row.key)} aria-expanded={why === row.key} style={sx(link)}>Why?</button>
                  </span>
                </div>
                {why === row.key && (
                  <div style={sx("margin:0 18px 10px;padding:9px 12px;background:#faf8f3;border:1px solid #ece8df;border-radius:7px;font:400 13px/1.5 'IBM Plex Sans',sans-serif;color:#45473f")}>
                    {row.why.pre}
                    {row.why.strong && <b style={sx("font-weight:600;color:#222420")}>{row.why.strong}</b>}
                    {row.why.post}
                    {row.known && row.bar.delta && <span style={sx("color:#a63d2a")}> ({row.bar.delta}.)</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={sx("display:flex;justify-content:space-between;align-items:center;gap:10px 18px;padding:10px 18px;border-top:1px solid #e2dfd6;background:#faf8f3;font:400 12px/1.45 'IBM Plex Sans',sans-serif;color:#64665c;flex-wrap:wrap")}>
            <span>{card.checking ? "Re-formulating with ingredients that might fix this…" : "Tap a chip to add it and re-formulate · green = cheapest confirmed fix · catalogue prices"}</span>
            <span style={sx("display:flex;align-items:center;gap:18px;flex-wrap:wrap")}>
              <button type="button" onClick={card.askNutritionist} style={sx(link)}>Ask a nutritionist</button>
              {card.applyGreen && (
                <button type="button" onClick={card.applyGreen.go} title={card.applyGreen.title} style={sx("border:0;border-radius:6px;padding:9px 13px;background:#2f5a3f;color:#fff;font:600 13px/1 'IBM Plex Sans',sans-serif")}>{card.applyGreen.label}</button>
              )}
            </span>
          </div>
        </>
      )}
    </section>
  );
}

function Optimal({ v, opt }: V & { opt: NonNullable<StudioVals["opt"]> }) {
  const { strip } = opt;
  return (
    <div style={sx(`display:flex;flex-direction:column;gap:20px;opacity:${v.dimOpacity};transition:opacity .2s`)}>
      {opt.verification ? (
        <VerificationCard v={v} card={opt.verification} strip={strip} />
      ) : (
        <>
          <section role="status" aria-live="polite" className={`fs-assessment-card${opt.verdict.rescueEmptyMessage ? " fs-has-explanation" : ""}`} style={sx(`display:grid;grid-template-columns:auto minmax(0,1fr);gap:14px 16px;padding:20px;background:${opt.verdict.bg};border:1px solid ${opt.verdict.border};border-radius:10px;color:${opt.verdict.color}`)}>
            <span aria-hidden style={sx(`grid-row:1 / 4;display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;border:2px solid ${opt.verdict.color};font:600 15px/1 'IBM Plex Sans',sans-serif`)}>{opt.verdict.mark}</span>
            <span style={sx("grid-column:2;font:500 11px/1 'IBM Plex Mono',monospace;text-transform:uppercase;letter-spacing:0.06em")}>{opt.verdict.eyebrow}</span>
            <h2 style={sx("grid-column:2;font:600 22px/1.2 'IBM Plex Sans',sans-serif;margin:0")}>{opt.verdict.title}</h2>
            <div style={sx("grid-column:2;display:flex;flex-direction:column;gap:7px;font:400 14px/1.5 'IBM Plex Sans',sans-serif;color:#45473f;max-width:900px")}>
              <span>{opt.verdict.summary}</span>
              <span style={sx(`font-weight:600;color:${opt.verdict.color}`)}>Next step: {opt.verdict.guidance}</span>
              {opt.verdict.rescueSuggestions.length > 0 && (
                <div style={sx("display:flex;flex-direction:column;align-items:flex-start;gap:8px;margin-top:5px")}>
                  <span style={sx("font:500 11px/1 'IBM Plex Mono',monospace;color:#64665c;text-transform:uppercase;letter-spacing:0.05em")}>Ingredients that may help</span>
                  <span role="list" aria-label="Ingredients that may help resolve the assessment" style={sx("display:flex;gap:8px;flex-wrap:wrap")}>
                    {opt.verdict.rescueSuggestions.map((suggestion) => (
                      <button key={suggestion.id} type="button" role="listitem" onClick={suggestion.add} title={suggestion.reason} aria-label={`Add ${suggestion.name}. ${suggestion.reason}`} className={hv("chip")} style={sx("font:500 13px/1.15 'IBM Plex Sans',sans-serif;padding:8px 12px;border-radius:99px;border:1px solid #d0cdc3;background:#fff;color:#222420;display:flex;gap:7px;align-items:center")}>
                        <span>+ {suggestion.name}</span>
                        <span style={sx("font:400 10px/1 'IBM Plex Mono',monospace;color:#64665c")}>{suggestion.category}</span>
                      </button>
                    ))}
                  </span>
                </div>
              )}
            </div>
            {opt.verdict.rescueEmptyMessage && (
              <aside className="fs-assessment-explanation" style={sx("grid-column:2;display:flex;flex-direction:column;gap:6px;padding:13px 15px;background:#fff;border:1px solid #e2c6bd;border-radius:8px;align-self:start")}>
                <span style={sx("font:500 11px/1 'IBM Plex Mono',monospace;color:#7a2a1c;text-transform:uppercase;letter-spacing:0.05em")}>No eligible catalogue match</span>
                <span style={sx("font:400 12px/1.5 'IBM Plex Sans',sans-serif;color:#45473f")}>{opt.verdict.rescueEmptyMessage}</span>
              </aside>
            )}
          </section>
          <div style={sx("display:flex;align-items:center;gap:14px;padding:13px 18px;background:#fff;border:1px solid #e2dfd6;border-radius:10px;font:400 14px/1.3 'IBM Plex Sans',sans-serif;flex-wrap:wrap")}>
            <span style={sx(`display:flex;align-items:center;gap:8px;font-weight:600;color:${strip.color}`)}>
              <span style={sx(`width:9px;height:9px;border-radius:${strip.r};background:${strip.bg}`)} />
              {strip.label}
            </span>
            {strip.hasAdv && (
              <>
                <span style={sx("width:1px;height:16px;background:#d0cdc3")} />
                <button type="button" onClick={v.openAdvisories} aria-label={`Open ${strip.adv}`} style={sx("display:flex;align-items:center;gap:8px;color:#8a5f18;border:0;background:transparent;padding:2px 0;font:600 14px/1.3 'IBM Plex Sans',sans-serif;text-decoration:underline;text-decoration-color:#d7ad62;text-underline-offset:3px;cursor:pointer")}>
                  <span style={sx("width:8px;height:8px;background:#c98a1e;transform:rotate(45deg)")} />
                  {strip.adv}
                </button>
              </>
            )}
            <span style={sx("margin-left:auto;color:#64665c")}>{strip.goal}</span>
            {v.showSolver && <span style={sx("font:400 12px/1 'IBM Plex Mono',monospace;color:#64665c")}>{strip.solver}</span>}
          </div>
        </>
      )}
      <div style={sx("display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px")}>
        {opt.figures.map((f) => (
          <div key={f.label} style={sx(`background:${f.bg};border:1px solid #e2dfd6;border-radius:10px;padding:15px 18px;display:flex;flex-direction:column;gap:8px`)}>
            <span style={sx(`font:400 13px/1 'IBM Plex Sans',sans-serif;color:${f.sub}`)}>{f.label}</span>
            <span style={sx(`font:600 26px/1 'IBM Plex Sans',sans-serif;letter-spacing:-0.01em;color:${f.fg}`)}>{f.value}</span>
          </div>
        ))}
      </div>
      {opt.goalCostNote.show && <div style={sx("font:400 13px/1.5 'IBM Plex Sans',sans-serif;color:#45473f;margin-top:-8px")}>{opt.goalCostNote.text}</div>}
      <div style={sx("display:flex;gap:24px;border-bottom:1px solid #e2dfd6;font:500 14px/1 'IBM Plex Sans',sans-serif;overflow-x:auto")}>
        {v.tabs.map((t) => (
          <button key={t.label} onClick={t.go} style={sx(`border:0;background:transparent;padding:0 0 12px;border-bottom:2px solid ${t.bd};color:${t.color};font:500 14px/1 'IBM Plex Sans',sans-serif;white-space:nowrap`)}>{t.label}</button>
        ))}
      </div>

      {v.tabRecipe && (
        <div style={sx("display:flex;flex-wrap:wrap;gap:18px;align-items:flex-start")}>
          <div style={sx("flex:1 1 520px;min-width:0;display:flex;flex-direction:column;gap:14px")}>
            <div style={sx("background:#fff;border:1px solid #e2dfd6;border-radius:10px;overflow:hidden")}>
              <div style={sx("display:flex;justify-content:space-between;align-items:center;gap:10px;padding:14px 20px;flex-wrap:wrap")}>
                <span style={sx("font:600 17px/1.2 'IBM Plex Sans',sans-serif")}>{opt.recipeTitle}</span>
                <div style={sx("display:flex;align-items:center;gap:8px")}>
                  <div role="group" aria-label="Batch size" style={sx("display:flex;background:#f3f0e8;border-radius:7px;padding:3px")}>
                    {v.batchOpts.map((b) => (
                      <button key={b.label} onClick={b.pick} style={sx(`border:0;padding:8px 12px;border-radius:5px;background:${b.tabBg};font:${b.weight} 14px/1 'IBM Plex Sans',sans-serif;color:#222420`)}>{b.label}</button>
                    ))}
                  </div>
                  {v.batchCustom && <input type="number" min="1" value={v.customBatch} onChange={v.onCustomBatch} placeholder="kg" aria-label="Custom batch, kg" style={sx("width:80px;padding:7px 8px;border:1px solid #d0cdc3;border-radius:6px;font:500 13px/1 'IBM Plex Sans',sans-serif")} />}
                </div>
              </div>
              {v.isManual && (
                <div style={sx("padding:10px 20px;background:#222420;color:#faf8f3;font:400 13px/1.4 'IBM Plex Sans',sans-serif;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap")}>
                  <span>
                    <b style={sx("font-weight:600")}>Manual recipe.</b> FeedSport checks your amounts but won&apos;t change them.
                  </span>
                  <button onClick={v.optimiseFromHere} style={sx("border:0;background:transparent;color:#e3aa45;font:600 13px/1 'IBM Plex Sans',sans-serif;padding:0")}>Back to optimised</button>
                </div>
              )}
              <div style={sx(`${RECIPE_COLS};padding:12px 20px;font:500 12px/1 'IBM Plex Mono',monospace;color:#45473f;text-transform:uppercase;letter-spacing:0.04em;background:#faf8f3;border-top:1px solid #e2dfd6`)}>
                <span>Ingredient</span>
                <span>Inclusion</span>
                <span style={sx("text-align:right")}>kg</span>
                <span style={sx("text-align:right")}>Cost share</span>
              </div>
              {opt.rows.map((r) => (
                <div key={r.name} title={r.setting + " · " + r.price + " (" + r.tag.toLowerCase() + " price)"} style={sx(`${RECIPE_COLS};padding:14px 20px;border-top:1px solid #ece8df;font:400 15px/1.2 'IBM Plex Sans',sans-serif;align-items:center;background:${r.bg}`)}>
                  <button onClick={r.open} style={sx("border:0;background:transparent;padding:0;text-align:left;font:500 15px/1.2 'IBM Plex Sans',sans-serif;color:#222420;display:flex;align-items:center;gap:8px")}>
                    {r.name}
                    {r.adv && <span style={sx("flex:none;width:8px;height:8px;background:#c98a1e;transform:rotate(45deg)")} />}
                  </button>
                  {v.isManual && <input type="number" step="0.1" min="0" max="100" value={r.manual} onChange={r.onManual} aria-label={r.name + " inclusion, %"} style={sx("width:90px;padding:6px 8px;border:1px solid #d0cdc3;border-radius:6px;font:600 14px/1 'IBM Plex Sans',sans-serif;text-align:right")} />}
                  {v.notManual && (
                    <span style={sx("display:flex;align-items:center;gap:12px")}>
                      <span style={sx("width:58px;text-align:right;font-weight:600")}>{r.pctTxt}</span>
                      <span style={sx("flex:1;max-width:130px;height:8px;background:#f3f0e8;border-radius:4px;overflow:hidden")}>
                        <span style={sx(`display:block;width:${r.barW};height:100%;background:${r.barC}`)} />
                      </span>
                    </span>
                  )}
                  <span style={sx("text-align:right")}>{r.kg}</span>
                  <span style={sx("text-align:right")}>{r.shareTxt}</span>
                </div>
              ))}
              <div style={sx(`${RECIPE_COLS};padding:13px 20px;border-top:1px solid #d0cdc3;font:600 15px/1.2 'IBM Plex Sans',sans-serif;align-items:center;background:#faf8f3`)}>
                <span>Total</span>
                <span style={sx(`color:${opt.total.color}`)}>{opt.total.pct}</span>
                <span style={sx("text-align:right")}>{opt.total.kg}</span>
                <span style={sx("text-align:right")}>100%</span>
              </div>
              {v.notManual && (
                <div style={sx("padding:12px 20px;border-top:1px solid #ece8df;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;font:400 13px/1.45 'IBM Plex Sans',sans-serif;color:#64665c")}>
                  <span>{opt.hasUnused ? "Available but not used: " + opt.unusedText + "." : "Every available ingredient is used."}</span>
                  <button onClick={v.editManually} style={sx("border:0;background:transparent;padding:0;font:600 13px/1.45 'IBM Plex Sans',sans-serif;color:#2f5a3f")}>Adjust amounts manually</button>
                </div>
              )}
            </div>
            {v.manualOff && (
              <div style={sx("display:flex;gap:8px;align-items:flex-start;font:500 13px/1.45 'IBM Plex Sans',sans-serif;color:#a63d2a")}>
                <span style={sx("flex:none;width:8px;height:8px;background:#b2412e;margin-top:5px")} />
                <span>
                  Recipe validity must pass before nutrition is evaluated, saved, or exported.
                  {v.manualIssues.map((issue) => <span key={issue.title} style={sx("display:block;font-weight:400")}>{issue.title}: {issue.body}</span>)}
                </span>
              </div>
            )}
          </div>
          <div style={sx("flex:1 1 320px;min-width:0;display:flex;flex-direction:column;gap:14px")}>
            <div style={sx("background:#fff;border:1px solid #e2dfd6;border-radius:10px;overflow:hidden")}>
              <div style={sx("display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:16px 20px")}>
                <span style={sx("font:600 17px/1.2 'IBM Plex Sans',sans-serif")}>Nutritional validation</span>
                <button onClick={v.goNutrients} style={sx("border:0;background:transparent;padding:0;font:500 14px/1 'IBM Plex Sans',sans-serif;color:#2f5a3f")}>All nutrients</button>
              </div>
              {opt.validation.rows.map((row) => (
                <details key={row.key} open={row.open} style={sx(`border-top:1px solid #ece8df;background:${row.tint}`)}>
                  <summary title={row.note} style={sx("display:flex;justify-content:space-between;gap:14px;padding:14px 20px;align-items:center;font:400 15px/1.3 'IBM Plex Sans',sans-serif;cursor:pointer;list-style:none")}>
                    <span style={sx(row.cards.length ? "font-weight:600" : "")}>{row.label}</span>
                    <span style={sx(`display:flex;align-items:center;gap:8px;color:${row.status.color};font-weight:600;font-size:14px`)}>
                      <StatusGlyph shape={row.status.shape} color={row.status.bg} />
                      {row.status.label}
                      {row.cards.length > 0 && <span aria-hidden className="fs-caret" style={sx("font-size:9px")}>▲</span>}
                    </span>
                  </summary>
                  <div style={sx("padding:0 20px 14px;display:flex;flex-direction:column;gap:8px;font:400 13px/1.45 'IBM Plex Sans',sans-serif;color:#45473f")}>
                    {!row.cards.length && <span style={sx("font-size:12px")}>{row.note}</span>}
                    {row.cards.map((card) => (
                      <div key={card.key} style={sx("padding:12px 14px;background:#fff;border:1px solid #e2dfd6;border-radius:8px;display:flex;flex-direction:column;gap:5px")}>
                        <span style={sx("display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap")}>
                          <span style={sx("font-weight:600;color:#222420;font-size:14px")}>{card.title}</span>
                          <span style={sx("color:#45473f;font-size:14px")}>
                            {card.value && <b style={sx("font-weight:600;color:#222420")}>{card.value}</b>}
                            {card.valueRest}
                          </span>
                        </span>
                        {card.detail && <span>{card.detail}</span>}
                        {card.chips.length > 0 && (
                          <span role="list" aria-label={`Ingredients that fix ${card.title}`} style={sx("display:flex;gap:6px;flex-wrap:wrap;margin-top:2px")}>
                            {card.chips.map((chip) => <RescueChip key={chip.key} chip={chip} />)}
                          </span>
                        )}
                        {card.links.length > 0 && (
                          <span style={sx("display:flex;gap:18px;flex-wrap:wrap")}>
                            {card.links.map((link) => (
                              <button key={link.label} type="button" onClick={link.go} style={sx("border:0;background:transparent;padding:0;font:600 13px/1.4 'IBM Plex Sans',sans-serif;color:#2f5a3f;text-align:left")}>{link.label}</button>
                            ))}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </details>
              ))}
              {opt.validation.unresolved ? (
                <div style={sx("padding:12px 20px;border-top:1px solid #ece8df;background:#faf8f3;font:400 13px/1.5 'IBM Plex Sans',sans-serif;color:#45473f")}>
                  Confirm unresolved results with a nutritionist before mixing.{" "}
                  <a href={opt.validation.waHref} target="_blank" rel="noopener" style={sx("font-weight:600;color:#222420;text-decoration:none")}>Ask on WhatsApp</a>
                </div>
              ) : (
                <div style={sx("padding:12px 20px;border-top:1px solid #ece8df;display:flex;flex-direction:column;gap:4px;font:400 12px/1.5 'IBM Plex Sans',sans-serif;color:#64665c")}>
                  <span style={sx(`font:600 13px/1.3 'IBM Plex Sans',sans-serif;color:${opt.validation.overallColor}`)}>{opt.validation.overallLabel}</span>
                  <span>{opt.validation.note}</span>
                </div>
              )}
            </div>
            {v.notManual && (
              <div style={sx("background:#fff;border:1px solid #e2dfd6;border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:10px")}>
                <div style={sx("display:flex;flex-direction:column;gap:4px")}>
                  <span style={sx("font:600 15px/1.2 'IBM Plex Sans',sans-serif")}>Other ways to formulate this</span>
                  <span style={sx("font:400 12px/1.4 'IBM Plex Sans',sans-serif;color:#64665c")}>Same requirements and ingredients, within 3% of least cost.</span>
                </div>
                {opt.strategies.map((g) => (
                  <button key={g.label} onClick={g.pick} disabled={g.disabled} style={sx(`text-align:left;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 12px;padding:11px 12px;border-radius:7px;border:1px ${g.bs} ${g.bd};box-shadow:${g.ring};background:${g.bg};color:#222420;cursor:${g.cursor}`)}>
                    <span style={sx("font:600 14px/1.2 'IBM Plex Sans',sans-serif")}>
                      {g.label} <span style={sx("font:500 10px/1 'IBM Plex Mono',monospace;color:#2f5a3f")}>{g.badge}</span>
                    </span>
                    <span style={sx("font:600 14px/1.2 'IBM Plex Sans',sans-serif;text-align:right")}>{g.cost}</span>
                    <span style={sx("font:400 12px/1.4 'IBM Plex Sans',sans-serif;color:#45473f")}>{g.note}</span>
                    <span style={sx(`font:500 12px/1.2 'IBM Plex Sans',sans-serif;color:${g.deltaColor};text-align:right`)}>{g.delta}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {v.tabNutrients && (
        <div style={sx("background:#fff;border:1px solid #e2dfd6;border-radius:10px;overflow:hidden")}>
          <div style={sx("display:flex;gap:16px;padding:12px 18px;font:400 12px/1 'IBM Plex Sans',sans-serif;color:#64665c;border-bottom:1px solid #e2dfd6;flex-wrap:wrap")}>
            <span style={sx("display:flex;align-items:center;gap:6px")}>
              <span style={sx("width:14px;height:8px;background:#dbe7dc;border-left:2px solid #2f5a3f")} />
              Required range (hard)
            </span>
            <span style={sx("display:flex;align-items:center;gap:6px")}>
              <span style={sx("width:2px;height:12px;background:#222420")} />
              This recipe
            </span>
            <span style={sx("display:flex;align-items:center;gap:6px")}>
              <span style={sx("font:500 10px/1 'IBM Plex Mono',monospace;color:#2f5a3f")}>LIMITING</span>
              exactly at a limit, drives cost
            </span>
          </div>
          {opt.nuts.map((n) => (
            <div key={n.name} style={sx("display:grid;grid-template-columns:minmax(0,1.3fr) 100px minmax(120px,1.6fr) 110px 130px;gap:14px;padding:12px 18px;border-top:1px solid #ece8df;align-items:center;font:400 14px/1.2 'IBM Plex Sans',sans-serif")}>
              <span style={sx("display:flex;flex-direction:column;gap:3px")}>
                <span style={sx("font-weight:500")}>{n.name}</span>
                <span style={sx("font-size:12px;color:#64665c")}>{n.reqTxt}</span>
              </span>
              <span style={sx("text-align:right;font-weight:600")}>{n.val}</span>
              <span style={sx(`position:relative;height:10px;background:${n.trackBg};border-radius:2px`)}>
                <span style={sx(`position:absolute;left:${n.zl};width:${n.zw};top:0;bottom:0;background:#dbe7dc;border-left:2px solid ${n.zbl};border-right:2px solid ${n.zbr}`)} />
                <span style={sx(`position:absolute;left:${n.mk};top:-3px;width:2px;height:16px;background:${n.mkC}`)} />
              </span>
              <span style={sx(`display:flex;align-items:center;gap:6px;color:${n.st.color};font-size:13px`)}>
                <span style={sx(`flex:none;width:8px;height:8px;background:${n.st.bg};border-radius:${n.st.r}`)} />
                {n.st.label}
              </span>
              <span style={sx("font:500 10px/1.3 'IBM Plex Mono',monospace;color:#2f5a3f")}>{n.flag}</span>
            </div>
          ))}
          <div style={sx("padding:12px 18px;border-top:1px solid #ece8df;font:400 12px/1.5 'IBM Plex Sans',sans-serif;color:#64665c")}>As-fed basis. Source: {v.prog.source}. Requirements and ingredient values as published; nothing is relaxed.</div>
          {opt.micronutrients.map((group) => (
            <section key={group.id} aria-labelledby={`micronutrient-${group.id}`} style={sx("border-top:8px solid #f3f0e8")}>
              <div style={sx("padding:16px 18px 12px;display:flex;flex-direction:column;gap:5px")}>
                <h3 id={`micronutrient-${group.id}`} style={sx("font:600 17px/1.25 'IBM Plex Sans',sans-serif;margin:0;color:#222420")}>{group.label}</h3>
                <span style={sx("font:400 12px/1.45 'IBM Plex Sans',sans-serif;color:#64665c")}>{group.note}</span>
              </div>
              {group.rows.length ? (
                <div style={sx("overflow-x:auto")}>
                  <div style={sx("min-width:760px")}>
                    <div style={sx("display:grid;grid-template-columns:minmax(170px,1.35fr) 105px 130px 135px minmax(230px,1.8fr);gap:14px;padding:10px 18px;background:#faf8f3;border-top:1px solid #ece8df;font:500 11px/1 'IBM Plex Mono',monospace;color:#64665c;text-transform:uppercase;letter-spacing:0.04em")}>
                      <span>Nutrient</span><span>Actual</span><span>Target</span><span>Status</span><span>Evidence</span>
                    </div>
                    {group.rows.map((row) => (
                      <div key={row.name} style={sx("display:grid;grid-template-columns:minmax(170px,1.35fr) 105px 130px 135px minmax(230px,1.8fr);gap:14px;padding:12px 18px;border-top:1px solid #ece8df;align-items:start;font:400 13px/1.4 'IBM Plex Sans',sans-serif")}>
                        <span style={sx("display:flex;flex-direction:column;gap:3px")}><strong style={sx("font-weight:600")}>{row.name}</strong><span style={sx("font-size:11px;color:#64665c")}>{row.scope}</span></span>
                        <span style={sx("font-weight:600")}>{row.actual}</span>
                        <span>{row.target}</span>
                        <span style={sx(`display:flex;align-items:center;gap:7px;color:${row.status.color};font-weight:600`)}><span aria-hidden style={sx(`flex:none;width:8px;height:8px;background:${row.status.bg};border-radius:${row.status.r}`)} />{row.status.label}</span>
                        <span style={sx("display:flex;flex-direction:column;gap:3px;color:#45473f")}><span>{row.reason}</span><span style={sx("font-size:11px;color:#64665c")}>Target source: {row.source}</span></span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <div style={sx("padding:0 18px 16px;font:400 13px/1.45 'IBM Plex Sans',sans-serif;color:#64665c")}>No targets are loaded for this category.</div>}
            </section>
          ))}
        </div>
      )}

      {v.tabWhy && (
        <>
          {v.whyLoading && (
            <div style={sx("display:flex;align-items:center;gap:10px;padding:20px;font:400 14px/1.3 'IBM Plex Sans',sans-serif;color:#64665c")}>
              {v.spinnerDark}Re-running variations of this formulation…
            </div>
          )}
          {v.whyReady && (
            <>
              <div style={sx("display:flex;flex-wrap:wrap;gap:18px;align-items:flex-start")}>
                <div style={sx("flex:1 1 380px;min-width:0;background:#fff;border:1px solid #e2dfd6;border-radius:10px;padding:20px;display:flex;flex-direction:column;gap:12px")}>
                  <div style={sx("display:flex;flex-direction:column;gap:6px")}>
                    <span style={sx("font:600 16px/1.2 'IBM Plex Sans',sans-serif")}>What&apos;s driving the cost</span>
                    <span style={sx("font:400 13px/1.45 'IBM Plex Sans',sans-serif;color:#64665c")}>These requirements are met exactly. Raising them costs money; the others have room to spare.</span>
                  </div>
                  {v.why.limiting.map((l) => (
                    <div key={l.rank} style={sx("display:grid;grid-template-columns:22px minmax(0,1fr) auto;gap:10px;align-items:baseline;padding:11px 0;border-top:1px solid #ece8df")}>
                      <span style={sx("font:500 13px/1 'IBM Plex Mono',monospace;color:#64665c")}>{l.rank}</span>
                      <span style={sx("font:500 15px/1.3 'IBM Plex Sans',sans-serif")}>
                        {l.name} <span style={sx("font-weight:400;color:#64665c;font-size:13px")}>{l.min}</span>
                      </span>
                      <span style={sx("font:400 13px/1.3 'IBM Plex Sans',sans-serif;text-align:right")}>
                        {l.delta}
                      </span>
                    </div>
                  ))}
                  {v.why.held.map((h, i) => (
                    <div key={i} style={sx("padding:12px 14px;background:#faf8f3;border-radius:8px;font:400 13px/1.5 'IBM Plex Sans',sans-serif;color:#45473f")}>{h}</div>
                  ))}
                </div>
                <div style={sx("flex:1 1 380px;min-width:0;background:#fff;border:1px solid #e2dfd6;border-radius:10px;padding:20px;display:flex;flex-direction:column;gap:12px")}>
                  <div style={sx("display:flex;flex-direction:column;gap:6px")}>
                    <span style={sx("font:600 16px/1.2 'IBM Plex Sans',sans-serif")}>Ingredients you don&apos;t use</span>
                    <span style={sx("font:400 13px/1.45 'IBM Plex Sans',sans-serif;color:#64665c")}>In your list but not in this recipe, at your prices. Nothing has been changed.</span>
                  </div>
                  {v.why.opps.map((o) => (
                    <div key={o.name} style={sx("display:flex;flex-direction:column;gap:8px;padding:14px;border:1px solid #e2dfd6;border-radius:8px")}>
                      <div style={sx("display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap")}>
                        <span style={sx("font:600 15px/1.2 'IBM Plex Sans',sans-serif")}>{o.name}</span>
                        <span style={sx("display:flex;align-items:center;gap:6px;font:500 12px/1 'IBM Plex Sans',sans-serif;color:#2b6a42")}>
                          <span style={sx("width:8px;height:8px;border-radius:50%;background:#2f7a4a")} />
                          Confirmed by re-running
                        </span>
                      </div>
                      <span style={sx("font:400 14px/1.5 'IBM Plex Sans',sans-serif;color:#33240b")}>{o.text}</span>
                      <button onClick={o.add} style={sx("align-self:flex-start;font:600 13px/1 'IBM Plex Sans',sans-serif;padding:9px 12px;border:1px solid #2f5a3f;color:#2f5a3f;border-radius:6px;background:#fff")}>{o.addLabel}</button>
                    </div>
                  ))}
                  {v.why.misses.map((m) => (
                    <div key={m.name} style={sx("display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 12px;padding:11px 0;border-top:1px solid #ece8df")}>
                      <span style={sx("font:500 14px/1.3 'IBM Plex Sans',sans-serif")}>{m.name}</span>
                      <span style={sx("font:400 13px/1.3 'IBM Plex Sans',sans-serif;color:#64665c")}>{m.tag}</span>
                      <span style={sx("font:400 13px/1.45 'IBM Plex Sans',sans-serif;color:#45473f;grid-column:1 / 3")}>{m.text}</span>
                    </div>
                  ))}
                  {v.why.none && <span style={sx("font:400 13px/1.5 'IBM Plex Sans',sans-serif;color:#64665c")}>No catalogue ingredient would lower the cost at its current price.</span>}
                </div>
              </div>
              <div style={sx("font:400 13px/1.5 'IBM Plex Sans',sans-serif;color:#64665c;max-width:860px")}>Every figure here comes from solving a changed version of this formulation. FeedSport optimises cost against fixed requirements; effects on animal performance are not modelled.</div>
            </>
          )}
        </>
      )}

      {v.tabHistory && (
        <div style={sx("display:flex;flex-wrap:wrap;gap:18px;align-items:flex-start")}>
          <div style={sx("flex:1 1 360px;background:#fff;border:1px solid #e2dfd6;border-radius:10px;overflow:hidden")}>
            <div style={sx("padding:14px 18px;font:600 15px/1 'IBM Plex Sans',sans-serif;border-bottom:1px solid #e2dfd6")}>Runs this session</div>
            {v.runs.map((h, i) => (
              <div key={i} style={sx("display:grid;grid-template-columns:70px minmax(0,1fr) auto;gap:12px;padding:12px 18px;border-top:1px solid #ece8df;font:400 14px/1.3 'IBM Plex Sans',sans-serif")}>
                <span style={sx("color:#64665c;font:400 13px/1.3 'IBM Plex Mono',monospace")}>{h.time}</span>
                <span>{h.label}</span>
                <span style={sx("font-weight:600")}>{h.cost}</span>
              </div>
            ))}
          </div>
          <div style={sx("flex:1 1 360px;background:#fff;border:1px solid #e2dfd6;border-radius:10px;overflow:hidden")}>
            <div style={sx("padding:14px 18px;font:600 15px/1 'IBM Plex Sans',sans-serif;border-bottom:1px solid #e2dfd6")}>Saved versions</div>
            {v.docVersions.map((ver) => (
              <button key={ver.v} onClick={ver.open} className={hv("row")} style={sx("width:100%;border:0;border-top:1px solid #ece8df;background:#fff;text-align:left;display:grid;grid-template-columns:44px minmax(0,1fr) minmax(130px,auto) auto;gap:12px;padding:12px 18px;font:400 14px/1.3 'IBM Plex Sans',sans-serif;color:#222420")}>
                <span style={sx("font-weight:600")}>v{ver.v}</span>
                <span style={sx("color:#45473f")}>{ver.date}</span>
                <span style={sx(`display:flex;align-items:center;gap:7px;color:${ver.status.color}`)}>
                  <span style={sx(`flex:none;width:8px;height:8px;background:${ver.status.bg};border-radius:${ver.status.r};transform:rotate(${ver.status.rot})`)} />
                  {ver.status.label}
                </span>
                <span style={sx("font-weight:600")}>{ver.cost}</span>
              </button>
            ))}
            {v.noVersions && <div style={sx("padding:14px 18px;font:400 13px/1.5 'IBM Plex Sans',sans-serif;color:#64665c")}>Not saved yet. Each save becomes a version you can reopen and compare.</div>}
          </div>
        </div>
      )}
    </div>
  );
}

const LIST_COLS = "display:grid;grid-template-columns:36px minmax(0,2fr) 1.5fr 60px 1.4fr 0.9fr 1fr 110px;gap:12px";

function List({ v }: V) {
  return (
    <div style={sx("padding:36px clamp(16px,4vw,40px);display:flex;flex-direction:column;gap:20px;max-width:1600px;width:100%;margin:0 auto;animation:fsin .25s ease-out")}>
      <div style={sx("display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap")}>
        <span style={sx("font:600 26px/1.2 'IBM Plex Sans',sans-serif;letter-spacing:-0.015em")}>Formulations</span>
        <div style={sx("display:flex;align-items:center;gap:12px;padding:8px 8px 8px 14px;background:#222420;color:#faf8f3;border-radius:8px;font:500 13px/1 'IBM Plex Sans',sans-serif")}>
          <span>{v.selText}</span>
          <button onClick={v.doCompare} disabled={v.cmpDisabled} style={sx(`border:0;padding:8px 12px;background:${v.cmpBg};color:#222420;border-radius:6px;font:600 13px/1 'IBM Plex Sans',sans-serif`)}>Compare</button>
        </div>
      </div>
      <div style={sx("background:#fff;border:1px solid #e2dfd6;border-radius:10px;overflow:auto")}>
        <div style={sx("min-width:820px")}>
          <div style={sx(`${LIST_COLS};padding:11px 18px;font:500 11px/1 'IBM Plex Mono',monospace;color:#64665c;text-transform:uppercase;letter-spacing:0.04em;background:#faf8f3`)}>
            <span />
            <span>Name</span>
            <span>Programme</span>
            <span>Ver.</span>
            <span>Result</span>
            <span style={sx("text-align:right")}>Cost / t</span>
            <span>Saved</span>
            <span />
          </div>
          <SavedState v={v} empty={v.listRows.length === 0} />
          {v.listRows.map((d, i) => (
            <div key={i} style={sx(`${LIST_COLS};padding:12px 18px;border-top:1px solid #ece8df;font:400 14px/1.3 'IBM Plex Sans',sans-serif;align-items:center;background:${d.bg}`)}>
              <button onClick={d.toggle} aria-label="Select" style={sx(`width:18px;height:18px;border-radius:4px;border:1.5px solid ${d.cbBd};background:${d.cbBg};color:#fff;font:600 11px/15px 'IBM Plex Sans',sans-serif;padding:0`)}>{d.check}</button>
              <span style={sx(`font-weight:500;padding-left:${d.indent};color:${d.nameColor}`)}>{d.name}</span>
              <span style={sx("color:#45473f")}>{d.prog}</span>
              <span>v{d.v}</span>
              <span style={sx(`display:flex;align-items:center;gap:7px;color:${d.st.color}`)}>
                <span style={sx(`flex:none;width:8px;height:8px;background:${d.st.bg};border-radius:${d.st.r};transform:rotate(${d.st.rot})`)} />
                {d.st.label}
              </span>
              <span style={sx("text-align:right")}>{d.cost}</span>
              <span style={sx("color:#45473f")}>{d.date}</span>
              <span style={sx("display:flex;align-items:center;justify-content:flex-end;gap:8px")}>
                <button onClick={d.open} style={sx("border:0;background:transparent;font:600 13px/1 'IBM Plex Sans',sans-serif;color:#2f5a3f;text-align:right;padding:4px 0")}>Open</button>
                {d.canDelete ? (
                  <button onClick={d.remove} aria-label={d.deleteLabel} title="Delete this formulation and all its versions" className={hv("trash")} style={sx("display:flex;align-items:center;justify-content:center;width:30px;height:30px;border:0;border-radius:6px;background:transparent;padding:0;color:#a63d2a")}>
                    <Trash2 size={16} strokeWidth={1.75} aria-hidden />
                  </button>
                ) : (
                  <span style={sx("width:30px")} />
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div style={sx("font:400 13px/1.5 'IBM Plex Sans',sans-serif;color:#64665c")}>Select any two versions to compare. Each version stores programme, stage, ingredients and roles, prices, limits and goal, so reopening reproduces the result.</div>
    </div>
  );
}

const LINK = "border:0;background:transparent;padding:0;font:500 13px/1 'IBM Plex Sans',sans-serif;color:#2f5a3f";
const LINK_DANGER = "border:0;background:transparent;padding:0;font:500 13px/1 'IBM Plex Sans',sans-serif;color:#a63d2a";
const SMALL_PRIMARY = "font:600 13px/1 'IBM Plex Sans',sans-serif;padding:9px 12px;border:0;border-radius:6px;background:#2f5a3f;color:#fff";
const NAME_INPUT = "padding:10px 12px;border:1px solid #d0cdc3;border-radius:7px;font:400 14px/1 'IBM Plex Sans',sans-serif;background:#fff;color:#222420;min-width:0";

// Asks for a name before a list is made. Enter creates, Escape cancels.
function NewListForm({ v }: V) {
  return (
    <div style={sx("background:#fff;border:1px solid #d0cdc3;box-shadow:inset 0 0 0 1px #2f5a3f;border-radius:8px;padding:14px 16px;display:flex;flex-direction:column;gap:10px;animation:fsin .2s ease-out")}>
      <label htmlFor="fs-new-list" style={sx("font:600 15px/1.2 'IBM Plex Sans',sans-serif")}>New list</label>
      <input id="fs-new-list" autoFocus value={v.createVal} onChange={v.onCreateChange} onKeyDown={v.onCreateKey} maxLength={v.setNameMax} placeholder="e.g. Mill stock or Rainy season" style={sx(NAME_INPUT)} />
      <div style={sx("display:flex;gap:14px;align-items:center")}>
        <button onClick={v.createSave} style={sx(SMALL_PRIMARY)}>Create list</button>
        <button onClick={v.createCancel} style={sx(LINK)}>Cancel</button>
      </div>
    </div>
  );
}

// Each column keeps room for its header on one line; below that width the
// table scrolls sideways (SET_MIN_WIDTH) instead of squashing.
const SET_COLS = "display:grid;grid-template-columns:minmax(150px,1.6fr) minmax(105px,0.9fr) minmax(80px,0.7fr) 120px minmax(110px,1.1fr) 32px;gap:10px";
const SET_MIN_WIDTH = "min-width:720px";

function MyIngredients({ v }: V) {
  return (
    <div style={sx("padding:36px clamp(16px,4vw,40px);display:flex;flex-direction:column;gap:20px;max-width:1600px;width:100%;margin:0 auto;animation:fsin .25s ease-out")}>
      <div style={sx("display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap")}>
        <div style={sx("display:flex;flex-direction:column;gap:6px")}>
          <span style={sx("font:600 26px/1.2 'IBM Plex Sans',sans-serif;letter-spacing:-0.015em")}>My ingredients</span>
          <span style={sx("font:400 14px/1.5 'IBM Plex Sans',sans-serif;color:#64665c;max-width:640px")}>Lists of what you can actually get, with what you pay and reusable inclusion rules. A formulation copies the list when it starts, so editing a list never changes saved work.</span>
        </div>
        <button onClick={v.newSet} style={sx("font:600 14px/1 'IBM Plex Sans',sans-serif;padding:11px 16px;background:#2f5a3f;color:#fff;border:0;border-radius:7px")}>New list</button>
      </div>
      {v.myStatus !== "ready" && (
        <div style={sx("background:#fff;border:1px solid #e2dfd6;border-radius:10px;padding:18px;font:400 14px/1.5 'IBM Plex Sans',sans-serif;color:#64665c;display:flex;gap:12px;align-items:center;flex-wrap:wrap")}>
          {v.myStatus === "error" ? (
            <>
              <span style={sx("color:#a63d2a")}>Couldn’t load your lists.</span>
              <button onClick={v.myRetry} style={sx("border:0;background:transparent;padding:0;font:600 13px/1 'IBM Plex Sans',sans-serif;color:#2f5a3f")}>Try again</button>
            </>
          ) : (
            <>
              {v.spinnerDark}
              Loading your lists…
            </>
          )}
        </div>
      )}
      {v.myNoLists && (
        <div style={sx("background:#fff;border:1px solid #e2dfd6;border-radius:10px;padding:24px;display:flex;flex-direction:column;gap:10px;max-width:640px")}>
          <span style={sx("font:600 18px/1.25 'IBM Plex Sans',sans-serif")}>No lists yet</span>
          <span style={sx("font:400 14px/1.5 'IBM Plex Sans',sans-serif;color:#64665c")}>Make a list for each store, mill or season: the ingredients you can get and what you pay for them. You can also add ingredients from the catalogue.</span>
          {v.creating ? <NewListForm v={v} /> : <button onClick={v.newSet} style={sx("align-self:flex-start;font:600 14px/1 'IBM Plex Sans',sans-serif;padding:11px 16px;background:#2f5a3f;color:#fff;border:0;border-radius:7px")}>New list</button>}
        </div>
      )}
      {v.myStatus === "ready" && !v.myNoLists && (
      <div style={sx("display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start")}>
        <div style={sx("flex:0 1 280px;min-width:240px;display:flex;flex-direction:column;gap:10px")}>
          {v.creating && <NewListForm v={v} />}
          {v.setList.map((s, i) => (
            <button key={i} onClick={s.pick} style={sx(`text-align:left;background:${s.bg};border:1px solid #d0cdc3;box-shadow:${s.ring};border-radius:8px;padding:14px 16px;display:flex;flex-direction:column;gap:6px;color:#222420`)}>
              <span style={sx("font:600 15px/1.2 'IBM Plex Sans',sans-serif")}>
                {s.label} {s.badge && <span style={sx("font:500 10px/1 'IBM Plex Mono',monospace;color:#2f5a3f")}>{s.badge}</span>}
              </span>
              <span style={sx("font:400 13px/1.4 'IBM Plex Sans',sans-serif;color:#64665c")}>{s.sub}</span>
              {s.hasWarn && (
                <span style={sx("display:flex;align-items:center;gap:7px;font:500 12px/1.3 'IBM Plex Sans',sans-serif;color:#8a5f18")}>
                  <span style={sx("width:7px;height:7px;background:#c98a1e;transform:rotate(45deg)")} />
                  {s.warn}
                </span>
              )}
            </button>
          ))}
        </div>
        <div style={sx("flex:1 1 560px;min-width:0;background:#fff;border:1px solid #e2dfd6;border-radius:10px;overflow:hidden")}>
          <div style={sx("display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid #e2dfd6;flex-wrap:wrap")}>
            {v.renaming ? (
              <div style={sx("display:flex;gap:10px;align-items:center;flex-wrap:wrap;flex:1 1 320px;min-width:0")}>
                <input autoFocus value={v.renameVal} onChange={v.onRenameChange} onKeyDown={v.onRenameKey} maxLength={v.setNameMax} aria-label="List name" style={sx(NAME_INPUT + ";font:600 16px/1 'IBM Plex Sans',sans-serif;flex:1 1 200px")} />
                <button onClick={v.renameSave} style={sx(SMALL_PRIMARY)}>Save</button>
                <button onClick={v.renameCancel} style={sx(LINK)}>Cancel</button>
              </div>
            ) : (
              <div style={sx("display:flex;flex-direction:column;gap:8px;min-width:0")}>
                <span style={sx("font:600 18px/1.2 'IBM Plex Sans',sans-serif;color:#222420")}>
                  {v.setName} {v.setIsDefault && <span style={sx("font:500 10px/1 'IBM Plex Mono',monospace;color:#2f5a3f")}>DEFAULT</span>}
                </span>
                <span style={sx("display:flex;gap:14px;align-items:center;flex-wrap:wrap")}>
                  <button onClick={v.startRename} style={sx(LINK)}>Rename</button>
                  {!v.setIsDefault && <button onClick={v.makeDefault} style={sx(LINK)}>Make default</button>}
                  <button onClick={v.deleteSet} style={sx(LINK_DANGER)}>Delete</button>
                </span>
              </div>
            )}
            <div style={sx("display:flex;gap:8px;flex-wrap:wrap")}>
              <button onClick={v.addToSet} style={sx("font:500 13px/1 'IBM Plex Sans',sans-serif;padding:10px 12px;border:1px solid #d0cdc3;border-radius:7px;background:#fff;color:#222420")}>+ Add ingredient</button>
              <button onClick={v.formulateWithSet} style={sx("font:600 13px/1 'IBM Plex Sans',sans-serif;padding:10px 12px;border:0;border-radius:7px;background:#2f5a3f;color:#fff")}>Formulate with this list</button>
            </div>
          </div>
          <div style={sx("overflow-x:auto")}>
            <div style={sx(SET_MIN_WIDTH)}>
              <div style={sx(`${SET_COLS};padding:10px 18px;font:500 11px/1 'IBM Plex Mono',monospace;color:#64665c;text-transform:uppercase;letter-spacing:0.04em;background:#faf8f3;white-space:nowrap`)}>
                <span>Ingredient</span>
                <span>Reusable rule</span>
                <span style={sx("text-align:right")}>Default / t</span>
                <span>Your price / t</span>
                <span>Price status</span>
                <span />
              </div>
              {v.setRows.map((r) => (
                <div key={r.id} style={sx(`${SET_COLS};padding:10px 18px;border-top:1px solid #ece8df;font:400 14px/1.2 'IBM Plex Sans',sans-serif;align-items:center`)}>
                  <span style={sx("display:flex;flex-direction:column;gap:3px")}>
                    <span style={sx("font-weight:500")}>{r.name}</span>
                    <span style={sx("font-size:12px;color:#64665c")}>{r.cat}</span>
                  </span>
                  <button onClick={r.editRule} style={sx("border:0;background:transparent;padding:4px 0;text-align:left;font:500 13px/1.2 'IBM Plex Sans',sans-serif;color:#2f5a3f;text-decoration:underline;text-decoration-color:#cfe0d2;text-underline-offset:3px")}>{r.rule}</button>
                  <span style={sx("text-align:right;color:#45473f")}>{r.def}</span>
                  <div style={sx("display:flex;align-items:center;gap:6px;padding:0 10px;border:1px solid #d0cdc3;border-radius:6px")}>
                    <span style={sx("color:#64665c")}>$</span>
                    <input type="number" min="0" step="any" value={r.price} onChange={r.onPrice} placeholder="—" style={sx("width:100%;border:0;padding:8px 0;font:500 14px/1 'IBM Plex Sans',sans-serif;outline:none")} />
                  </div>
                  <span style={sx(`display:flex;align-items:center;gap:7px;font-size:13px;color:${r.ageColor}`)}>
                    {r.ageDot && <span style={sx("flex:none;width:7px;height:7px;background:#c98a1e;transform:rotate(45deg)")} />}
                    {r.age}
                  </span>
                  <button onClick={r.remove} aria-label={"Remove " + r.name} title="Remove from this list" className={hv("trash")} style={sx("justify-self:end;display:flex;align-items:center;justify-content:center;width:30px;height:30px;border:0;border-radius:6px;background:transparent;padding:0;color:#a63d2a")}>
                    <Trash2 size={16} strokeWidth={1.75} aria-hidden />
                  </button>
                </div>
              ))}
              {v.setEmpty && <div style={sx("padding:18px;font:400 14px/1.5 'IBM Plex Sans',sans-serif;color:#64665c")}>This list is empty. Add the ingredients you can buy or grow.</div>}
            </div>
          </div>
          <div style={sx("display:flex;justify-content:space-between;gap:12px;padding:12px 18px;border-top:1px solid #e2dfd6;font:400 12px/1.5 'IBM Plex Sans',sans-serif;color:#64665c;flex-wrap:wrap")}>
            <span>Click a reusable rule to set Available, Required, Fixed or Excluded and its inclusion limits. Leave a price blank to use the FeedSport default.{v.setIsDefault ? " Formulations start from your default list." : ""}</span>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

function RefHeader({ title, intro, maxW = 680 }: { title: string; intro: string; maxW?: number }) {
  return (
    <div style={sx("display:flex;flex-direction:column;gap:6px")}>
      <span style={sx("font:500 12px/1 'IBM Plex Mono',monospace;color:#64665c;letter-spacing:0.06em;text-transform:uppercase")}>Reference data</span>
      <span style={sx("font:600 26px/1.2 'IBM Plex Sans',sans-serif;letter-spacing:-0.015em")}>{title}</span>
      <span style={sx(`font:400 14px/1.5 'IBM Plex Sans',sans-serif;color:#64665c;max-width:${maxW}px`)}>{intro}</span>
    </div>
  );
}

const PROG_COLS = "display:grid;grid-template-columns:minmax(0,1.6fr) 1fr 1fr;gap:12px";

function Programmes({ v }: V) {
  return (
    <div style={sx("padding:36px clamp(16px,4vw,40px);display:flex;flex-direction:column;gap:20px;max-width:1600px;width:100%;margin:0 auto;animation:fsin .25s ease-out")}>
      <RefHeader title="Feeding programmes" intro="Nutritional requirements, ingredient limits and practical guidelines by stage. Read-only here; changes are made by FeedSport nutritionists." />
      <div style={sx("display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start")}>
        <div style={sx("flex:0 1 300px;min-width:240px;display:flex;flex-direction:column;gap:18px")}>
          {v.progGroups.map((g) => (
            <div key={g.label} style={sx("display:flex;flex-direction:column;gap:8px")}>
              <span style={sx(MONO_LABEL)}>{g.label}</span>
              {g.items.map((p) => (
                <button key={p.name + p.range} onClick={p.pick} style={sx(`text-align:left;background:${p.bg};border:1px solid #d0cdc3;box-shadow:${p.ring};border-radius:8px;padding:12px 14px;display:flex;flex-direction:column;gap:4px;color:#222420`)}>
                  <span style={sx("font:600 14px/1.2 'IBM Plex Sans',sans-serif")}>
                    {p.name} <span style={sx("font-weight:400;color:#64665c")}>{p.range}</span>
                  </span>
                  <span style={sx("font:400 12px/1.3 'IBM Plex Sans',sans-serif;color:#64665c")}>{p.meta}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
        <div style={sx("flex:1 1 560px;min-width:0;display:flex;flex-direction:column;gap:16px")}>
          <div style={sx("background:#fff;border:1px solid #e2dfd6;border-radius:10px;padding:18px 20px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap")}>
            <div style={sx("display:flex;flex-direction:column;gap:5px")}>
              <span style={sx("font:600 20px/1.2 'IBM Plex Sans',sans-serif")}>{v.progD.name}</span>
              <span style={sx("font:400 13px/1.4 'IBM Plex Sans',sans-serif;color:#64665c")}>{v.progD.sub}</span>
            </div>
            <button onClick={v.formulateProg} style={sx("font:600 14px/1 'IBM Plex Sans',sans-serif;padding:11px 16px;background:#2f5a3f;color:#fff;border:0;border-radius:7px")}>Formulate for this stage</button>
          </div>
          {v.progPhases.length > 0 && (
            <div style={sx("display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px")}>
              {v.progPhases.map((ph) => (
                <button key={ph.name} onClick={ph.pick} style={sx(`text-align:left;background:${ph.bg};border:1px solid #d0cdc3;box-shadow:${ph.ring};border-radius:8px;padding:12px 14px;display:flex;flex-direction:column;gap:4px;color:#222420`)}>
                  <span style={sx("font:600 14px/1.2 'IBM Plex Sans',sans-serif")}>{ph.name}</span>
                  <span style={sx("font:400 12px/1.3 'IBM Plex Sans',sans-serif;color:#64665c")}>{ph.meta}</span>
                </button>
              ))}
            </div>
          )}
          <div style={sx("background:#fff;border:1px solid #e2dfd6;border-radius:10px;overflow:hidden")}>
            <div style={sx("padding:14px 18px;font:600 15px/1 'IBM Plex Sans',sans-serif;border-bottom:1px solid #e2dfd6;display:flex;justify-content:space-between")}>
              <span>Nutrient requirements</span>
              <span style={sx("font:500 11px/1 'IBM Plex Mono',monospace;color:#64665c")}>HARD · NEVER RELAXED</span>
            </div>
            <div style={sx(`${PROG_COLS};padding:10px 18px;font:500 11px/1 'IBM Plex Mono',monospace;color:#64665c;text-transform:uppercase;background:#faf8f3`)}>
              <span>Nutrient</span>
              <span style={sx("text-align:right")}>Minimum</span>
              <span style={sx("text-align:right")}>Maximum</span>
            </div>
            {v.progReq.map((r) => (
              <div key={r.name} style={sx(`${PROG_COLS};padding:10px 18px;border-top:1px solid #ece8df;font:400 14px/1.2 'IBM Plex Sans',sans-serif`)}>
                <span>
                  {r.name} <span style={sx("color:#64665c;font-size:12px")}>{r.unit}</span>
                </span>
                <span style={sx("text-align:right;font-weight:500")}>{r.min}</span>
                <span style={sx("text-align:right;font-weight:500")}>{r.max}</span>
              </div>
            ))}
            <div style={sx("padding:12px 18px;border-top:1px solid #ece8df;font:400 12px/1.5 'IBM Plex Sans',sans-serif;color:#64665c")}>{v.progReqNote}</div>
          </div>
          <div style={sx("background:#fff;border:1px solid #e2dfd6;border-radius:10px;overflow:hidden")}>
            <div style={sx("padding:14px 18px;font:600 15px/1 'IBM Plex Sans',sans-serif;border-bottom:1px solid #e2dfd6")}>Ingredient limits and guidelines</div>
            <div style={sx(`${PROG_COLS};padding:10px 18px;font:500 11px/1 'IBM Plex Mono',monospace;color:#64665c;text-transform:uppercase;background:#faf8f3`)}>
              <span>Ingredient</span>
              <span>Hard limit</span>
              <span>Practical guideline</span>
            </div>
            {v.progLim.map((r) => (
              <div key={r.name} style={sx(`${PROG_COLS};padding:10px 18px;border-top:1px solid #ece8df;font:400 14px/1.2 'IBM Plex Sans',sans-serif`)}>
                <span>{r.name}</span>
                <span style={sx("font-weight:500")}>{r.limit}</span>
                <span style={sx(`color:${r.guideColor}`)}>{r.guide}</span>
              </div>
            ))}
            {v.progLimEmpty && <div style={sx("padding:12px 18px;border-top:1px solid #ece8df;font:400 14px/1.4 'IBM Plex Sans',sans-serif;color:#64665c")}>No ingredient limits for this stage.</div>}
            {v.progLimMore && (
              <div style={sx("padding:12px 18px;border-top:1px solid #ece8df")}>
                <button onClick={v.progLimMore.toggle} style={sx("border:0;background:transparent;padding:0;font:600 13px/1 'IBM Plex Sans',sans-serif;color:#2f5a3f")}>{v.progLimMore.label}</button>
              </div>
            )}
            <div style={sx("padding:12px 18px;border-top:1px solid #ece8df;font:400 12px/1.5 'IBM Plex Sans',sans-serif;color:#64665c")}>Hard limits are sent to the optimiser; users can tighten them but not exceed them. Guidelines are checked after solving and shown as advisories. {v.progLimNote}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NutrientData({ v }: V) {
  return (
    <div style={sx("padding:36px clamp(16px,4vw,40px);display:flex;flex-direction:column;gap:20px;max-width:1600px;width:100%;margin:0 auto;animation:fsin .25s ease-out")}>
      <RefHeader title="Nutrient data" intro="The nutrients FeedSport tracks, how they're measured, and where data is missing. Values are on an as-fed basis." />
      {v.nutGroups.map((g) => (
        <div key={g.label} style={sx("display:flex;flex-direction:column;gap:10px")}>
          <span style={sx(MONO_LABEL)}>{g.label}</span>
          <div style={sx("display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px")}>
            {g.items.map((n) => (
              <div key={n.name} style={sx("background:#fff;border:1px solid #e2dfd6;border-radius:10px;padding:16px 18px;display:flex;flex-direction:column;gap:8px")}>
                <div style={sx("display:flex;justify-content:space-between;align-items:baseline;gap:10px")}>
                  <span style={sx("font:600 15px/1.25 'IBM Plex Sans',sans-serif")}>{n.name}</span>
                  <span style={sx("font:500 12px/1 'IBM Plex Mono',monospace;color:#64665c")}>{n.unit}</span>
                </div>
                <span style={sx("font:400 13px/1.5 'IBM Plex Sans',sans-serif;color:#45473f")}>{n.desc}</span>
                <div style={sx("display:flex;justify-content:space-between;gap:10px;padding-top:8px;border-top:1px solid #ece8df;font:400 12px/1.4 'IBM Plex Sans',sans-serif;flex-wrap:wrap;margin-top:auto")}>
                  <span style={sx("color:#45473f")}>{n.used}</span>
                  <span style={sx(`color:${n.missColor}`)}>{n.miss}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const CAT_COLS = "display:grid;grid-template-columns:minmax(0,1.5fr) 0.9fr 0.7fr 0.7fr 0.8fr 0.7fr 1.4fr;gap:12px";

function Catalogue({ v }: V) {
  const pg = v.catPager;
  return (
    <div style={sx("padding:36px clamp(16px,4vw,40px);display:flex;flex-direction:column;gap:20px;max-width:1600px;width:100%;margin:0 auto;animation:fsin .25s ease-out")}>
      <div style={sx("display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap")}>
        <RefHeader title="Ingredient catalogue" intro="FeedSport's authoritative nutrient profiles and default prices. Add anything to one of your lists." />
        <input value={v.catQ} onChange={v.onCatQ} placeholder="Search name or category" style={sx("width:280px;max-width:100%;padding:11px 12px;border:1px solid #d0cdc3;border-radius:8px;font:400 14px/1 'IBM Plex Sans',sans-serif")} />
      </div>
      <div style={sx("display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start")}>
        <div style={sx("flex:1 1 600px;min-width:0;background:#fff;border:1px solid #e2dfd6;border-radius:10px;overflow:auto")}>
          <div style={sx("min-width:640px")}>
            <div style={sx(`${CAT_COLS};padding:10px 18px;font:500 11px/1 'IBM Plex Mono',monospace;color:#64665c;text-transform:uppercase;letter-spacing:0.04em;background:#faf8f3`)}>
              <span>Ingredient</span>
              <span>Category</span>
              <span style={sx("text-align:right")}>Price / t</span>
              <span style={sx("text-align:right")}>CP</span>
              <span style={sx("text-align:right")}>ME pig</span>
              <span style={sx("text-align:right")}>SID Lys</span>
              <span>Data</span>
            </div>
            {v.catRows.map((r) => (
              <button key={r.id} onClick={r.pick} className={hv("row")} style={sx(`width:100%;border:0;border-top:1px solid #ece8df;background:${r.bg};text-align:left;${CAT_COLS};padding:11px 18px;font:400 14px/1.2 'IBM Plex Sans',sans-serif;align-items:center;color:#222420`)}>
                <span style={sx("font-weight:500")}>{r.name}</span>
                <span style={sx("color:#45473f;font-size:13px")}>{r.cat}</span>
                <span style={sx("text-align:right")}>{r.price}</span>
                <span style={sx("text-align:right")}>{r.cp}</span>
                <span style={sx("text-align:right")}>{r.me}</span>
                <span style={sx("text-align:right")}>{r.lys}</span>
                <span style={sx(`display:flex;align-items:center;gap:7px;font-size:12px;color:${r.dataColor}`)}>
                  <span style={sx(`flex:none;width:7px;height:7px;background:${r.dataDot};border-radius:${r.dataR}`)} />
                  {r.data}
                </span>
              </button>
            ))}
            {v.catEmpty && <div style={sx("padding:18px;font:400 14px/1.4 'IBM Plex Sans',sans-serif;color:#64665c")}>No ingredients match.</div>}
          </div>
          <div style={sx("display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 18px;border-top:1px solid #e2dfd6;background:#faf8f3;flex-wrap:wrap;position:sticky;left:0")}>
            <div style={sx("display:flex;align-items:center;gap:12px;font:400 13px/1 'IBM Plex Sans',sans-serif;color:#45473f")}>
              <span>{pg.text}</span>
              <label style={sx("display:flex;align-items:center;gap:6px;color:#64665c")}>
                Per page
                <select value={pg.size} onChange={pg.onSize} style={sx("font:500 13px/1 'IBM Plex Sans',sans-serif;padding:5px 6px;border:1px solid #d0cdc3;border-radius:6px;background:#fff;color:#222420")}>
                  {CAT_PAGE_SIZES.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>
            </div>
            <div style={sx("display:flex;align-items:center;gap:6px")}>
              <button onClick={pg.prev} disabled={pg.prevDisabled} aria-label="Previous page" style={sx(`border:1px solid #d0cdc3;background:#fff;color:${pg.prevColor};font:500 13px/1 'IBM Plex Sans',sans-serif;padding:7px 10px;border-radius:6px`)}>‹ Prev</button>
              {pg.pages.map((p, i) => (
                <button key={i} onClick={p.go} style={sx(`min-width:32px;border:1px solid ${p.bd};background:${p.bg};color:${p.fg};font:600 13px/1 'IBM Plex Sans',sans-serif;padding:7px 8px;border-radius:6px`)}>{p.label}</button>
              ))}
              <button onClick={pg.next} disabled={pg.nextDisabled} aria-label="Next page" style={sx(`border:1px solid #d0cdc3;background:#fff;color:${pg.nextColor};font:500 13px/1 'IBM Plex Sans',sans-serif;padding:7px 10px;border-radius:6px`)}>Next ›</button>
            </div>
          </div>
        </div>
        {v.catD && (
          <div style={sx("flex:0 1 360px;min-width:280px;background:#fff;border:1px solid #e2dfd6;border-radius:10px;display:flex;flex-direction:column;animation:fsin .2s ease-out")}>
            <div style={sx("padding:16px 18px;border-bottom:1px solid #e2dfd6;display:flex;justify-content:space-between;align-items:flex-start;gap:10px")}>
              <div style={sx("display:flex;flex-direction:column;gap:5px")}>
                <span style={sx("font:600 18px/1.2 'IBM Plex Sans',sans-serif")}>{v.catD.name}</span>
                <span style={sx("font:400 13px/1.3 'IBM Plex Sans',sans-serif;color:#64665c")}>{v.catD.sub}</span>
              </div>
              <button onClick={v.catD.close} aria-label="Close" style={sx("border:0;background:transparent;font:400 22px/1 'IBM Plex Sans',sans-serif;color:#64665c;padding:0")}>×</button>
            </div>
            <div style={sx("padding:14px 18px;display:flex;flex-direction:column;gap:8px;border-bottom:1px solid #e2dfd6")}>
              <span style={sx("font:500 11px/1 'IBM Plex Mono',monospace;color:#64665c;text-transform:uppercase;letter-spacing:0.05em")}>Nutritional profile provenance</span>
              <strong style={sx("font:600 13px/1.4 'IBM Plex Sans',sans-serif")}>
                {v.catD.nutritionSource.publisher}{v.catD.nutritionSource.year ? " · " + v.catD.nutritionSource.year : ""}
              </strong>
              <span style={sx("font:400 12px/1.4 'IBM Plex Sans',sans-serif;color:#45473f")}>{v.catD.nutritionSource.title}</span>
              <span style={sx("font:400 12px/1.4 'IBM Plex Sans',sans-serif;color:#8a5f18")}>
                {v.catD.nutritionSource.verification.replaceAll("_", " ")}
                {" · "}{v.catD.nutritionSource.basis}
                {v.catD.nutritionSource.table ? " · " + v.catD.nutritionSource.table : ""}
                {v.catD.nutritionSource.page != null ? " · p. " + v.catD.nutritionSource.page : ""}
              </span>
              {v.catD.nutritionSource.url && <a href={v.catD.nutritionSource.url} target="_blank" rel="noopener noreferrer" style={sx("font:600 12px/1.3 'IBM Plex Sans',sans-serif;color:#1f5c38;text-decoration:underline")}>View original nutrient source ↗</a>}
              {v.catD.nutritionSource.notes.map((note: string, i: number) => (
                <span key={i} style={sx("font:400 11px/1.4 'IBM Plex Sans',sans-serif;color:#64665c")}>{note}</span>
              ))}
            </div>
            {v.catD.premixDetails && (
              <div style={sx("padding:14px 18px;display:flex;flex-direction:column;gap:7px;border-bottom:1px solid #e2dfd6;background:#fdf9ef")}>
                <span style={sx("font:500 11px/1 'IBM Plex Mono',monospace;color:#64665c;text-transform:uppercase;letter-spacing:0.05em")}>Premix use and complete-feed contribution</span>
                <span style={sx("font:400 12px/1.4 'IBM Plex Sans',sans-serif;color:#45473f")}>{v.catD.premixDetails.application} · {v.catD.premixDetails.permitted}</span>
                <span style={sx("font:500 12px/1.4 'IBM Plex Sans',sans-serif")}>{v.catD.premixDetails.instruction}</span>
                {v.catD.premixDetails.contributions.map((item) => (
                  <div key={item.name} style={sx("display:flex;justify-content:space-between;gap:8px;padding-top:5px;border-top:1px solid #ecd8ad;font:400 12px/1.3 'IBM Plex Sans',sans-serif")}>
                    <span>{item.name}</span><span style={sx("font-weight:600")}>{item.prefix}{item.value}</span>
                  </div>
                ))}
                <span style={sx("font:400 11px/1.4 'IBM Plex Sans',sans-serif;color:#8a5f18")}>{v.catD.premixDetails.basis}</span>
              </div>
            )}
            <div style={sx("padding:14px 18px;display:flex;flex-direction:column;gap:0")}>
              <span style={sx("font:500 11px/1 'IBM Plex Mono',monospace;color:#64665c;text-transform:uppercase;letter-spacing:0.05em;padding-bottom:8px")}>Nutrient profile · as fed</span>
              {v.catD.profile.map((p) => (
                <div key={p.name} style={sx("display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-top:1px solid #ece8df;font:400 13px/1.2 'IBM Plex Sans',sans-serif")}>
                  <span style={sx("color:#45473f")}>{p.name}{p.attribution?.url && <a href={p.attribution.url} target="_blank" rel="noopener noreferrer" title={p.attribution.publisher + " — " + p.attribution.title} style={sx("margin-left:6px;font:500 10px/1.3 'IBM Plex Sans',sans-serif;color:#1f5c38;text-decoration:underline")}>source</a>}</span>
                  <span style={sx(`font-weight:500;color:${p.color}`)}>{p.val}</span>
                </div>
              ))}
            </div>
            <div style={sx("padding:4px 18px 14px;display:flex;flex-direction:column;gap:0")}>
              <span style={sx("font:500 11px/1 'IBM Plex Mono',monospace;color:#64665c;text-transform:uppercase;letter-spacing:0.05em;padding:8px 0")}>Stage limits</span>
              {v.catD.limits.map((l) => (
                <div key={l.name} style={sx("display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-top:1px solid #ece8df;font:400 13px/1.3 'IBM Plex Sans',sans-serif")}>
                  <span style={sx("color:#45473f")}>{l.name}</span>
                  <span style={sx("text-align:right")}>
                    <b style={sx("font-weight:500")}>{l.limit}</b> <span style={sx("color:#8a5f18")}>{l.guide}</span>
                  </span>
                </div>
              ))}
              {v.catD.noLimits && <span style={sx("font:400 13px/1.4 'IBM Plex Sans',sans-serif;color:#64665c;border-top:1px solid #ece8df;padding-top:8px")}>No stage-specific limits.</span>}
            </div>
            <div style={sx("padding:14px 18px;border-top:1px solid #e2dfd6;display:flex;flex-direction:column;gap:8px")}>
              {v.catD.sets.map((s) => (
                <button key={s.label} onClick={s.add} style={sx(`font:600 13px/1 'IBM Plex Sans',sans-serif;padding:10px 12px;border:1px solid ${s.bd};color:${s.color};border-radius:7px;background:#fff;text-align:left`)}>{s.label}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Compare({ v }: V) {
  const cmp = v.cmp;
  return (
    <div style={sx("padding:32px clamp(16px,4vw,40px);display:flex;flex-direction:column;gap:18px;max-width:1600px;width:100%;margin:0 auto;animation:fsin .25s ease-out")}>
      <div style={sx("display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap")}>
        <span style={sx("font:600 24px/1.2 'IBM Plex Sans',sans-serif")}>Compare</span>
        <div style={sx("display:flex;gap:10px")}>
          <button onClick={v.goList} style={sx("font:500 14px/1 'IBM Plex Sans',sans-serif;padding:11px 14px;border:1px solid #d0cdc3;border-radius:7px;background:#fff;color:#222420")}>Back to list</button>
          <button onClick={cmp?.openB} style={sx("font:600 14px/1 'IBM Plex Sans',sans-serif;padding:11px 14px;background:#2f5a3f;color:#fff;border:0;border-radius:7px")}>Open {cmp?.bName}</button>
        </div>
      </div>
      <div style={sx("background:#fff;border:1px solid #e2dfd6;border-radius:10px;overflow:auto")}>
        <div style={sx("min-width:640px;display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr) minmax(0,1fr) 110px")}>
          <div style={sx("padding:14px 18px;background:#faf8f3")} />
          <div style={sx("padding:14px 18px;background:#faf8f3;display:flex;flex-direction:column;gap:5px")}>
            <span style={sx("font:600 15px/1.2 'IBM Plex Sans',sans-serif")}>{cmp?.aName}</span>
            <span style={sx("font:400 12px/1.3 'IBM Plex Sans',sans-serif;color:#64665c")}>{cmp?.aSub}</span>
          </div>
          <div style={sx("padding:14px 18px;background:#faf8f3;display:flex;flex-direction:column;gap:5px")}>
            <span style={sx("font:600 15px/1.2 'IBM Plex Sans',sans-serif")}>{cmp?.bName}</span>
            <span style={sx("font:400 12px/1.3 'IBM Plex Sans',sans-serif;color:#64665c")}>{cmp?.bSub}</span>
          </div>
          <div style={sx("padding:14px 18px;background:#faf8f3;font:500 11px/1 'IBM Plex Mono',monospace;color:#64665c;text-transform:uppercase;display:flex;align-items:flex-end;justify-content:flex-end")}>Change</div>
          {(cmp?.groups ?? []).map((g) => (
            <div key={g.title} style={{ display: "contents" }}>
              <div style={sx("grid-column:1 / 5;padding:12px 18px 6px;font:600 13px/1 'IBM Plex Sans',sans-serif;border-top:1px solid #e2dfd6")}>{g.title}</div>
              {g.rows.map((r, i) => (
                <div key={i} style={{ display: "contents" }}>
                  <div style={sx("padding:8px 18px;font:400 14px/1.3 'IBM Plex Sans',sans-serif")}>{r.label}</div>
                  <div style={sx("padding:8px 18px;font:400 14px/1.3 'IBM Plex Sans',sans-serif")}>{r.a}</div>
                  <div style={sx(`padding:8px 18px;font:500 14px/1.3 'IBM Plex Sans',sans-serif;background:${r.hl}`)}>{r.b}</div>
                  <div style={sx(`padding:8px 18px;font:400 13px/1.3 'IBM Plex Sans',sans-serif;text-align:right;color:${r.dc}`)}>{r.d}</div>
                </div>
              ))}
              <div style={sx("grid-column:1 / 5;padding:2px 18px 10px;font:400 12px/1.3 'IBM Plex Sans',sans-serif;color:#64665c")}>{g.note}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdvisoryDrawer({ v }: V) {
  const advisories = v.opt?.advisories ?? [];
  const count = advisories.length;
  const title = v.advisoriesLabel;
  return (
    <>
      <div onClick={v.closeAdvisories} style={sx("position:fixed;inset:0;background:rgba(34,36,32,.38);z-index:20")} />
      <aside role="dialog" aria-modal="true" aria-labelledby="advisories-title" style={sx("position:fixed;top:0;right:0;bottom:0;width:min(480px,100vw);background:#fff;display:flex;flex-direction:column;box-shadow:-12px 0 40px rgba(0,0,0,.18);z-index:21;animation:fsin .2s ease-out")}>
        <div style={sx("padding:22px 26px 18px;border-bottom:1px solid #e2dfd6;display:flex;justify-content:space-between;align-items:flex-start;gap:20px")}>
          <div style={sx("display:flex;flex-direction:column;gap:7px")}>
            <span style={sx("font:500 11px/1 'IBM Plex Mono',monospace;color:#8a5f18;text-transform:uppercase;letter-spacing:.06em")}>Practical guidance</span>
            <h2 id="advisories-title" style={sx("margin:0;font:600 22px/1.2 'IBM Plex Sans',sans-serif;color:#222420")}>{title}</h2>
            {count > 0 && <span style={sx("font:400 13px/1.5 'IBM Plex Sans',sans-serif;color:#64665c")}>Your recipe is valid. These are practical inclusion guidelines, not hard formulation limits.</span>}
          </div>
          <button onClick={v.closeAdvisories} aria-label="Close advisories" style={sx("flex:none;border:0;background:transparent;font:400 24px/1 'IBM Plex Sans',sans-serif;color:#64665c;padding:0 4px")}>×</button>
        </div>
        <div style={sx("flex:1;overflow-y:auto;padding:20px 26px;display:flex;flex-direction:column;gap:14px")}>
          {advisories.map((a, i) => (
            <article key={i} style={sx("background:#fdf6e8;border:1px solid #f0c97f;border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:9px")}>
              <div style={sx("display:flex;align-items:center;gap:8px;font:600 13px/1.3 'IBM Plex Sans',sans-serif;color:#5c4012")}>
                <span style={sx("width:8px;height:8px;background:#c98a1e;transform:rotate(45deg)")} />
                Advisory {i + 1}
              </div>
              <div style={sx("font:500 15px/1.5 'IBM Plex Sans',sans-serif;color:#33240b")}>{a.text}</div>
              <div style={sx("font:400 13px/1.5 'IBM Plex Sans',sans-serif;color:#5c4012")}>{a.note}</div>
              {a.actionable && (
                <div style={sx("display:flex;gap:8px;padding-top:4px;flex-wrap:wrap")}>
                  <button onClick={a.cap} style={sx("font:600 13px/1.2 'IBM Plex Sans',sans-serif;padding:10px 12px;background:#fff;border:1px solid #e8b55a;border-radius:6px;color:#33240b")}>{a.capLabel}</button>
                  <button onClick={a.keep} style={sx("font:500 13px/1.2 'IBM Plex Sans',sans-serif;padding:10px 8px;color:#5c4012;border:0;background:transparent")}>Keep as is</button>
                </div>
              )}
            </article>
          ))}
          {v.hasAdvice && (
            <>
              {count > 0 && <h3 style={sx("margin:10px 0 0;font:600 15px/1.3 'IBM Plex Sans',sans-serif;color:#222420")}>Advice from FeedSport</h3>}
              {v.docAdvice.map((a) => (
                <article key={a.id} style={sx("background:#eef3ee;border:1px solid #c5d8c8;border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:9px")}>
                  <div style={sx("display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap")}>
                    <span style={sx("display:flex;align-items:center;gap:8px;font:600 13px/1.3 'IBM Plex Sans',sans-serif;color:#2f5a3f")}>
                      <span style={sx("width:8px;height:8px;border-radius:50%;background:#2f5a3f")} />
                      {a.author}
                    </span>
                    <span style={sx("font:400 12px/1.3 'IBM Plex Mono',monospace;color:#64665c")}>{a.meta}</span>
                  </div>
                  <div style={sx("font:400 15px/1.55 'IBM Plex Sans',sans-serif;color:#222420;white-space:pre-wrap;overflow-wrap:anywhere")}>{a.body}</div>
                  {a.hasSuggestion && (
                    <button onClick={a.openSuggestion} style={sx("align-self:flex-start;font:600 13px/1.2 'IBM Plex Sans',sans-serif;padding:10px 12px;background:#fff;border:1px solid #2f5a3f;border-radius:6px;color:#2f5a3f")}>Open suggested revision</button>
                  )}
                </article>
              ))}
            </>
          )}
        </div>
      </aside>
    </>
  );
}

function Drawer({ v, d }: V & { d: NonNullable<StudioVals["d"]> }) {
  const [allNutrients, setAllNutrients] = useState(false);
  return (
    <>
      <div onClick={v.closeDrawer} style={sx("position:fixed;inset:0;background:rgba(34,36,32,.38);z-index:20")} />
      <div style={sx("position:fixed;top:0;right:0;bottom:0;width:min(480px,100vw);background:#fff;display:flex;flex-direction:column;box-shadow:-12px 0 40px rgba(0,0,0,.18);z-index:21;animation:fsin .2s ease-out")}>
        <div style={sx("padding:22px 26px 0;display:flex;flex-direction:column;gap:14px")}>
          <div style={sx("display:flex;justify-content:space-between;align-items:flex-start;gap:12px")}>
            <div style={sx("display:flex;flex-direction:column;gap:6px;min-width:0")}>
              <span style={sx("font:600 22px/1.2 'IBM Plex Sans',sans-serif")}>{d.name}</span>
              <span style={sx("font:400 13px/1.3 'IBM Plex Sans',sans-serif;color:#64665c")}>{d.headSub}</span>
            </div>
            <button onClick={v.closeDrawer} aria-label="Close" style={sx("border:0;background:transparent;font:400 24px/1 'IBM Plex Sans',sans-serif;color:#45473f;padding:0 4px")}>×</button>
          </div>
          {d.stats.length > 0 && (
            <div style={sx("display:grid;grid-template-columns:repeat(3,minmax(0,1fr));background:#f6f4ee;border-radius:8px")}>
              {d.stats.map((stat, i) => (
                <div key={stat.label} style={sx(`display:flex;flex-direction:column;gap:5px;padding:10px 12px;${i ? "border-left:1px solid #e2dfd6" : ""}`)}>
                  <span style={sx("font:400 12px/1.2 'IBM Plex Sans',sans-serif;color:#45473f")}>{stat.label}</span>
                  <span style={sx("font:600 17px/1.1 'IBM Plex Sans',sans-serif")}>{stat.value}</span>
                </div>
              ))}
            </div>
          )}
          {d.hasWhy && (
            <div style={sx("display:flex;gap:9px;align-items:baseline;font:400 13px/1.5 'IBM Plex Sans',sans-serif;color:#222420")}>
              <span title={d.whyTitle} style={sx("flex:none;font:500 10px/1 'IBM Plex Mono',monospace;padding:4px 6px;border-radius:4px;background:#e7efe8;color:#2f5a3f;letter-spacing:0.04em")}>WHY</span>
              <span>{d.why}</span>
            </div>
          )}
        </div>
        <div style={sx("flex:1;overflow-y:auto;padding:20px 26px;margin-top:16px;border-top:1px solid #e2dfd6;display:flex;flex-direction:column;gap:24px")}>
          {d.hasRolePicker && (
            <div style={sx("display:flex;flex-direction:column;gap:10px")}>
              <span style={sx(MONO_LABEL)}>Reusable role</span>
              <div style={sx("display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px")}>
                {d.roleOptions.map((role) => (
                  <button key={role.label} onClick={role.pick} style={sx(`text-align:left;border:1px solid ${role.on ? "#2f5a3f" : "#d0cdc3"};box-shadow:${role.on ? "inset 0 0 0 1px #2f5a3f" : "none"};background:${role.on ? "#eef3ee" : "#fff"};padding:10px 12px;border-radius:7px;font:600 13px/1 'IBM Plex Sans',sans-serif;color:#222420`)}>{role.label}</button>
                ))}
              </div>
            </div>
          )}
          {d.showLimits && (
            <div style={sx("display:flex;flex-direction:column;gap:12px")}>
              <div style={sx("display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap")}>
                <span style={sx(MONO_LABEL)}>{d.limitsTitle}</span>
                <span style={sx("font:400 12px/1.3 'IBM Plex Sans',sans-serif;color:#45473f")}>{d.fsHeader}</span>
              </div>
              <div style={sx("display:flex;gap:10px;align-items:flex-end")}>
                {d.showMin && (
                  <label style={sx("flex:1;min-width:0;display:flex;flex-direction:column;gap:6px;font:500 13px/1 'IBM Plex Sans',sans-serif")}>
                    {d.minLabel.replace(" %", "")}
                    <span style={sx("display:flex;align-items:center;padding:0 12px;border:1px solid #d0cdc3;border-radius:7px")}>
                      <input type="number" step="0.1" min="0" value={d.min} onChange={d.onMin} placeholder="0" style={sx("flex:1;min-width:0;border:0;padding:11px 0;font:500 15px/1 'IBM Plex Sans',sans-serif;outline:none")} />
                      <span style={sx("color:#64665c")}>%</span>
                    </span>
                  </label>
                )}
                {d.showMax && (
                  <label style={sx("flex:1;min-width:0;display:flex;flex-direction:column;gap:6px;font:500 13px/1 'IBM Plex Sans',sans-serif")}>
                    {d.maxLabel.replace(" %", "")}
                    <span style={sx("display:flex;align-items:center;padding:0 12px;border:1px solid #d0cdc3;border-radius:7px")}>
                      <input type="number" step="0.1" min="0" value={d.max} onChange={d.onMax} placeholder={d.maxPh === "No limit" ? "none" : d.maxPh} style={sx("flex:1;min-width:0;border:0;padding:11px 0;font:500 15px/1 'IBM Plex Sans',sans-serif;outline:none")} />
                      <span style={sx("color:#64665c")}>%</span>
                    </span>
                  </label>
                )}
                {d.canLock && <button type="button" onClick={d.lock} style={sx("flex:none;border:1px solid #d0cdc3;background:#fff;border-radius:7px;padding:11px 12px;font:600 13px/1.1 'IBM Plex Sans',sans-serif;color:#222420")}>{d.lockLabel}</button>}
              </div>
              <div style={sx("position:relative;height:40px;margin-top:4px")}>
                <div style={sx("position:absolute;left:0;right:0;top:8px;height:6px;background:#e3ebe4;border-radius:3px")} />
                <div style={sx(`position:absolute;left:${d.zl};width:${d.zw};top:8px;height:6px;background:#c9dccd;border-radius:3px`)} />
                {d.hasGuide && <div title={d.guideTxt + " practical guideline"} style={sx(`position:absolute;left:${d.gx};top:2px;height:18px;border-left:2px dashed #c98a1e`)} />}
                {d.fsTxt !== "No" && <div title={d.fsTxt + " FeedSport limit"} style={sx(`position:absolute;left:${d.fx};top:2px;height:18px;width:2px;background:#222420`)} />}
                {d.hasUserMax && <div title={d.userMaxTxt + " your maximum"} style={sx(`position:absolute;left:${d.ux};top:2px;height:18px;width:2px;background:#2f5a3f`)} />}
                {d.inRecipe && <div style={sx(`position:absolute;left:${d.cx};top:3px;width:16px;height:16px;margin-left:-8px;border-radius:50%;background:#2f5a3f;border:3px solid #fff;box-shadow:0 0 0 1px #2f5a3f`)} />}
                <div style={sx("position:absolute;left:0;right:0;top:26px;font:400 11px/1 'IBM Plex Mono',monospace;color:#45473f")}>
                  <span style={sx("position:absolute;left:0")}>0%</span>
                  {d.inRecipe && <span style={sx(`position:absolute;left:${d.cx};transform:translateX(-50%);white-space:nowrap`)}>{d.nowLabel}</span>}
                  <span style={sx("position:absolute;right:0")}>{d.scaleMax}</span>
                </div>
              </div>
              <span style={sx("font:400 12px/1.45 'IBM Plex Sans',sans-serif;color:#64665c")}>
                Scale zooms to this ingredient&apos;s useful range.
                {d.hasUserMax && <> Green line: your maximum {d.userMaxTxt}.</>}
                {d.hasGuide && <> Dashed: practical guideline {d.guideTxt} (advisory).</>}
              </span>
              {d.showHint && <span style={sx("font:400 13px/1.45 'IBM Plex Sans',sans-serif;color:#45473f")}>{d.limitHint}</span>}
            </div>
          )}
          {!d.showLimits && d.limitHint && <span style={sx("font:400 13px/1.45 'IBM Plex Sans',sans-serif;color:#45473f")}>{d.limitHint}</span>}
          {d.showPrice && <div style={sx("display:flex;flex-direction:column;gap:10px")}>
            <span style={sx(MONO_LABEL)}>Price</span>
            <div style={sx("display:flex;gap:10px;align-items:center")}>
              <div style={sx("flex:1;display:flex;align-items:center;gap:8px;padding:0 12px;border:1px solid #d0cdc3;border-radius:7px")}>
                <span style={sx("color:#45473f")}>$</span>
                <input type="number" step="any" min="0" value={d.price} onChange={d.onPrice} placeholder={d.pricePh} aria-label={"Price per " + d.unitWord} style={sx("flex:1;min-width:0;border:0;padding:11px 0;font:500 15px/1 'IBM Plex Sans',sans-serif;outline:none")} />
                <span style={sx("color:#64665c;font:400 13px/1 'IBM Plex Sans',sans-serif")}>/ {d.unitWord === "tonne" ? "t" : "kg"}</span>
              </div>
              <div style={sx("display:flex;background:#f3f0e8;border-radius:7px;padding:3px")}>
                {d.units.map((u) => (
                  <button key={u.label} onClick={u.pick} style={sx(`border:0;padding:8px 11px;border-radius:5px;background:${u.bg};font:600 13px/1 'IBM Plex Sans',sans-serif;color:#222420`)}>{u.label}</button>
                ))}
              </div>
            </div>
            <div style={sx("display:flex;justify-content:space-between;gap:10px;font:400 12px/1.4 'IBM Plex Sans',sans-serif;flex-wrap:wrap")}>
              <span style={sx("display:flex;gap:8px;align-items:center")}>
                <span style={sx(`font:500 10px/1 'IBM Plex Mono',monospace;padding:4px 6px;border-radius:4px;background:${d.tagBg};color:${d.tagFg}`)}>{d.tag}</span>
                <span style={sx("color:#45473f")}>{d.priceConv}</span>
              </span>
              {d.canReset && <button onClick={d.resetPrice} style={sx("border:0;background:transparent;padding:0;color:#2f5a3f;font:500 12px/1.4 'IBM Plex Sans',sans-serif")}>{d.resetLabel}</button>}
            </div>
          </div>}
          {d.premixDetails && (
            <div style={sx("display:flex;flex-direction:column;gap:7px;padding:12px;background:#fdf6e8;border:1px solid #f0c97f;border-radius:7px")}>
              <span style={sx("font:600 11px/1 'IBM Plex Mono',monospace;color:#64665c;text-transform:uppercase")}>Premix use and contribution</span>
              <span style={sx("font:400 12px/1.45 'IBM Plex Sans',sans-serif;color:#45473f")}>{d.premixDetails.application} · {d.premixDetails.permitted}</span>
              <span style={sx("font:500 12px/1.45 'IBM Plex Sans',sans-serif")}>{d.premixDetails.instruction}</span>
              {d.premixDetails.contributions.map((item) => (
                <div key={item.name} style={sx("display:flex;justify-content:space-between;gap:10px;padding-top:6px;border-top:1px solid #ecd8ad;font:400 12px/1.3 'IBM Plex Sans',sans-serif")}>
                  <span>{item.name}</span><span style={sx("font-weight:600")}>{item.prefix}{item.value}</span>
                </div>
              ))}
              <span style={sx("font:400 11px/1.4 'IBM Plex Sans',sans-serif;color:#8a5f18")}>Calculated in complete feed · {d.premixDetails.basis}</span>
            </div>
          )}
          <div style={sx("display:flex;flex-direction:column")}>
            <div style={sx("display:flex;justify-content:space-between;align-items:baseline;padding-bottom:8px")}>
              <span style={sx(MONO_LABEL)}>Nutrients · as fed</span>
              {d.hiddenCount > 0 && <button type="button" onClick={() => setAllNutrients(!allNutrients)} style={sx("border:0;background:transparent;padding:0;font:500 13px/1 'IBM Plex Sans',sans-serif;color:#222420")}>{allNutrients ? "Show fewer" : "Show all " + d.profileAll.length}</button>}
            </div>
            {(allNutrients ? d.profileAll : d.profileShown).map((p) => (
              <div key={p.name} style={sx("display:flex;justify-content:space-between;padding:9px 0;border-top:1px solid #ece8df;font:400 14px/1.2 'IBM Plex Sans',sans-serif")}>
                <span style={sx("color:#222420")}>{p.name}</span>
                <span style={sx(`font-weight:600;color:${p.color}`)}>{p.val}</span>
              </div>
            ))}
            {!allNutrients && d.hiddenNote && <span style={sx("padding-top:9px;border-top:1px solid #ece8df;font:400 12px/1.4 'IBM Plex Sans',sans-serif;color:#64665c")}>{d.hiddenNote}</span>}
          </div>
          {d.source && (
            <div style={sx("display:flex;gap:10px;align-items:baseline;padding:13px 15px;background:#f6f4ee;border-radius:8px;font:400 12px/1.5 'IBM Plex Sans',sans-serif;color:#222420")}>
              <span aria-hidden style={sx(`flex:none;width:7px;height:7px;border-radius:50%;background:${d.source.dot};transform:translateY(-1px)`)} />
              <span>
                <b style={sx("font-weight:600")}>{d.source.label}</b> {d.source.text}
                {d.source.url && <>{" "}<a href={d.source.url} target="_blank" rel="noopener noreferrer" style={sx("color:#222420;text-decoration:underline;text-underline-offset:3px")}>Source ↗</a></>}
              </span>
            </div>
          )}
        </div>
        <div style={sx("padding:16px 26px;border-top:1px solid #e2dfd6;display:flex;flex-direction:column;gap:10px")}>
          {d.hasErr && (
            <span style={sx("display:flex;gap:8px;align-items:center;font:500 13px/1.4 'IBM Plex Sans',sans-serif;color:#a63d2a")}>
              <span style={sx("flex:none;width:8px;height:8px;background:#b2412e")} />
              {d.err}
            </span>
          )}
          <div style={sx("display:flex;gap:10px")}>
            <button onClick={d.remove} style={sx("border:0;background:transparent;font:500 14px/1 'IBM Plex Sans',sans-serif;color:#a63d2a;padding:0 6px")}>{d.removeLabel}</button>
            <button onClick={d.applyOnly} disabled={d.hasErr} style={sx("flex:1;border:1px solid #d0cdc3;background:#fff;font:500 14px/1 'IBM Plex Sans',sans-serif;padding:13px;border-radius:8px;color:#222420")}>{d.applyOnlyLabel}</button>
            {d.showApplyRun && <button onClick={d.applyRun} disabled={d.hasErr} style={sx(`flex:1.4;border:0;background:${d.applyBg};color:#fff;font:600 14px/1 'IBM Plex Sans',sans-serif;padding:13px;border-radius:8px`)}>Apply and re-formulate</button>}
          </div>
          <span style={sx("font:400 12px/1.4 'IBM Plex Sans',sans-serif;color:#64665c")}>{d.footerNote}</span>
        </div>
      </div>
    </>
  );
}

function AddIngredient({ v }: V) {
  return (
    <>
      <div onClick={v.closeAdd} style={sx("position:fixed;inset:0;background:rgba(34,36,32,.38);z-index:30")} />
      <div style={sx("position:fixed;top:10vh;left:0;right:0;margin:0 auto;width:min(520px,94vw);max-height:76vh;background:#fff;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.25);z-index:31;display:flex;flex-direction:column;overflow:hidden;animation:fsin .2s ease-out")}>
        <div style={sx("padding:16px;border-bottom:1px solid #e2dfd6;display:flex;flex-direction:column;gap:10px")}>
          <div style={sx("display:flex;justify-content:space-between;align-items:baseline;gap:10px")}>
            <span style={sx("font:600 17px/1.2 'IBM Plex Sans',sans-serif")}>Add ingredients</span>
            <span style={sx("font:400 12px/1.2 'IBM Plex Sans',sans-serif;color:#64665c")}>Tick as many as you need</span>
          </div>
          <input autoFocus value={v.addQ} onChange={v.onAddQ} placeholder="Search the FeedSport catalogue" style={sx("padding:11px 12px;border:1px solid #d0cdc3;border-radius:8px;font:400 15px/1 'IBM Plex Sans',sans-serif")} />
        </div>
        <div style={sx("overflow-y:auto;display:flex;flex-direction:column;flex:1;min-height:0")}>
          {v.addResults.map((a) => (
            <button key={a.name} onClick={a.toggle} role="checkbox" aria-checked={a.picked} className={hv("row")} style={sx(`border:0;border-bottom:1px solid #ece8df;background:${a.picked ? "#eef3ec" : "#fff"};text-align:left;display:flex;align-items:center;gap:12px;padding:13px 16px;color:#222420`)}>
              <span style={sx(`flex:none;width:18px;height:18px;border-radius:4px;border:1.5px solid ${a.picked ? "#2f5a3f" : "#b5b2a8"};background:${a.picked ? "#2f5a3f" : "#fff"};color:#fff;display:flex;align-items:center;justify-content:center;font:700 12px/1 'IBM Plex Sans',sans-serif`)}>{a.picked ? "✓" : ""}</span>
              <span style={sx("display:flex;flex-direction:column;gap:3px")}>
                <span style={sx("font:500 15px/1.2 'IBM Plex Sans',sans-serif")}>{a.name}</span>
                <span style={sx(`font:400 12px/1.2 'IBM Plex Sans',sans-serif;color:${a.subColor}`)}>{a.sub}</span>
              </span>
            </button>
          ))}
          {v.addEmpty && <div style={sx("padding:16px;font:400 14px/1.4 'IBM Plex Sans',sans-serif;color:#64665c")}>Nothing matches. Everything in the catalogue may already be in your list.</div>}
        </div>
        <div style={sx("padding:12px 16px;border-top:1px solid #e2dfd6;display:flex;justify-content:space-between;align-items:center;gap:10px")}>
          {v.addPickN > 0 ? <button onClick={v.clearAddPick} style={sx("border:0;background:transparent;font:500 13px/1 'IBM Plex Sans',sans-serif;color:#64665c;padding:0")}>Clear {v.addPickN} selected</button> : <span style={sx("font:400 13px/1 'IBM Plex Sans',sans-serif;color:#64665c")}>None selected</span>}
          <div style={sx("display:flex;gap:10px")}>
            <button onClick={v.closeAdd} style={sx("border:1px solid #d0cdc3;background:#fff;font:500 14px/1 'IBM Plex Sans',sans-serif;padding:11px 14px;border-radius:8px;color:#222420")}>Cancel</button>
            <button onClick={v.addPicked} disabled={v.addPickN === 0} style={sx(`border:0;background:${v.addPickN ? "#2f5a3f" : "#a9b8ad"};color:#fff;font:600 14px/1 'IBM Plex Sans',sans-serif;padding:11px 16px;border-radius:8px`)}>{v.addCta}</button>
          </div>
        </div>
      </div>
    </>
  );
}

const RULE_COLS = "display:grid;grid-template-columns:minmax(0,1.6fr) 0.8fr 0.8fr 1fr 1fr;gap:12px";

function Rules({ v }: V) {
  return (
    <>
      <div onClick={v.closeRules} style={sx("position:fixed;inset:0;background:rgba(34,36,32,.38);z-index:30")} />
      <div style={sx("position:fixed;top:6vh;left:0;right:0;margin:0 auto;width:min(860px,96vw);max-height:88vh;background:#fff;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.25);z-index:31;display:flex;flex-direction:column;overflow:hidden;animation:fsin .2s ease-out")}>
        <div style={sx("padding:18px 22px;border-bottom:1px solid #e2dfd6;display:flex;justify-content:space-between;align-items:flex-start;gap:12px")}>
          <div style={sx("display:flex;flex-direction:column;gap:5px")}>
            <span style={sx("font:600 19px/1.2 'IBM Plex Sans',sans-serif")}>Rules · {v.prog.name}</span>
            <span style={sx("font:400 13px/1.4 'IBM Plex Sans',sans-serif;color:#64665c")}>Requirements are hard limits from {v.prog.source}{v.rulesEditable ? ". An override replaces the programme minimum for this formulation only and is shown on every report." : ", applied as published. Nothing is relaxed to make a recipe fit."}</span>
          </div>
          <button onClick={v.closeRules} aria-label="Close" style={sx("border:0;background:transparent;font:400 24px/1 'IBM Plex Sans',sans-serif;color:#64665c")}>×</button>
        </div>
        <div style={sx("overflow:auto")}>
          <div style={sx("min-width:640px")}>
            <div style={sx(`${RULE_COLS};padding:10px 22px;font:500 11px/1 'IBM Plex Mono',monospace;color:#64665c;text-transform:uppercase;letter-spacing:0.04em;background:#faf8f3`)}>
              <span>Nutrient</span>
              <span style={sx("text-align:right")}>Prog. min</span>
              <span style={sx("text-align:right")}>{v.rulesEditable ? "Prog. max" : ""}</span>
              {v.rulesEditable ? <span>Your min</span> : <span />}
              <span>Type</span>
            </div>
            {v.rules.map((r) => (
              <div key={r.name} style={sx(`${RULE_COLS};padding:10px 22px;border-top:1px solid #ece8df;font:400 14px/1.2 'IBM Plex Sans',sans-serif;align-items:center;background:${r.bg}`)}>
                <span>{r.name}</span>
                <span style={sx(`text-align:right;color:${r.minColor};text-decoration:${r.minDeco}`)}>{r.pmin}</span>
                <span style={sx("text-align:right")}>{r.pmax}</span>
                {r.editable && <input type="number" step="any" value={r.ov} onChange={r.onOv} placeholder="—" style={sx("width:100px;padding:7px 9px;border:1px solid #d0cdc3;border-radius:6px;font:500 14px/1 'IBM Plex Sans',sans-serif")} />}
                {r.notEditable && <span />}
                <span style={sx("font-size:13px;color:#45473f")}>{r.type}</span>
              </div>
            ))}
            <div style={sx("padding:14px 22px;border-top:1px solid #e2dfd6;display:flex;flex-direction:column;gap:6px;font:400 13px/1.5 'IBM Plex Sans',sans-serif;color:#45473f")}>
              <span style={sx("font-weight:600;color:#222420")}>Practical guidelines (advisory)</span>
              <span>{v.guideText}</span>
            </div>
          </div>
        </div>
        <div style={sx("padding:14px 22px;border-top:1px solid #e2dfd6;display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap")}>
          {v.rulesEditable ? <button onClick={v.resetOverrides} style={sx("border:0;background:transparent;font:600 13px/1 'IBM Plex Sans',sans-serif;color:#2f5a3f;padding:0")}>Reset all to programme</button> : <span />}
          <div style={sx("display:flex;gap:10px")}>
            <button onClick={v.closeRules} style={sx("border:1px solid #d0cdc3;background:#fff;font:500 14px/1 'IBM Plex Sans',sans-serif;padding:12px 16px;border-radius:8px;color:#222420")}>Done</button>
            <button onClick={v.rulesRun} style={sx("border:0;background:#2f5a3f;color:#fff;font:600 14px/1 'IBM Plex Sans',sans-serif;padding:12px 16px;border-radius:8px")}>Done and re-formulate</button>
          </div>
        </div>
      </div>
    </>
  );
}
