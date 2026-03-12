/**
 * content.js (commented)
 *
 * What this script does (high-level):
 * - Runs only on RateYourMusic artist pages: https://rateyourmusic.com/artist/*
 * - Injects a “[timeline]” link next to the “Members” header
 * - Clicking “[timeline]” toggles an inline panel directly beneath the Members section
 * - The panel renders a timeline graph of members vs years:
 *    - Member rows
 *    - Segmented bars for multiple stints (e.g. 1965-66, 1967-69)
 *    - Role-color “stripes” inside each bar
 *    - A role legend
 * - Theme-aware: attempts to match the page’s effective background/text contrast
 *
 * Most recent “upgrade” intent:
 * - Prefer timeline bounds anchored by the page’s “Formed” and “Disbanded” info fields
 *   so the axis reflects the band’s actual active span.
 * - If “Disbanded” exists, clamp the timeline end (and clamp discography markers) so
 *   archival/posthumous releases do NOT extend the chart past disbanding.
 * - If no “Disbanded”, show “Now” as the axis end label.
 * - Strip year-like tokens from roles aggressively so years don’t become “instruments”.
 */

(() => {
    "use strict";

    // Runs only on https://rateyourmusic.com/artist/*
    if (!/^https:\/\/rateyourmusic\.com\/artist\//.test(location.href)) return;

    const STYLE_ID = "rymmt-style";
    const PANEL_ID = "rymmt-panel";
    const LINK_CLASS = "rymmt-link";

    // Role canonicalization: reduce obvious variants so colors stay stable
    // e.g. "vox" and "vocal" → "vocals", "synth" → "keyboards", etc.
    const ROLE_CANON = [
        // --- Vocals ---
        { key: "vocals", match: [/^vocals?$/i] },
        { key: "backing vocals", match: [/^backing vocals?$/i, /background vocals?/i] },
        { key: "rap", match: [/^rap$/i, /rapper/i] },

        // --- Guitar ---
        { key: "guitar", match: [/^guitar$/i, /lead guitar/i] },
        { key: "rhythm guitar", match: [/^rhythm guitar$/i] },
        { key: "bass", match: [/^bass$/i, /bass guitar/i] },
        { key: "piccolo bass", match: [/^piccolo bass$/i] },

        // --- Keyboards ---
        { key: "keyboards", match: [/^keyboards?$/i] },
        { key: "piano", match: [/^piano$/i] },
        { key: "toy piano", match: [/^toy piano$/i] },
        { key: "synthesizer", match: [/^synthesizer$/i, /^synth$/i] },
        { key: "analogue synthesizer", match: [/analogue synthesizer/i, /analog synthesizer/i] },
        { key: "ondes martenot", match: [/ondes\s*martenot/i] },
        { key: "sampler", match: [/^sampler$/i] },
        { key: "laptop", match: [/^laptop$/i] },
        { key: "glockenspiel", match: [/^glockenspiel$/i] },

        // --- Drums & Percussion ---
        { key: "drums", match: [/^drums?$/i] },
        { key: "percussion", match: [/^percussion$/i] },
        { key: "congas", match: [/^congas?$/i] },
        { key: "bongos", match: [/^bongos?$/i] },
        { key: "timbales", match: [/^timbales?$/i] },

        // --- Brass & Woodwinds ---
        { key: "saxophone", match: [/^saxophone$/i, /\bsax\b/i] },
        { key: "trumpet", match: [/^trumpet$/i] },
        { key: "trombone", match: [/^trombone$/i] },
        { key: "flute", match: [/^flute$/i] },

        // --- Production ---
        { key: "producer", match: [/^producer$/i] },
        { key: "orchestration", match: [/orchestration/i] },
        { key: "effects", match: [/^effects?$/i] },
    ];

    // Normalize Unicode dash variants to a plain "-"
    function normalizeDashes(s) {
        return String(s || "").replace(/[–—−]/g, "-");
    }

    // true for: "1970", "1970-71", "1965-1969", "1966-67", "1975-76", etc
    // Used to identify year tokens so they can be dropped from roles.
    function isYearLikeToken(token) {
        const t = normalizeDashes(token).trim();

        // Pure year
        if (/^\d{4}$/.test(t)) return true;

        // Year range with 4-digit start, and 2- or 4-digit end: 1966-67, 1965-1969
        if (/^\d{4}\s*-\s*(\d{2}|\d{4})$/.test(t)) return true;

        // Sometimes wiki-ish text has comma-separated or spaced variants,
        // we only evaluate token here.
        return false;
    }

    // Remove empty tokens, year-like tokens, and all-numeric tokens from role arrays.
    function sanitizeRoles(rawRoles) {
        const out = [];
        for (const r of rawRoles || []) {
            const t = String(r || "").trim();
            if (!t) continue;
            if (isYearLikeToken(t)) continue; // <-- drop year tokens
            if (/^\d+$/.test(t)) continue; // <-- extra safety: drop all-numeric
            out.push(t);
        }
        return out;
    }

    function ensureStyles() {
        // Styles are packaged in rymmt.css and loaded via manifest.json (content_scripts[].css).
        // Kept as a no-op for backwards compatibility.
    }

    // Basic helpers for theme detection (find “effective” background)
    function isTransparent(color) {
        if (!color) return true;
        return color === "transparent" || color === "rgba(0, 0, 0, 0)";
    }

    // Walk up DOM to find first non-transparent background color.
    function getEffectiveBackgroundColor(el) {
        let cur = el;
        for (let i = 0; i < 25 && cur; i++) {
            const bg = window.getComputedStyle(cur).backgroundColor;
            if (!isTransparent(bg)) return bg;
            cur = cur.parentElement;
        }
        return window.getComputedStyle(document.body).backgroundColor || "rgb(255,255,255)";
    }

    function parseRgb(rgb) {
        const m = (rgb || "").match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
        if (!m) return { r: 255, g: 255, b: 255 };
        return { r: +m[1], g: +m[2], b: +m[3] };
    }

    // Relative luminance for contrast decisions.
    function luminance({ r, g, b }) {
        const srgb = [r, g, b].map((v) => {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
    }

    // Apply CSS vars to panel so its UI harmonizes with page theme.
    function applyRymThemeVars(panelEl, headerEl) {
        const bg = getEffectiveBackgroundColor(headerEl || panelEl);
        const rgb = parseRgb(bg);
        const isDark = luminance(rgb) < 0.35;

        // Pull a readable text color from page styles
        const bodyColor = window.getComputedStyle(document.body).color || "rgb(220,220,220)";
        const hdrColor = headerEl ? window.getComputedStyle(headerEl).color : bodyColor;

        panelEl.style.setProperty("--rymmt-panel-bg", bg);
        panelEl.style.setProperty("--rymmt-track-bg", bg);

        panelEl.style.setProperty("--rymmt-panel-text", hdrColor);
        panelEl.style.setProperty("--rymmt-track-border", "rgba(255,255,255,0.55)");
        panelEl.style.setProperty("--rymmt-panel-border", "rgba(255,255,255,0.45)");
        panelEl.style.setProperty("--rymmt-muted-text", "rgba(255,255,255,0.85)");

        if (!isDark) {
            panelEl.style.setProperty("--rymmt-track-border", "rgba(0,0,0,0.35)");
            panelEl.style.setProperty("--rymmt-panel-border", "rgba(0,0,0,0.35)");
            panelEl.style.setProperty("--rymmt-muted-text", "rgba(0,0,0,0.65)");
            panelEl.style.setProperty("--rymmt-tick-color", "rgba(0,0,0,0.18)");
            panelEl.style.setProperty("--rymmt-tick-major-color", "rgba(0,0,0,0.30)");
            panelEl.style.setProperty("--rymmt-marker-halo", "rgba(255,255,255,0.55)");
            panelEl.style.setProperty("--rymmt-bar-outline", "rgba(0,0,0,0.35)");
            panelEl.style.setProperty("--rymmt-album-color", "#000000");
            panelEl.style.setProperty("--rymmt-live-color", "#666666");
        } else {
            panelEl.style.setProperty("--rymmt-album-color", "#ffffff");
            panelEl.style.setProperty("--rymmt-live-color", "#bdbdbd");
        }

        panelEl.dataset.rymmtIsDark = isDark ? "1" : "0";
    }
    function hasSufficientTimelineData(membersHeaderEl) {
        const membersContent = membersHeaderEl ? findAdjacentInfoContent(membersHeaderEl) : null;
        if (!membersContent) return false;

        const membersText = membersContent.textContent || "";
        const parsed = parseMembersFromText(membersText);

        // "Sufficient" means: at least one explicit stint OR at least one release marker exists.
        const hasAnyExplicitStints = (parsed.members || []).some(
            (m) => Array.isArray(m.stints) && m.stints.length > 0
        );

        // Discography markers (album/ep/single/live) — ignore post-disband inside extractor already
        const bounds = readFormedAndDisbanded(document);
        const disbandedYear = yearOf(bounds.disbandedDate);

        const markers = extractDiscographyMarkersFromDOM(disbandedYear) || {};
        const anyMarkers =
            (Array.isArray(markers.album) && markers.album.length > 0) ||
            (Array.isArray(markers.ep) && markers.ep.length > 0) ||
            (Array.isArray(markers.single) && markers.single.length > 0) ||
            (Array.isArray(markers.live) && markers.live.length > 0);

        return hasAnyExplicitStints || anyMarkers;
    }

    // Find the “Members” info header.
    function findMembersInfoContent() {
        // Find the "Members" header, then its corresponding info_content container.
        const headers = Array.from(document.querySelectorAll(".info_hdr"));
        const membersHdr = headers.find((h) => /^\s*Members\b/i.test(h.textContent || ""));
        if (!membersHdr) return null;

        // On RYM, the content is typically the next sibling.
        const content = membersHdr.nextElementSibling;
        if (content && content.classList.contains("info_content")) return content;

        // Fallback: search near header
        return membersHdr.parentElement?.querySelector(".info_content") || null;
    }

    function insertPanelAfterLastRenderedTextArtist(panelEl, headerEl) {
        if (!(panelEl instanceof Element)) return false;

        // Prefer using the specific Members header we clicked from
        const infoContent = headerEl ? findAdjacentInfoContent(headerEl) : findMembersInfoContent();
        if (!infoContent) return false;

        const rendered = Array.from(infoContent.querySelectorAll("span.rendered_text"))
            .filter((span) => span.querySelector("a.artist"));

        const anchor = rendered[rendered.length - 1];
        if (!anchor) return false;

        anchor.insertAdjacentElement("afterend", panelEl);
        return true;
    }

    // Given an info header, find its next adjacent info_content block.
    function findAdjacentInfoContent(headerEl) {
        let el = headerEl;
        for (let i = 0; i < 10; i++) {
            el = el.nextElementSibling;
            if (!el) break;
            if (el.classList && el.classList.contains("info_content")) return el;
            if (el.classList && el.classList.contains("info_hdr")) break;
        }
        return null;
    }

    // Collapse role names into canonical buckets for stable coloring.
    function canonicalRole(role) {
        const r = (role || "").trim().toLowerCase();
        for (const entry of ROLE_CANON) {
            if (entry.match.some((rx) => rx.test(r))) return entry.key;
        }
        return r;
    }

    // Stable color assignment per canonical role (HSL palette, deterministic).
    // Note: this is *different* from the older colorForRole() system later in file.
    function roleToCssVarKey(canonKey) {
        // canonKey is already lowercase from canonicalRole()
        // convert spaces -> hyphen to match --rymmt-role-*
        return `--rymmt-role-${canonKey.replace(/\s+/g, "-")}`;
    }

    function getRoleColor(role, isDarkTheme) {
        const key = canonicalRole(role);

        // For hard-coded/known roles, return the CSS variable reference.
        // (The var exists in rymmt.css.)
        const known = new Set([
            "keyboards",
            "guitar",
            "rhythm guitar",
            "vocals",
            "backing vocals",
            "congas",
            "drums",
            "timbales",
            "saxophone",
            "bongos",
            "flute",
            "piccolo bass",
            "bass",
            "trumpet",
            "trombone",
            "percussion",
            "rap",
            "producer",
            "piano",
            "toy piano",
            "analogue synthesizer",
            "ondes martenot",
            "laptop",
            "glockenspiel",
            "orchestration",
            "effects",
            "synthesizer",
            "sampler",
        ]);

        if (known.has(key)) {
            return `var(${roleToCssVarKey(key)})`;
        }

        // Unknown roles: deterministic hash -> HSL
        let h = 0;
        for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
        const hue = h % 360;

        const sat = isDarkTheme ? 70 : 65;
        const light = isDarkTheme ? 45 : 40;
        return `hsl(${hue} ${sat}% ${light}%)`;
    }

    /**
     * Parse members from the “Members” info_content text.
     *
     * Expected pattern (roughly):
     *   Name (role, role, 1965-66, 1967-69), Other (role, 1970), ...
     *
     * Returns:
     * {
     *   members: [{name, roles: string[], stints: [{start,end}]}],
     *   maxYearMentioned: number|null
     * }
     */
    function parseMembersFromText(text) {
        const src = (text || "").replace(/\s+/g, " ").trim();
        const re = /([^()]+?)\s*\(([^)]*)\)\s*(?:,|$)/g;

        const map = new Map();
        let maxYearMentioned = null;

        function upMax(y) {
            if (Number.isFinite(y)) maxYearMentioned = Math.max(maxYearMentioned ?? y, y);
        }

        function parseYearToken(tok) {
            const t = normalizeDashes(tok).trim();
            const curYear = new Date().getFullYear();

            // 1970
            if (/^\d{4}$/.test(t)) {
                const y = parseInt(t, 10);
                return { start: y, end: y };
            }

            // 1966-67 or 1965-1969 or 1970-present
            const m = t.match(/^(\d{4})\s*-\s*(present|\d{2}|\d{4})$/i);
            if (m) {
                const start = parseInt(m[1], 10);
                let end;
                const rhs = m[2].toLowerCase();
                if (rhs === "present") end = curYear;
                else if (rhs.length === 2) end = Math.floor(start / 100) * 100 + parseInt(rhs, 10);
                else end = parseInt(rhs, 10);
                return { start, end };
            }

            return null;
        }

        let m;
        while ((m = re.exec(src)) !== null) {
            const name = (m[1] || "").trim();
            let inside = (m[2] || "").trim();
            if (!name) continue;

            // Split parentheses content by commas, then classify tokens as:
            // - stints (year tokens)
            // - roles (everything else)
            const tokens = inside
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);

            const stints = [];
            const roles = [];

            for (const tok of tokens) {
                const y = parseYearToken(tok);
                if (y) {
                    stints.push(y);
                    upMax(y.end);
                } else {
                    roles.push(tok);
                }
            }

            const cleanRoles = sanitizeRoles(roles);

            // If no explicit stints, we still want something sensible:
            // infer a stint if we can from maxYearMentioned later, else skip.
            // (This is why buildGraph has fallback behavior too.)
            const rec = map.get(name) || {
                name,
                roles: [],
                stints: [],
                raw: `${name} (${inside})`,
            };

            // Merge roles (unique-ish)
            for (const r of cleanRoles) {
                if (!rec.roles.includes(r)) rec.roles.push(r);
            }

            // Merge stints
            for (const s of stints) {
                if (!rec.stints.some((t) => t.start === s.start && t.end === s.end)) {
                    rec.stints.push(s);
                }
            }

            map.set(name, rec);
        }

        return { members: Array.from(map.values()), maxYearMentioned };
    }

    // -----------------------------
    // Discography helpers (Album / Live Album years)
    // -----------------------------

    function findDiscoTypeContainerByHeaderLabel(label) {
        // Find a discography header matching label, then return its parent container.
        const headers = document.querySelectorAll(".disco_header, .disco_header_type, .disco_header_label");
        for (const h of headers) {
            const t = (h.textContent || "").trim();
            if (t === label) {
                // Walk up to something that contains items
                let cur = h;
                for (let i = 0; i < 10 && cur; i++) {
                    if (cur.classList && cur.classList.contains("disco_type_container")) return cur;
                    cur = cur.parentElement;
                }
                return h.parentElement;
            }
        }

        // Fallback: old markup uses <h3>Album</h3> style sometimes
        const h3s = document.querySelectorAll("h3, h4");
        for (const h of h3s) {
            const t = (h.textContent || "").trim();
            if (t === label) return h.parentElement;
        }
        return null;
    }

    function extractYearsFromDiscoContainer(containerEl) {
        if (!containerEl) return [];
        const years = [];

        // RYM discography items often contain a year span in an element like:
        // <span class="disco_release_date">1986</span> (or similar)
        const dateEls = containerEl.querySelectorAll(
            ".disco_release_date, .disco_date, .disco_year, .disco_release_info"
        );

        for (const el of dateEls) {
            const txt = normalizeDashes(el.textContent || "");
            const m = txt.match(/\b(19|20)\d{2}\b/g);
            if (m) {
                for (const yy of m) years.push(parseInt(yy, 10));
            }
        }

        // More brute-force fallback: scan links/titles
        if (!years.length) {
            const txt = normalizeDashes(containerEl.textContent || "");
            const m = txt.match(/\b(19|20)\d{2}\b/g);
            if (m) for (const yy of m) years.push(parseInt(yy, 10));
        }

        return years;
    }

    function uniqueSorted(nums) {
        const s = new Set(nums.filter((n) => Number.isFinite(n)));
        return Array.from(s.values()).sort((a, b) => a - b);
    }

    // -----------------------------
    // Formed / Disbanded extraction
    // -----------------------------

    function extractFirstYearFromText(s) {
        const m = String(s || "").match(/\b(19|20)\d{2}\b/);
        return m ? parseInt(m[0], 10) : null;
    }

    // Read “Formed” and “Disbanded” from artist info fields (.info_hdr / .info_content)
    // NOTE: Returns *dates* (or null), not plain numeric years.
    function readFormedAndDisbanded(containerRoot) {
        const root = containerRoot || document;
        const infoHeaders = Array.from(root.querySelectorAll(".info_hdr"));
        const result = { formedDate: null, disbandedDate: null };

        function findInfoContentUnderHeader(hdrEl) {
            // Some pages have extra nodes between hdr/content; scan forward until:
            // - we hit .info_content (success)
            // - we hit another .info_hdr (stop)
            let el = hdrEl;
            for (let i = 0; i < 12; i++) {
                el = el.nextElementSibling;
                if (!el) return null;
                if (el.classList?.contains("info_content")) return el;
                if (el.classList?.contains("info_hdr")) return null;
            }
            return null;
        }

        function extractYear(text) {
            const m = String(text || "").match(/\b(19|20)\d{2}\b/);
            return m ? parseInt(m[0], 10) : null;
        }

        for (const h of infoHeaders) {
            const label = (h.textContent || "").trim().toLowerCase();
            if (!label) continue;

            const contentEl = findInfoContentUnderHeader(h);
            if (!contentEl) continue;

            const year = extractYear(contentEl.textContent);
            if (!Number.isFinite(year)) continue;

            // Don’t rely on Date parsing of "March 1976" etc — just anchor to the year.
            const d = new Date(year, 0, 1);

            if (label === "formed") result.formedDate = d;
            if (label === "disbanded") result.disbandedDate = d;

            // Optional: accept common variants without being too fuzzy
            if (!result.disbandedDate && (label.includes("disband") || label.includes("split")))
                result.disbandedDate = d;
            if (!result.formedDate && label.includes("form")) result.formedDate = d;
        }

        return result;
    }

    // -----------------------------
    // Older color mapping functions
    // -----------------------------

    // Determine a stable role palette from canonical role names.
    // This is used mainly for the legend (and sometimes bars).
    function colorForRole(role) {
        const r = canonicalRole(role);
        if (r === "vocals") return "#ff4d6d";
        if (r === "guitar") return "#22c55e";
        if (r === "bass") return "#3b82f6";
        if (r === "drums") return "#f59e0b";
        if (r === "percussion") return "#fb7185";
        if (r === "keyboards") return "#a855f7";
        if (r === "harmonica") return "#eab308";
        if (r === "sitar") return "#84cc16";

        // Deterministic fallback
        let hash = 0;
        for (let i = 0; i < r.length; i++) hash = (hash * 33 + r.charCodeAt(i)) >>> 0;
        const hue = hash % 360;
        return `hsl(${hue} 70% 45%)`;
    }

    // -----------------------------
    // Graph builder
    // -----------------------------

    function buildTicksHtml(axisMin, axisMax) {
        // Build vertical tick marks across the track.
        // (Major ticks every 5 years, minor ticks every 1 year.)
        const total = axisMax - axisMin || 1;
        const years = [];
        for (let y = axisMin; y <= axisMax; y++) years.push(y);

        const html = years
            .map((y) => {
                const left = ((y - axisMin) / total) * 100;
                const major = y % 5 === 0;
                const cls = major ? "rymmt-tick rymmt-tick-major" : "rymmt-tick";
                return `<div class="${cls}" style="left:${left}%"></div>`;
            })
            .join("");

        return html;
    }

    // NOTE: There is a second ticks builder later. This duplication is a known fragile spot.
    function buildTicksHtml2(axisMin, axisMax) {
        const total = axisMax - axisMin || 1;
        const years = [];
        for (let y = axisMin; y <= axisMax; y++) years.push(y);

        return years
            .map((y) => {
                const left = ((y - axisMin) / total) * 100;
                const major = y % 5 === 0;
                return `<div class="${major ? "rymmt-tick rymmt-tick-major" : "rymmt-tick"
                    }" style="left:${left}%"></div>`;
            })
            .join("");
    }

    function buildMarkersOverlayHtml(axisMin, axisMax, markers) {
        const m = markers || {};
        const album = Array.isArray(m.album) ? m.album : [];
        const live = Array.isArray(m.live) ? m.live : [];
        const ep = Array.isArray(m.ep) ? m.ep : [];
        const single = Array.isArray(m.single) ? m.single : [];

        const total = axisMax - axisMin || 1;

        function linesFor(list, cls) {
            return list
                .filter((x) => x && Number.isFinite(x.year))
                .filter((x) => x.year >= axisMin && x.year <= axisMax)
                .map((x) => {
                    const left = ((x.year - axisMin) / total) * 100;
                    const title = x.title ? `${x.year} — ${x.title}` : String(x.year);

                    // If you stored URLs on markers, preserve them for clickability
                    const inner = x.url
                        ? `<a class="rymmt-marker ${cls}" href="${escapeHtml(x.url)}" target="_blank" rel="noopener noreferrer" style="left:${left}%"></a>`
                        : `<div class="rymmt-marker ${cls}" style="left:${left}%" title="${escapeHtml(title)}"></div>`;

                    // If it's <a>, title attribute doesn't exist above, so add it here:
                    return x.url
                        ? `<a class="rymmt-marker ${cls}" href="${escapeHtml(x.url)}" target="_blank" rel="noopener noreferrer" style="left:${left}%" title="${escapeHtml(title)}"></a>`
                        : inner;
                })
                .join("");
        }

        // Uses your existing CSS: .rymmt-markers + .rymmt-marker (+ .live)
        // We'll add ep/single classes in CSS in Option B below if you want distinct colors.
        return `<div class="rymmt-markers">
    ${linesFor(album, "album")}
    ${linesFor(live, "live")}
    ${linesFor(ep, "ep")}
    ${linesFor(single, "single")}
  </div>`;
    }

    function buildGraph(container, members, opts) {

        const isDarkTheme = container?.dataset?.rymmtIsDark === "1";

        function buildMarkersHtml(axisMin, axisMax, markersByType) {
            const total = axisMax - axisMin || 1;
            const m = markersByType || {};
            const pieces = [];

            function add(year, cls, title) {
                if (!Number.isFinite(year)) return;
                if (year < axisMin || year > axisMax) return;
                const left = ((year - axisMin) / total) * 100;
                pieces.push(
                    `<div class="rymmt-marker ${cls}" style="left:${left}%;" title="${escapeHtml(title)}"></div>`
                );
            }

            for (const y of (m.album || [])) add(y, "album", `Album: ${y}`);
            for (const y of (m.live || [])) add(y, "live", `Live Album: ${y}`);
            for (const y of (m.single || [])) add(y, "single", `Single: ${y}`);
            for (const y of (m.ep || [])) add(y, "ep", `EP: ${y}`);

            return `<div class="rymmt-markers">${pieces.join("")}</div>`;
        }
        // opts:
        //  - albumYears: number[]
        //  - liveYears: number[]
        //  - formedYear: number (int)
        //  - endYear: number (int)
        //  - disbandedYear: number (int)
        opts = opts || {};
        ensureStyles();

        // Compute axis bounds:
        // Preferred:
        //   axisMin = formedYear if available
        //   axisMax = disbandedYear if present else opts.endYear or current year
        //
        // Fallback:
        //   infer from member stints / discography years
        const nowYear = new Date().getFullYear();

        // ANT: formedYear/disbandedYear may be undefined due to mismatch
        // in renderIntoPanel destructuring (see comment there).
        const formedYear = Number.isFinite(opts.formedYear) ? opts.formedYear : null;

        const disbandedYear = Number.isFinite(opts.disbandedYear) ? opts.disbandedYear : null;

        let axisMin = formedYear;
        let axisMax = disbandedYear || (Number.isFinite(opts.endYear) ? opts.endYear : nowYear);

        // Gather all years mentioned for fallback bounds (members + releases)
        const allYears = [];
        if (Array.isArray(opts.albumYears)) allYears.push(...opts.albumYears);
        if (Array.isArray(opts.liveYears)) allYears.push(...opts.liveYears);

        for (const m of members || []) {
            if (Array.isArray(m.stints)) {
                for (const s of m.stints) {
                    if (Number.isFinite(s.start)) allYears.push(s.start);
                    if (Number.isFinite(s.end)) allYears.push(s.end);
                }
            }
        }

        if (!Number.isFinite(axisMin)) {
            axisMin = allYears.length ? Math.min(...allYears) : nowYear - 60;
        }
        if (!Number.isFinite(axisMax)) {
            axisMax = allYears.length ? Math.max(...allYears) : nowYear;
        }

        // Safety: ensure min <= max
        if (axisMin > axisMax) {
            const tmp = axisMin;
            axisMin = axisMax;
            axisMax = tmp;
        }

        // Normalize members:
        // - compute startYear/endYear from stints if missing
        // - ensure stints are clamped into axis range
        const normalizedMembers = (members || []).map((m) => {
            const stints = Array.isArray(m.stints) ? m.stints.slice() : [];

            let startYear = null;
            let endYear = null;

            if (stints.length) {
                startYear = Math.min(...stints.map((s) => s.start).filter(Number.isFinite));
                endYear = Math.max(...stints.map((s) => s.end).filter(Number.isFinite));
            }

            if (!Number.isFinite(startYear)) startYear = axisMin;
            if (!Number.isFinite(endYear)) endYear = axisMax;

            // Clamp stints to axis range
            const clampedStints = stints
                .map((s) => ({
                    start: Math.max(axisMin, Number.isFinite(s.start) ? s.start : axisMin),
                    end: Math.min(axisMax, Number.isFinite(s.end) ? s.end : axisMax),
                }))
                .filter((s) => s.end >= s.start);

            return {
                ...m,
                roles: Array.isArray(m.roles) ? m.roles : [],
                stints: clampedStints.length ? clampedStints : stints,
                startYear,
                endYear,
            };
        });

        // Role legend: collect unique roles and map to colors
        const allRoles = new Set();
        normalizedMembers.forEach((m) => (m.roles || []).forEach((r) => allRoles.add(r)));
        const roleList = Array.from(allRoles.values()).sort((a, b) => a.localeCompare(b));

        const legendHtml = roleList
            .map((r) => {
                const c = getRoleColor(r, isDarkTheme);
                return `<span class="rymmt-role-chip">
      <span class="rymmt-role-swatch" style="background:${c}"></span>
      ${escapeHtml(capitalizeWords(r))}
    </span>`;
            })
            .join("");

        // Build ticks (duplicated logic exists; this uses buildTicksHtml2 currently)
        // NOTE: This is one of the “duplicate tick calculations” you called out.
        const ticksHtml = buildTicksHtml2(axisMin, axisMax);

        // Title forced to "Timeline"
        const titleHtml = `<div class="rymmt-graph-title">Timeline</div>`;

        // Total span used to compute left/width for bars.
        const total = axisMax - axisMin || 1;

        // Row markup per member
        const rowsHtml = normalizedMembers
            .map((mem) => {
                // Role stripes rendered inside each stint bar segment
                const stripes =
                    mem.roles && mem.roles.length
                        ? mem.roles
                            .map(
                                (r) =>
                                    `<div class="rymmt-stripe"
                 title="${escapeHtml(r)}"
                 style="background:${getRoleColor(r, isDarkTheme)}">
             </div>`
                            )
                            .join("")
                        : `<div class="rymmt-stripe rymmt-stripe-neutral"></div>`;

                // If member has explicit stints, draw each as its own bar segment.
                // If no stints at all, treat as spanning full axis.
                const stints =
                    Array.isArray(mem.stints) && mem.stints.length
                        ? mem.stints
                        : [
                            {
                                start: Number.isFinite(mem.startYear) ? mem.startYear : axisMin,
                                end: Number.isFinite(mem.endYear) ? mem.endYear : axisMax,
                            },
                        ];

                const bars = stints
                    .map((st) => {
                        const s = Number.isFinite(st.start) ? st.start : axisMin;
                        const e = Number.isFinite(st.end) ? st.end : axisMax;

                        let left = ((s - axisMin) / total) * 100;
                        let width = ((e - s) / total) * 100;

                        // clamp + minimum visible width
                        if (!Number.isFinite(left)) left = 0;
                        if (!Number.isFinite(width) || width <= 0) width = 0.8;
                        if (left < 0) left = 0;
                        if (left > 100) left = 100;
                        if (width > 100) width = 100;

                        return `<div class="rymmt-bar" style="left:${left}%; width:${width}%;" title="${escapeHtml(mem.raw)}">${stripes}</div>`;
                    })
                    .join("");

                // NOTE: ticksHtml is injected into every row’s track
                // (same ticks repeated per row).
                return `<div class="rymmt-row">
  <div class="rymmt-name">${escapeHtml(mem.name)}</div>
  <div class="rymmt-track">${ticksHtml}${bars}</div>
</div>`;
            })
            .join("\n");

        const markersOverlayHtml = buildMarkersOverlayHtml(axisMin, axisMax, opts.markers);

        // Axis: compute nice labels; prefer formed/disbanded if present
        // NOTE: This block *re-derives* axisMin/axisMax again if falsy.
        // But axisMin/axisMax are numbers; beware that `0` would be falsy
        // (years won’t be 0, so likely OK).
        if (!axisMin || !axisMax) {
            const years = [];
            if (Array.isArray(opts.albumYears)) {
                opts.albumYears.forEach((y) => {
                    if (Number.isFinite(y)) years.push(y);
                });
            }
            if (Array.isArray(opts.liveYears)) {
                opts.liveYears.forEach((y) => {
                    if (Number.isFinite(y)) years.push(y);
                });
            }
            normalizedMembers.forEach((m) => {
                if (m.startYear) years.push(m.startYear);
                if (m.endYear) years.push(m.endYear);
            });
            if (!axisMin) axisMin = years.length ? Math.min(...years) : new Date().getFullYear() - 60;
            if (!axisMax) axisMax = years.length ? Math.max(...years) : new Date().getFullYear();

            // If disbanded present, cap axisMax to exclude post-disband archival releases
            if (disbandedYear) axisMax = disbandedYear;
        }

        // End label: if disbanded exists show numeric year; otherwise "Now"
        const axisEndLabel = Number.isFinite(disbandedYear) ? String(axisMax) : "Now";

        const axisHtml = `<div class="rymmt-axis">
  <div></div>
  <div class="rymmt-axis-track"><span>${escapeHtml(String(axisMin))}</span><span>${escapeHtml(axisEndLabel)}</span></div>
</div>`;

        // Final render
        container.innerHTML = `
    <div class="rymmt-graph">
      ${titleHtml}
      <div class="rymmt-grid rymmt-grid-has-overlay">
  ${markersOverlayHtml}
  ${rowsHtml}
</div>
      ${axisHtml}
      <div class="rymmt-role-legend">${legendHtml}</div>
    </div>
  `;
    }

    // -----------------------------
    // small helpers used above
    // -----------------------------
    function escapeHtml(s) {
        if (s == null) return "";
        return String(s).replace(
            /[&<>"']/g,
            (c) =>
                ({
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#39;",
                })[c]
        );
    }

    function capitalizeWords(s) {
        return String(s)    
            .split(/\s+/)
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");
    }

    /**
     * Render pipeline:
     * - Read members text
     * - Parse members (name/roles/stints)
     * - Read formed/disbanded
     * - Read discography years (Album + Live Album)
     * - Decide endYear:
     *    - If disbanded: end there
     *    - Else: max(latest release, max year mentioned in members, current year)
     * - Clamp discography years to disbandedYear when disbanded exists
     * - buildGraph(...)
     *
     * NOTE: There’s a subtle mismatch here:
     *   readFormedAndDisbanded() returns {formedDate, disbandedDate}
     *   but you destructure { formedYear, disbandedYear } (these properties do not exist).
     * This means formedYear/disbandedYear here are currently undefined.
     * You then pass those undefined values into buildGraph() as opts.
     * buildGraph() re-reads bounds itself anyway, so it still “works” (kinda),
     * but your intent (passing numeric years in opts) is not fulfilled.
     */
    function yearOf(d) {
        // Accepts Date | number | null/undefined
        if (Number.isFinite(d)) return d;
        if (d instanceof Date && !Number.isNaN(d.getTime())) return d.getFullYear();
        return null;
    }

    // -----------------------------
    // Discography markers (Album / Live Album / Single / EP) from #discography
    // Looks for: <span title="DD Month YYYY" class="disco_year_ymd">YYYY</span>
    // -----------------------------

    function normalizeDiscoLabel(label) {
        const t = String(label || "").trim().toLowerCase();

        if (t === "album" || t === "albums") return "album";
        if (t === "live album" || t === "live albums") return "live";
        if (t === "single" || t === "singles") return "single";
        if (t === "ep" || t === "eps") return "ep";

        return null; // ignore everything else (compilations, appears on, etc.)
    }

    function extractYearFromYmdSpan(span) {
        if (!span) return null;
        const y = parseInt((span.textContent || "").trim(), 10);
        return Number.isFinite(y) ? y : null;
    }

    /**
     * Returns:
     * {
     *   album: number[],
     *   live: number[],
     *   single: number[],
     *   ep: number[]
     * }
     *
     * Notes:
     * - Groups years by the nearest preceding "disco_header_top" section label.
     * - Only reads spans with class "disco_year_ymd" that also have a "title" attribute.
     * - If disbandedYear is provided, filters out years > disbandedYear.
     */
    function extractDiscographyMarkersFromDOM(disbandedYear) {
        const out = { album: [], live: [], single: [], ep: [] };

        const discographyRoot = document.getElementById("discography");
        if (!discographyRoot) return out;

        // Each section starts with: <div class="disco_header_top"><h3 class="disco_header_label">Album</h3>...
        const sectionHeaders = Array.from(discographyRoot.querySelectorAll(".disco_header_top"));

        for (let i = 0; i < sectionHeaders.length; i++) {
            const headerTop = sectionHeaders[i];
            const labelEl = headerTop.querySelector("h3.disco_header_label");
            const typeKey = normalizeDiscoLabel(labelEl?.textContent);
            if (!typeKey) continue; // skip sections we don't care about

            // Everything until the next .disco_header_top is considered this section's block
            const nextHeaderTop = sectionHeaders[i + 1] || null;

            const years = [];
            let cur = headerTop.nextElementSibling;

            // Walk forward sibling-by-sibling until nextHeaderTop (or end)
            while (cur && cur !== nextHeaderTop) {
                // Grab only the YMD spans (the ones in your examples)
                const spans = cur.querySelectorAll?.('span.disco_year_ymd[title]') || [];
                for (const s of spans) {
                    const y = extractYearFromYmdSpan(s);
                    if (!Number.isFinite(y)) continue;
                    if (Number.isFinite(disbandedYear) && y > disbandedYear) continue;
                    years.push(y);
                }
                cur = cur.nextElementSibling;
            }

            out[typeKey].push(...years);
        }

        // de-dupe + sort
        for (const k of Object.keys(out)) {
            out[k] = Array.from(new Set(out[k].filter(Number.isFinite))).sort((a, b) => a - b);
        }

        return out;
    }
    function renderIntoPanel(panelEl, headerEl) {
        const membersContent = headerEl ? findAdjacentInfoContent(headerEl) : null;

        const membersText = membersContent ? membersContent.textContent : "";
        const parsed = parseMembersFromText(membersText);

        const bounds = readFormedAndDisbanded(document);
        const formedYear = yearOf(bounds.formedDate);
        const disbandedYear = yearOf(bounds.disbandedDate);

        // NEW: get grouped discography markers from #discography
        const disco = extractDiscographyMarkersFromDOM(disbandedYear);

        // Decide endYear:
        const latestAnyRelease = Math.max(
            disco.album.length ? disco.album[disco.album.length - 1] : -Infinity,
            disco.live.length ? disco.live[disco.live.length - 1] : -Infinity,
            disco.single.length ? disco.single[disco.single.length - 1] : -Infinity,
            disco.ep.length ? disco.ep[disco.ep.length - 1] : -Infinity
        );

        const endYear = Number.isFinite(disbandedYear)
            ? disbandedYear
            : Math.max(
                Number.isFinite(latestAnyRelease) ? latestAnyRelease : -Infinity,
                Number.isFinite(parsed.maxYearMentioned) ? parsed.maxYearMentioned : -Infinity,
                new Date().getFullYear()
            );

        panelEl.innerHTML = "";
        buildGraph(panelEl, parsed.members, {
            formedYear,
            endYear,
            disbandedYear,
            // NEW: pass grouped markers
            markers: disco, // {album, live, single, ep}
        });
    }

    /**
     * Toggle panel open/closed.
     * On open:
     *  - apply theme vars
     *  - render the panel
     */

    function togglePanel(headerEl) {
        try {
            // Reuse existing panel if present
            let panel = document.getElementById(PANEL_ID);

            // Create panel if missing
            if (!panel) {
                panel = document.createElement("div");
                panel.id = PANEL_ID;
                panel.className = "rymmt-panel rymmt-hidden"; // start hidden; CSS class controls visibility
            }

            // If panel is not in DOM yet, insert it
            if (!document.body.contains(panel)) {
                const inserted = insertPanelAfterLastRenderedTextArtist(panel, headerEl);

                if (!inserted) {
                    // fallback: keep it visible somewhere so you can debug
                    (document.querySelector("#content") || document.body).appendChild(panel);
                }
            }

            // If we're opening, (re)render
            const isHidden = panel.classList.contains("rymmt-hidden");
            if (isHidden) {
                panel.classList.remove("rymmt-hidden");
                applyRymThemeVars(panel, headerEl);
                renderIntoPanel(panel, headerEl);
            } else {
                panel.classList.add("rymmt-hidden");
            }
        } catch (e) {
            console.error("[RYMMT] togglePanel error:", e);
        }
    }

    function findMembersHeader() {
        const hdrs = document.querySelectorAll(".info_hdr");
        for (const h of hdrs) {
            if ((h.textContent || "").trim() === "Members") return h;
        }
        return null;
    }

    /**
     * Inject the “[timeline]” link beside the Members header,
     * if it doesn't already exist.
     */
    function injectLinkIfNeeded() {
        const header = findMembersHeader();
        if (!header) return;

        if (header.querySelector(`.${LINK_CLASS}`) || header.querySelector(".rymmt-link-disabled")) return;

        const ok = hasSufficientTimelineData(header);

        if (!ok) {
            const msg = document.createElement("span");
            msg.className = "rymmt-link-disabled";
            msg.textContent = "not enough information";
            header.appendChild(document.createTextNode(" "));
            header.appendChild(msg);
            return;
        }

        const link = document.createElement("span");
        link.className = LINK_CLASS;
        link.textContent = "[timeline]";

        link.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            togglePanel(header);
        });

        header.appendChild(document.createTextNode(" "));
        header.appendChild(link);
    }

    /**
     * Initialize script:
     * - ensure styles (no-op)
     * - inject link
     * - observe DOM changes (RYM pages can update dynamically)
     */
    function init() {
        ensureStyles();
        injectLinkIfNeeded();

        const mo = new MutationObserver(() => injectLinkIfNeeded());
        mo.observe(document.documentElement, { childList: true, subtree: true });
    }

    init();
})();
