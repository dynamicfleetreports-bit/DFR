/**
 * DFR Calculation Engine — dfr-calc.js
 * Single source of truth for ALL fleet audit calculations.
 * Audit page calls calcVehicle() for each vehicle and saves results to AUDIT_FINAL.
 * Reports read pre-calculated values from AUDIT_FINAL only — no recalculation.
 *
 * Version: 2.0 — SA research-based physics formula
 */

// ── Terrain factors ────────────────────────────────────────────────────────
// Net fuel efficiency multiplier vs flat SA road (post research)
const DFR_TERRAIN_FACTOR = {
    'Flat / Highveld':    1.00,
    'Mixed / Undulating': 0.93,
    'Mountainous':        0.84,
    'Severe Mountain':    0.75
};

// ── Aero drag share by usage ───────────────────────────────────────────────
// Fraction of total fuel that is aerodynamic at highway speed
// Research: ~42% for long-haul at 100km/h, lower for urban/construction
const DFR_AERO_DRAG = {
    'Long Distance':        0.42,
    'Mixed':                0.32,
    'Local Distribution':   0.22,
    'Construction / Mining':0.18,
    'Agricultural':         0.18
};

// ── Adjustment maps ────────────────────────────────────────────────────────
const DFR_LOAD_ADJ = {
    'Fully Loaded':               0,
    'Loaded Out / Empty Return':  0.18,
    'Mixed / Variable':           0.10,
    'Local Stop-Start':          -0.15
};

const DFR_TRAILER_ADJ = {
    'Tautliner / Curtainsider':  -0.05,
    'Flatdeck / Lowbed':          0,
    'Tanker':                     0.03,
    'Side Tipper':               -0.10,
    'Rear Tipper':               -0.12,
    'Livestock / Animal Trailer':-0.06,
    'Rigid Body (No Trailer)':    0
};

const DFR_AEROKIT_ADJ = {
    'None':             0,
    'Roof Fairing Only':0.05,
    'Full Aerokit':     0.10
};

// ── Fraud thresholds ───────────────────────────────────────────────────────
const DFR_FRAUD = {
    OVERFILL_FACTOR:  1.15,  // fuel > tank × 1.15 = over-fill flag
    LOW_EFF_FACTOR:   0.40,  // actKmL < mfrAvg × 0.40 = implausible
    DRIFT_PCT:        0.15   // |odo - gps| > gps × 0.15 = drift flag
};

/**
 * calcSuggested — suggested target km/L for a vehicle
 * Uses mfr_avg as base (SA real-world average), falls back to mfr_min.
 * Applies load, trailer, interlink, aerokit, terrain adjustments.
 *
 * @param {object} v - vehicle object with mfr_avg, mfr_min, loadProfile,
 *                     trailerType, interlink, aerokit, terrain
 * @returns {number|null} suggested km/L rounded to 2dp, or null if no base
 */
function calcSuggested(v) {
    const base = parseFloat(v.mfr_avg) || parseFloat(v.mfr_min) || null;
    if (!base) return null;
    const loadAdj    = DFR_LOAD_ADJ[v.loadProfile]    ?? 0;
    const trailerAdj = DFR_TRAILER_ADJ[v.trailerType] ?? 0;
    const intAdj     = (v.interlink === true || v.interlink === 'true' || v.interlink === 'Yes') ? -0.04 : 0;
    const aeroAdj    = DFR_AEROKIT_ADJ[v.aerokit]     ?? 0;
    const terrain    = DFR_TERRAIN_FACTOR[v.terrain]  ?? DFR_TERRAIN_FACTOR['Mixed / Undulating'];
    return Math.round(base * (1 + loadAdj + trailerAdj + intAdj + aeroAdj) * terrain * 100) / 100;
}

/**
 * calcSpeedLoss — extra litres burned and rand loss due to speed violations
 * Physics: aerodynamic drag ∝ speed², so penalty is quadratic not linear.
 * Uses actual event duration from CSV if available (min 5 min per event).
 *
 * @param {object} v        - vehicle with speeds[], duration, usage, type
 * @param {number} limit    - speed limit in km/h
 * @param {number} target   - active target km/L for this vehicle
 * @param {number} wPrice   - wholesale fuel price R/L
 * @param {number} rPrice   - retail fuel price R/L
 * @returns {object} { litres, lossW, lossR }
 */
