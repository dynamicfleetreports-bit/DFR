// ─────────────────────────────────────────────────────────────────────────────
// pricing-helper.js  |  Dynamic Fleet Reporting
// Shared service-pricing utility — setup fee, monthly admin fee, per-vehicle
// tier rates. Load as an external file on every page that quotes or
// calculates a client retainer (script tag with src="pricing-helper.js").
// Do not paste this file's contents into an inline script block.
//
// HOW IT WORKS:
//   • Global current pricing lives in cloudStorage (GLOBAL_SETUP_FEE etc.),
//     edited from settings.html. Changing it does NOT change what existing
//     clients pay — it only affects new clients going forward.
//   • Each client record can carry a `pricing` snapshot (client.pricing) that
//     locks in the rates that were current when they signed up. getRetainer()
//     always prefers this snapshot over the live global rate.
//   • Clients with no snapshot yet (created before this feature existed) fall
//     back to whatever live settings are passed in — use the "Lock In Current
//     Pricing" button on the Settings page once, to snapshot everyone at
//     today's rate so nobody's price silently changes later.
//   • A client can also carry a fully custom flat retainer (client.pricing.custom
//     = true), which skips tier calculation entirely — for one-off deals.
//
// USAGE:
//   const liveSettings = await DFR_PRICING.getGlobalSettings();   // once, on page load
//   const retainer = DFR_PRICING.getRetainer(client, liveSettings); // per client, sync
// ─────────────────────────────────────────────────────────────────────────────

window.DFR_PRICING = (function () {

    const DEFAULTS = {
        setupFee:     2500,
        adminFee:     1500,
        tier1Rate:    200,  tier1Max: 15,
        tier2Rate:    175,  tier2Max: 30,
        tier3Rate:    150,
        onDemandRate: 150
    };

    const KEYS = {
        setupFee:     'GLOBAL_SETUP_FEE',
        adminFee:     'GLOBAL_ADMIN_FEE',
        tier1Rate:    'GLOBAL_TIER1_RATE',
        tier1Max:     'GLOBAL_TIER1_MAX',
        tier2Rate:    'GLOBAL_TIER2_RATE',
        tier2Max:     'GLOBAL_TIER2_MAX',
        tier3Rate:    'GLOBAL_TIER3_RATE',
        onDemandRate: 'GLOBAL_ONDEMAND_RATE'
    };

    // ── Read the live global pricing settings from cloudStorage ────────────
    // Call this ONCE per page load (it's async) and reuse the result — every
    // other function here is synchronous so it can be used inside .map()/
    // .forEach() loops exactly like the old hardcoded getRetainer() was.
    async function getGlobalSettings() {
        try {
            const entries = Object.entries(KEYS);
            const raw = await Promise.all(entries.map(([, key]) => cloudStorage.getItem(key)));
            const settings = Object.assign({}, DEFAULTS);
            entries.forEach(([field], i) => {
                const v = parseFloat(raw[i]);
                if (!isNaN(v)) settings[field] = v;
            });
            return settings;
        } catch (e) {
            return Object.assign({}, DEFAULTS);
        }
    }

    async function saveGlobalSettings(newSettings, opts) {
        opts = opts || {};
        const prev = await getGlobalSettings();
        await Promise.all(Object.entries(KEYS).map(([field, key]) =>
            cloudStorage.setItem(key, String(newSettings[field]))
        ));
        if (opts.logHistory !== false) {
            await logPricingChange(prev, newSettings);
        }
        return newSettings;
    }

    async function logPricingChange(prev, next) {
        const history = JSON.parse(await cloudStorage.getItem('PRICING_HISTORY')) || [];
        const changes = [];
        Object.keys(KEYS).forEach(field => {
            if (prev[field] !== next[field]) {
                changes.push(field + ': ' + prev[field] + ' → ' + next[field]);
            }
        });
        if (!changes.length) return;
        history.unshift({
            date: new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' }),
            changes: changes,
            snapshot: next
        });
        await cloudStorage.setItem('PRICING_HISTORY', JSON.stringify(history));
    }

    // ── Tier lookup ──────────────────────────────────────────────────────────
    function getTierForFleetSize(settings, fleetSize) {
        const s = settings || DEFAULTS;
        if (fleetSize <= s.tier1Max) return { rate: s.tier1Rate, tier: 1, label: 'Tier 1', range: '1–' + s.tier1Max + ' vehicles' };
        if (fleetSize <= s.tier2Max) return { rate: s.tier2Rate, tier: 2, label: 'Tier 2', range: (s.tier1Max + 1) + '–' + s.tier2Max + ' vehicles' };
        return { rate: s.tier3Rate, tier: 3, label: 'Tier 3', range: (s.tier2Max + 1) + '+ vehicles' };
    }

    function getFleetSize(c) {
        if (c.fleet) return Array.isArray(c.fleet) ? c.fleet.length : Object.keys(c.fleet).length;
        return c.fleetSize || 0;
    }

    // ── The main replacement for the old hardcoded getRetainer() ───────────
    // Prefers the client's own locked-in pricing snapshot; falls back to the
    // live global settings passed in for clients that don't have one yet.
    function getRetainer(c, liveSettings) {
        const fleetSize = getFleetSize(c);

        if (c.pricing && c.pricing.custom && typeof c.pricing.customRetainer === 'number') {
            return c.pricing.customRetainer;
        }
        if (c.pricing && !c.pricing.custom) {
            const tier = getTierForFleetSize(c.pricing, fleetSize);
            return c.pricing.adminFee + (fleetSize * tier.rate);
        }
        const s = liveSettings || DEFAULTS;
        const tier = getTierForFleetSize(s, fleetSize);
        return s.adminFee + (fleetSize * tier.rate);
    }

    // Drop-in replacement for the old hardcoded getTierRate(fleetSize).
    function getTierRate(fleetSize, liveSettings) {
        return getTierForFleetSize(liveSettings || DEFAULTS, fleetSize).rate;
    }

    // ── Locking in pricing for a client ─────────────────────────────────────
    // Call when a NEW client is created, to snapshot today's rates onto them.
    function lockInPricing(globalSettings) {
        return {
            setupFee:  globalSettings.setupFee,
            adminFee:  globalSettings.adminFee,
            tier1Rate: globalSettings.tier1Rate, tier1Max: globalSettings.tier1Max,
            tier2Rate: globalSettings.tier2Rate, tier2Max: globalSettings.tier2Max,
            tier3Rate: globalSettings.tier3Rate,
            custom: false,
            lockedDate: new Date().toISOString()
        };
    }

    // Call to give ONE specific client a custom flat retainer, overriding tiers.
    function lockInCustomPricing(customRetainer, note) {
        return {
            custom: true,
            customRetainer: customRetainer,
            note: note || '',
            lockedDate: new Date().toISOString()
        };
    }

    // One-time migration helper: given the full FLEET_CLIENTS array and the
    // current global settings, returns a new array where every client missing
    // a `pricing` snapshot gets one locked in at today's rate. Clients that
    // already have a snapshot (custom or tier-based) are left untouched.
    function migrateAllClients(clients, globalSettings) {
        let migratedCount = 0;
        const updated = clients.map(c => {
            if (c.pricing) return c;
            migratedCount++;
            return Object.assign({}, c, { pricing: lockInPricing(globalSettings) });
        });
        return { clients: updated, migratedCount: migratedCount };
    }

    return {
        DEFAULTS,
        getGlobalSettings, saveGlobalSettings,
        getTierForFleetSize, getFleetSize,
        getRetainer, getTierRate,
        lockInPricing, lockInCustomPricing,
        migrateAllClients
    };

})();
