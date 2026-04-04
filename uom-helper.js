// ─────────────────────────────────────────────────────────────────────────────
// uom-helper.js  |  Dynamic Fleet Reporting
// Shared unit-of-measure + currency conversion utility.
// Load on every page that handles client data:
//   <script src="uom-helper.js"></script>
//
// GOLDEN RULE:
//   • All internal storage and calculations use km, litres, km/L, km/h
//   • toMetric()  — call on INPUT  (CSV parse, form save)
//   • fromMetric() — call on OUTPUT (display, report labels)
//   • The calc engine (calcVehicle etc.) never changes
// ─────────────────────────────────────────────────────────────────────────────

window.DFR_UOM = (function () {

    // ── Conversion factors ────────────────────────────────────────────────────
    const FACTORS = {
        // Distance
        MI_TO_KM:       1.60934,
        KM_TO_MI:       0.62137,
        // Volume
        GAL_US_TO_L:    3.78541,
        GAL_UK_TO_L:    4.54609,
        L_TO_GAL_US:    0.26417,
        L_TO_GAL_UK:    0.21997,
        // Efficiency (km/L ↔ MPG)
        KML_TO_MPG_US:  2.35215,
        KML_TO_MPG_UK:  2.82481,
        MPG_US_TO_KML:  0.42514,
        MPG_UK_TO_KML:  0.35401,
        // Speed
        MPH_TO_KMH:     1.60934,
        KMH_TO_MPH:     0.62137,
    };

    // ── Country → UOM profile map ─────────────────────────────────────────────
    // distUnit  : 'km'  | 'mi'
    // volUnit   : 'L'   | 'gal_us' | 'gal_uk'
    // effUnit   : 'km/L'| 'mpg_us' | 'mpg_uk' | 'L/100km'
    // speedUnit : 'km/h'| 'mph'
    // currency  : ISO 4217 code
    // symbol    : display symbol
    // flag      : emoji flag
    const COUNTRY_PROFILES = {
        'ZA': { name:'South Africa',    distUnit:'km',  volUnit:'L',      effUnit:'km/L',   speedUnit:'km/h', currency:'ZAR', symbol:'R',   flag:'🇿🇦' },
        'US': { name:'United States',   distUnit:'mi',  volUnit:'gal_us', effUnit:'mpg_us', speedUnit:'mph',  currency:'USD', symbol:'$',   flag:'🇺🇸' },
        'GB': { name:'United Kingdom',  distUnit:'mi',  volUnit:'gal_uk', effUnit:'mpg_uk', speedUnit:'mph',  currency:'GBP', symbol:'£',   flag:'🇬🇧' },
        'AU': { name:'Australia',       distUnit:'km',  volUnit:'L',      effUnit:'L/100km',speedUnit:'km/h', currency:'AUD', symbol:'A$',  flag:'🇦🇺' },
        'NZ': { name:'New Zealand',     distUnit:'km',  volUnit:'L',      effUnit:'L/100km',speedUnit:'km/h', currency:'NZD', symbol:'NZ$', flag:'🇳🇿' },
        'EU': { name:'Europe (EUR)',     distUnit:'km',  volUnit:'L',      effUnit:'L/100km',speedUnit:'km/h', currency:'EUR', symbol:'€',   flag:'🇪🇺' },
        'DE': { name:'Germany',         distUnit:'km',  volUnit:'L',      effUnit:'L/100km',speedUnit:'km/h', currency:'EUR', symbol:'€',   flag:'🇩🇪' },
        'FR': { name:'France',          distUnit:'km',  volUnit:'L',      effUnit:'L/100km',speedUnit:'km/h', currency:'EUR', symbol:'€',   flag:'🇫🇷' },
        'NL': { name:'Netherlands',     distUnit:'km',  volUnit:'L',      effUnit:'L/100km',speedUnit:'km/h', currency:'EUR', symbol:'€',   flag:'🇳🇱' },
        'AE': { name:'UAE',             distUnit:'km',  volUnit:'L',      effUnit:'km/L',   speedUnit:'km/h', currency:'AED', symbol:'د.إ', flag:'🇦🇪' },
        'CA': { name:'Canada',          distUnit:'km',  volUnit:'L',      effUnit:'L/100km',speedUnit:'km/h', currency:'CAD', symbol:'C$',  flag:'🇨🇦' },
        'ZW': { name:'Zimbabwe',        distUnit:'km',  volUnit:'L',      effUnit:'km/L',   speedUnit:'km/h', currency:'USD', symbol:'$',   flag:'🇿🇼' },
        'ZM': { name:'Zambia',          distUnit:'km',  volUnit:'L',      effUnit:'km/L',   speedUnit:'km/h', currency:'ZMW', symbol:'K',   flag:'🇿🇲' },
        'BW': { name:'Botswana',        distUnit:'km',  volUnit:'L',      effUnit:'km/L',   speedUnit:'km/h', currency:'BWP', symbol:'P',   flag:'🇧🇼' },
        'NA': { name:'Namibia',         distUnit:'km',  volUnit:'L',      effUnit:'km/L',   speedUnit:'km/h', currency:'NAD', symbol:'N$',  flag:'🇳🇦' },
        'MZ': { name:'Mozambique',      distUnit:'km',  volUnit:'L',      effUnit:'km/L',   speedUnit:'km/h', currency:'MZN', symbol:'MT',  flag:'🇲🇿' },
        'KE': { name:'Kenya',           distUnit:'km',  volUnit:'L',      effUnit:'km/L',   speedUnit:'km/h', currency:'KES', symbol:'KSh', flag:'🇰🇪' },
        'NG': { name:'Nigeria',         distUnit:'km',  volUnit:'L',      effUnit:'km/L',   speedUnit:'km/h', currency:'NGN', symbol:'₦',   flag:'🇳🇬' },
        'GH': { name:'Ghana',           distUnit:'km',  volUnit:'L',      effUnit:'km/L',   speedUnit:'km/h', currency:'GHS', symbol:'GH₵', flag:'🇬🇭' },
        'OTHER': { name:'Other (Metric)',distUnit:'km', volUnit:'L',      effUnit:'km/L',   speedUnit:'km/h', currency:'USD', symbol:'$',   flag:'🌍' },
    };

    // Default profile (SA)
    const DEFAULT_PROFILE = COUNTRY_PROFILES['ZA'];

    // ── Get profile for a client object ───────────────────────────────────────
    function getProfile(client) {
        if (!client) return DEFAULT_PROFILE;
        // Explicit countryCode takes priority
        if (client.countryCode && COUNTRY_PROFILES[client.countryCode]) {
            return COUNTRY_PROFILES[client.countryCode];
        }
        return DEFAULT_PROFILE;
    }

    // ── INPUT: convert submitted value TO metric ──────────────────────────────

    /** Convert a distance value to km */
    function distToKm(value, profile) {
        const v = parseFloat(value) || 0;
        if (!profile || profile.distUnit === 'km') return v;
        return Math.round(v * FACTORS.MI_TO_KM * 10000) / 10000;
    }

    /** Convert a volume value to litres */
    function volToLitres(value, profile) {
        const v = parseFloat(value) || 0;
        if (!profile || profile.volUnit === 'L') return v;
        if (profile.volUnit === 'gal_us') return Math.round(v * FACTORS.GAL_US_TO_L * 10000) / 10000;
        if (profile.volUnit === 'gal_uk') return Math.round(v * FACTORS.GAL_UK_TO_L * 10000) / 10000;
        return v;
    }

    /** Convert a fuel efficiency value to km/L */
    function effToKmL(value, profile) {
        const v = parseFloat(value) || 0;
        if (!profile || profile.effUnit === 'km/L') return v;
        if (profile.effUnit === 'mpg_us') return Math.round(v * FACTORS.MPG_US_TO_KML * 10000) / 10000;
        if (profile.effUnit === 'mpg_uk') return Math.round(v * FACTORS.MPG_UK_TO_KML * 10000) / 10000;
        if (profile.effUnit === 'L/100km' && v > 0) return Math.round((100 / v) * 10000) / 10000;
        return v;
    }

    /** Convert a speed value to km/h */
    function speedToKmh(value, profile) {
        const v = parseFloat(value) || 0;
        if (!profile || profile.speedUnit === 'km/h') return v;
        return Math.round(v * FACTORS.MPH_TO_KMH * 10000) / 10000;
    }

    /** Convert a fuel price (per client volume unit) to price per litre */
    function fuelPriceToPerLitre(value, profile) {
        const v = parseFloat(value) || 0;
        if (!profile || profile.volUnit === 'L') return v;
        if (profile.volUnit === 'gal_us') return Math.round((v / FACTORS.GAL_US_TO_L) * 10000) / 10000;
        if (profile.volUnit === 'gal_uk') return Math.round((v / FACTORS.GAL_UK_TO_L) * 10000) / 10000;
        return v;
    }

    // ── OUTPUT: convert metric value TO client display UOM ────────────────────

    /** Convert km to client distance unit */
    function kmToDisplay(value, profile) {
        const v = parseFloat(value) || 0;
        if (!profile || profile.distUnit === 'km') return v;
        return Math.round(v * FACTORS.KM_TO_MI * 100) / 100;
    }

    /** Convert litres to client volume unit */
    function litresToDisplay(value, profile) {
        const v = parseFloat(value) || 0;
        if (!profile || profile.volUnit === 'L') return v;
        if (profile.volUnit === 'gal_us') return Math.round(v * FACTORS.L_TO_GAL_US * 100) / 100;
        if (profile.volUnit === 'gal_uk') return Math.round(v * FACTORS.L_TO_GAL_UK * 100) / 100;
        return v;
    }

    /** Convert km/L to client efficiency unit */
    function kmLToDisplay(value, profile) {
        const v = parseFloat(value) || 0;
        if (!profile || profile.effUnit === 'km/L') return v;
        if (profile.effUnit === 'mpg_us') return Math.round(v * FACTORS.KML_TO_MPG_US * 100) / 100;
        if (profile.effUnit === 'mpg_uk') return Math.round(v * FACTORS.KML_TO_MPG_UK * 100) / 100;
        if (profile.effUnit === 'L/100km' && v > 0) return Math.round((100 / v) * 100) / 100;
        return v;
    }

    /** Convert km/h to client speed unit */
    function kmhToDisplay(value, profile) {
        const v = parseFloat(value) || 0;
        if (!profile || profile.speedUnit === 'km/h') return v;
        return Math.round(v * FACTORS.KMH_TO_MPH * 10) / 10;
    }

    // ── Unit label helpers ────────────────────────────────────────────────────

    function distLabel(profile)      { return (profile && profile.distUnit === 'mi') ? 'mi'    : 'km'; }
    function volLabel(profile)       {
        if (!profile || profile.volUnit === 'L') return 'L';
        if (profile.volUnit === 'gal_us') return 'gal';
        if (profile.volUnit === 'gal_uk') return 'gal (UK)';
        return 'L';
    }
    function effLabel(profile)       {
        if (!profile || profile.effUnit === 'km/L')   return 'km/L';
        if (profile.effUnit === 'mpg_us')             return 'MPG';
        if (profile.effUnit === 'mpg_uk')             return 'MPG (UK)';
        if (profile.effUnit === 'L/100km')            return 'L/100km';
        return 'km/L';
    }
    function speedLabel(profile)     { return (profile && profile.speedUnit === 'mph') ? 'mph'   : 'km/h'; }
    function fuelPriceLabel(profile) {
        const sym = (profile && profile.symbol) ? profile.symbol : 'R';
        const vol = volLabel(profile);
        return sym + '/' + vol;
    }
    function currencySymbol(profile) { return (profile && profile.symbol) ? profile.symbol : 'R'; }

    // ── Format helpers ────────────────────────────────────────────────────────

    /** Format a monetary value with client currency symbol */
    function formatCurrency(value, profile, decimals) {
        const sym = currencySymbol(profile);
        const d   = (decimals !== undefined) ? decimals : 0;
        const num = parseFloat(value) || 0;
        return sym + ' ' + num.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
    }

    /** Format a distance value with label */
    function formatDist(value, profile, decimals) {
        const d   = (decimals !== undefined) ? decimals : 0;
        const num = kmToDisplay(value, profile);
        return num.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }) + ' ' + distLabel(profile);
    }

    /** Format a volume value with label */
    function formatVol(value, profile, decimals) {
        const d   = (decimals !== undefined) ? decimals : 1;
        const num = litresToDisplay(value, profile);
        return num.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }) + ' ' + volLabel(profile);
    }

    /** Format an efficiency value with label */
    function formatEff(value, profile, decimals) {
        const d   = (decimals !== undefined) ? decimals : 2;
        const num = kmLToDisplay(value, profile);
        return num.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }) + ' ' + effLabel(profile);
    }

    // ── Conversion note for audit UI ──────────────────────────────────────────
    /** Returns a human-readable note to show when converting, e.g. "Converting miles → km, gallons → litres" */
    function conversionNote(profile) {
        if (!profile) return null;
        const parts = [];
        if (profile.distUnit === 'mi')     parts.push('miles → km');
        if (profile.volUnit === 'gal_us')  parts.push('US gallons → litres');
        if (profile.volUnit === 'gal_uk')  parts.push('UK gallons → litres');
        return parts.length ? 'Converting: ' + parts.join(', ') : null;
    }

    /** Returns true if this client profile needs any conversion at all */
    function needsConversion(profile) {
        if (!profile) return false;
        return profile.distUnit !== 'km' || profile.volUnit !== 'L';
    }

    // ── Country dropdown HTML helper ──────────────────────────────────────────
    /** Returns an array of {code, name, flag} sorted alphabetically, ZA first */
    function countryList() {
        const entries = Object.entries(COUNTRY_PROFILES).map(([code, p]) => ({
            code, name: p.name, flag: p.flag
        }));
        // ZA first, then alphabetical
        entries.sort((a, b) => {
            if (a.code === 'ZA') return -1;
            if (b.code === 'ZA') return 1;
            return a.name.localeCompare(b.name);
        });
        return entries;
    }

    /** Builds <option> tags for a country <select>, with ZA selected by default */
    function buildCountryOptions(selectedCode) {
        return countryList().map(c => {
            const sel = (c.code === (selectedCode || 'ZA')) ? ' selected' : '';
            return `<option value="${c.code}"${sel}>${c.flag} ${c.name}</option>`;
        }).join('');
    }

    // ── Public API ────────────────────────────────────────────────────────────
    return {
        // Data
        COUNTRIES:       COUNTRY_PROFILES,
        DEFAULT:         DEFAULT_PROFILE,

        // Profile lookup
        getProfile,

        // Input normalisation (submitted value → metric)
        distToKm,
        volToLitres,
        effToKmL,
        speedToKmh,
        fuelPriceToPerLitre,

        // Output conversion (metric → display)
        kmToDisplay,
        litresToDisplay,
        kmLToDisplay,
        kmhToDisplay,

        // Labels
        distLabel,
        volLabel,
        effLabel,
        speedLabel,
        fuelPriceLabel,
        currencySymbol,

        // Formatters
        formatCurrency,
        formatDist,
        formatVol,
        formatEff,

        // Utilities
        conversionNote,
        needsConversion,
        countryList,
        buildCountryOptions,
    };

})();