function calcSpeedLoss(v, limit, target, wPrice, rPrice) {
    const aeroDrag = DFR_AERO_DRAG[v.usage] ?? DFR_AERO_DRAG['Mixed'];
    let litres = 0;

    if (v.speeds && v.speeds.length > 0) {
        const overEvents = v.speeds.filter(s => s > limit);
        if (!overEvents.length) return { litres: 0, lossW: 0, lossR: 0 };

        // Duration: actual CSV seconds distributed across events, min 5min each
        const totalDurHours = v.duration > 0
            ? v.duration / 3600
            : overEvents.length * 5 / 60;
        const perEventHours = Math.max(5 / 60, totalDurHours / overEvents.length);

        overEvents.forEach(speed => {
            // Quadratic drag penalty: extra fuel fraction = aeroDrag × ((speed/limit)² - 1)
            const dragRatio         = (speed / limit) ** 2;
            const penaltyFraction   = aeroDrag * (dragRatio - 1);
            const eventSpeed        = speed * 0.9;           // effective speed (decel factored)
            const eventDist         = eventSpeed * perEventHours;
            const normalLitres      = eventDist / target;    // litres at target efficiency
            litres += normalLitres * penaltyFraction;        // extra litres burned
        });
    } else if (v.violations > 0) {
        // Fallback: no individual readings — estimate from count
        // Conservative: assume +15km/h over limit, 5min each
        const assumed     = limit + 15;
        const dragRatio   = (assumed / limit) ** 2;
        const penalty     = aeroDrag * (dragRatio - 1);
        const dist        = assumed * 0.9 * (5 / 60);
        litres = v.violations * (dist / target) * penalty;
    }

    litres = Math.max(0, litres);
    return {
        litres: Math.round(litres * 100) / 100,
        lossW:  Math.round(litres * wPrice * 100) / 100,
        lossR:  Math.round(litres * rPrice * 100) / 100
    };
}

/**
 * calcScore — performance score 0-100 for a vehicle
 * Deductions: efficiency (max 40), speed events (max 30),
 *             sustained over-speed (max 20), extreme speed (max 10)
 *
 * @param {object} v        - vehicle with actKmL, target, speeds[], violations,
 *                            duration, maxSpeed
 * @param {number} limit    - speed limit km/h
 * @param {number} target   - active target km/L
 * @returns {number} score 0-100
 */
function calcScore(v, limit, target) {
    let score = 100;

    // Efficiency deduction — up to 40pts
    if (v.actKmL > 0 && v.actKmL < target) {
        const gap = ((target - v.actKmL) / target) * 100;
        score -= Math.min(40, (gap / 100) * 40);
    }

    // Speed events deduction — up to 30pts
    const events = (v.speeds && v.speeds.length > 0)
        ? v.speeds.filter(s => s > limit).length
        : (v.violations || 0);
    if (events > 0) score -= Math.min(30, events * 0.3);

    // Sustained over-speed deduction — up to 20pts
    const peakSpeed = (v.speeds && v.speeds.length > 0)
        ? Math.max(...v.speeds)
        : (v.maxSpeed || 0);
    if (v.duration > 300 && peakSpeed > limit + 1) {
        score -= Math.min(20, (v.duration / 60 / 30) * 20);
    }

    // Extreme speed deduction — up to 10pts
    if (peakSpeed > limit + 20) {
        score -= Math.min(10, (peakSpeed - (limit + 20)) * 0.5);
    }

    return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * calcFraudFlags — returns array of fraud/anomaly flag strings
 *
 * @param {object} v      - vehicle with mK (odo), mL (fuel), gps, fuel_tank,
 *                          mfr_avg, actKmL
 * @returns {string[]}    array of flag descriptions (empty = clean)
 */
function calcFraudFlags(v) {
    const flags  = [];
    const litres = parseFloat(v.mL) || 0;
    const odo    = parseFloat(v.mK) || 0;
    const gps    = parseFloat(v.gpsDist) || 0;
    const tank   = parseFloat(v.fuel_tank) || 0;
    const mfrAvg = parseFloat(v.mfr_avg) || 0;

    // Over-fill: compare monthly litres to max plausible for distance driven.
    // Never compare to single tank — monthly totals always exceed tank capacity.
    // Max plausible = distKm / (mfrAvg × 0.40) — 40% of avg is absolute floor.
    const distKm  = parseFloat(v.mK) || 0;
    const minKmL  = mfrAvg > 0 ? mfrAvg * DFR_FRAUD.LOW_EFF_FACTOR : 0.8;
    const maxPlausibleL = distKm > 0 && minKmL > 0 ? Math.round(distKm / minKmL) : 0;
    if (maxPlausibleL > 0 && litres > maxPlausibleL) {
        flags.push(`Excess fuel: ${litres}L for ${distKm}km (${(distKm/litres).toFixed(2)}km/L) — below minimum plausible`);
    } else if (tank > 0 && distKm === 0 && litres > tank * DFR_FRAUD.OVERFILL_FACTOR) {
        // No km recorded but large fuel entry — flag as single overfill
        flags.push(`Over-fill: ${litres}L entered with no km recorded, tank capacity ${tank}L`);
    }
    if (v.actKmL > 0 && mfrAvg > 0 && v.actKmL < mfrAvg * DFR_FRAUD.LOW_EFF_FACTOR) {
        flags.push(`Implausible consumption: ${v.actKmL} km/L is below 40% of mfr avg (${mfrAvg})`);
    }
    if (odo > 0 && gps > 0) {
        const drift = Math.abs(odo - gps);
        if (drift > gps * DFR_FRAUD.DRIFT_PCT) {
            flags.push(`Odo drift: ${Math.round(drift)}km difference vs GPS (${Math.round(drift/gps*100)}%)`);
        }
    }
    return flags;
}

/**
 * calcVehicle — master per-vehicle calculation
 * Call this once per vehicle in the audit. All results stored in returned object.
 * Reports read these stored values — no recalculation ever needed.
 *
 * @param {object} v        - raw vehicle data from AUDIT_DRAFT / fleet
 * @param {number} limit    - fleet speed limit km/h
 * @param {number} wPrice   - wholesale R/L
 * @param {number} rPrice   - retail R/L
 * @param {number} globalTarget - fallback target km/L if no vehicle target
 * @returns {object}        vehicle object with all calculated fields added
 */
function calcVehicle(v, limit, wPrice, rPrice, globalTarget) {
    // ── Distance ──────────────────────────────────────────────────────────
    const odoKm  = parseFloat(v.mK)      || parseFloat(v.odo)   || 0;
    const gpsKm  = parseFloat(v.gpsDist) || parseFloat(v.gps)   || 0;
    const litres = parseFloat(v.mL)      || parseFloat(v.liters) || 0;

    // Drift
    const driftKm  = (odoKm > 0 && gpsKm > 0) ? Math.round(odoKm - gpsKm) : null;
    const driftPct = (driftKm !== null && gpsKm > 0)
        ? Math.round(Math.abs(driftKm) / gpsKm * 1000) / 10
        : null;

    // Use odo if entered, GPS as fallback for distance calculations
    const distKm = odoKm || gpsKm;

    // ── Targets ───────────────────────────────────────────────────────────
    const suggested = calcSuggested(v);
    const target    = parseFloat(v.clientTarget)
                   || parseFloat(v.targetKmL)
                   || suggested
                   || globalTarget
                   || 2.3;

    // ── Efficiency ────────────────────────────────────────────────────────
    const actKmL  = (litres > 0 && distKm > 0)
        ? Math.round(distKm / litres * 100) / 100
        : null;
    const wastedL = (litres > 0 && distKm > 0 && actKmL !== null && actKmL < target)
        ? Math.round((litres - distKm / target) * 100) / 100
        : 0;

    const effLoss_w = Math.round(Math.max(0, wastedL) * wPrice * 100) / 100;
    const effLoss_r = Math.round(Math.max(0, wastedL) * rPrice * 100) / 100;

    // ── Speed ─────────────────────────────────────────────────────────────
    const vForSpeed = { ...v, actKmL };
    const speedCalc = calcSpeedLoss(v, limit, target, wPrice, rPrice);

    // ── Totals ────────────────────────────────────────────────────────────
    const totalLoss_w = Math.round((effLoss_w + speedCalc.lossW) * 100) / 100;
    const totalLoss_r = Math.round((effLoss_r + speedCalc.lossR) * 100) / 100;

    // ── Score ─────────────────────────────────────────────────────────────
    const vForScore = { ...v, actKmL };
    const score = calcScore(vForScore, limit, target);

    // ── Fraud flags ───────────────────────────────────────────────────────
    const vForFraud = { ...v, mK: odoKm, mL: litres, actKmL };
    const fraudFlags = calcFraudFlags(vForFraud);

    // ── Speed event count ─────────────────────────────────────────────────
    const violations = (v.speeds && v.speeds.length > 0)
        ? v.speeds.filter(s => s > limit).length
        : (v.violations || 0);
    const maxSpeed = (v.speeds && v.speeds.length > 0)
        ? Math.max(...v.speeds)
        : (v.maxSpeed || 0);

    // ── Return enriched vehicle object ────────────────────────────────────
    return {
        ...v,
        // Normalised distance/fuel fields (keep mK/mL for report compatibility)
        mK:       odoKm || v.mK,
        mL:       litres || v.mL,
        gpsDist:  gpsKm || v.gpsDist,
        // Calculated
        suggestedTarget: suggested,
        activeTarget:    target,
        actKmL,
        wastedL,
        driftKm,
        driftPct,
        violations,
        maxSpeed,
        // Losses
        effLoss_w,
        effLoss_r,
        speedLitres: speedCalc.litres,
        speedLoss_w: speedCalc.lossW,
        speedLoss_r: speedCalc.lossR,
        totalLoss_w,
        totalLoss_r,
        // Score
        score,
        // Fraud
        fraudFlags
    };
}

/**
 * calcFleet — calculate all vehicles and fleet-level totals
 * Returns { vehicles[], totals{} } — the complete AUDIT_FINAL payload.
 *
 * @param {object[]} vehicles   - array of raw vehicle objects
 * @param {object}   settings   - { limit, wPrice, rPrice, globalTarget }
 * @returns {object}            { vehicles, totals }
 */
function calcFleet(vehicles, settings) {
    const { limit, wPrice, rPrice, globalTarget } = settings;

    const processed = vehicles.map(v =>
        calcVehicle(v, limit, wPrice, rPrice, globalTarget)
    );

    // Fleet totals
    const totals = processed.reduce((acc, v) => {
        acc.totalKM      += v.mK     || 0;
        acc.totalLitres  += v.mL     || 0;
        acc.totalWastedL += v.wastedL || 0;
        acc.effLoss_w    += v.effLoss_w;
        acc.effLoss_r    += v.effLoss_r;
        acc.speedLitres  += v.speedLitres;
        acc.speedLoss_w  += v.speedLoss_w;
        acc.speedLoss_r  += v.speedLoss_r;
        acc.totalLoss_w  += v.totalLoss_w;
        acc.totalLoss_r  += v.totalLoss_r;
        acc.totalScore   += v.score;
        acc.violations   += v.violations;
        return acc;
    }, {
        totalKM: 0, totalLitres: 0, totalWastedL: 0,
        effLoss_w: 0, effLoss_r: 0,
        speedLitres: 0, speedLoss_w: 0, speedLoss_r: 0,
        totalLoss_w: 0, totalLoss_r: 0,
        totalScore: 0, violations: 0
    });

    // Round all totals
    Object.keys(totals).forEach(k => {
        totals[k] = Math.round(totals[k] * 100) / 100;
    });

    totals.fleetScore  = processed.length
        ? Math.round(totals.totalScore / processed.length)
        : 0;
    totals.avgKmL      = totals.totalLitres > 0
        ? Math.round(totals.totalKM / totals.totalLitres * 100) / 100
        : 0;
    totals.vehicleCount = processed.length;

    // Bonus programme
    const elite = processed.filter(v => v.score >= 95).length;
    const high  = processed.filter(v => v.score >= 90 && v.score < 95).length;
    const good  = processed.filter(v => v.score >= 80 && v.score < 90).length;
    const poor  = processed.filter(v => v.score < 80).length;
    const bonusPayout   = (elite * 500) + (high * 300) + (good * 150);
    const bonusSavings  = processed
        .filter(v => v.score >= 80)
        .reduce((s, v) => s + v.totalLoss_w, 0);
    const bonusROI = Math.round(bonusSavings - bonusPayout);

    totals.bonus = {
        elite, high, good, poor,
        payout:  bonusPayout,
        savings: Math.round(bonusSavings),
        roi:     bonusROI
    };

    return { vehicles: processed, totals };
}

// Export for use in audit page (inline script — no module system needed)
// Usage:  const result = calcVehicle(v, 80, 21.50, 23.85, 2.3);
//         const fleet  = calcFleet(vehicles, { limit:80, wPrice:21.50, rPrice:23.85, globalTarget:2.3 });
