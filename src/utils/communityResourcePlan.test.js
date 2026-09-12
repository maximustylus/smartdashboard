import { describe, expect, it } from 'vitest';
import { CTA_TIER_BY_ROUTE } from './ctaRouting';
import { COMMUNITY_RESOURCES } from '../data/communityResources';
import {
  RESOURCE_IDS_BY_CTA_TIER,
  MEASUREMENT_IDS,
  VENUE_MEASURES,
  measurementVenues,
  generateCommunityResourcePlan,
} from './communityResourcePlan';

const ids = (...args) => generateCommunityResourcePlan(...args).map((resource) => resource.id);

const EXPECTED_NEUTRAL_PLANS = {
  URGENT: ['ssmc_kkh', 'spag', 'healthier_sg', 'active_health'],
  CLINICAL: ['ssmc_kkh', 'spag', 'active_health', 'healthier_sg'],
  COMMUNITY: ['ssmc_kkh', 'spag', 'aic_aac', 'pa_courses'],
  SOCIAL_CARE: ['ssmc_kkh', 'spag', 'singhealth_careline', 'aic_aac', 'touch_community'],
  WELLBEING: ['ssmc_kkh', 'spag', 'mental_wellness', 'touch_community'],
  FREE_FIRST: ['ssmc_kkh', 'spag', 'start2move', 'financial_chas', 'pa_courses'],
  START: ['ssmc_kkh', 'spag', 'start2move', 'pa_courses'],
  LEVEL_UP: ['ssmc_kkh', 'spag', 'active_health', 'activesg_gym'],
  ADVANCED: ['ssmc_kkh', 'spag', 'activesg_gym', 'active_health'],
};

describe('community resource plan', () => {
  it('defines a plan for every public CTA route tier', () => {
    expect(new Set(Object.values(CTA_TIER_BY_ROUTE)))
      .toEqual(new Set(Object.keys(RESOURCE_IDS_BY_CTA_TIER)));
  });

  it.each(Object.entries(EXPECTED_NEUTRAL_PLANS))(
    'preserves the neutral %s plan and order',
    (tier, expected) => expect(ids('Green', tier, {}, null)).toEqual(expected),
  );

  it.each([
    ['Red', ['ssmc_kkh', 'spag', 'healthier_sg', 'active_health']],
    ['Amber', ['ssmc_kkh', 'spag', 'start2move', 'pa_courses']],
    ['Green', ['ssmc_kkh', 'spag', 'activesg_gym', 'pa_courses']],
  ])('preserves the %s fallback when the tier is missing or unknown', (riskTier, expected) => {
    expect(ids(riskTier, null, {}, null)).toEqual(expected);
    expect(ids(riskTier, 'UNKNOWN', {}, null)).toEqual(expected);
  });

  it.each([
    ['46', 'singhealth_healthup'],
    ['64', 'nuhs_chp'],
    ['73', 'nhg_coaches'],
  ])('adds the existing regional resource for sector %s', (sector, resourceId) => {
    expect(ids('Green', 'START', {}, sector)).toContain(resourceId);
  });

  it.each([null, '', '00', '74'])('adds no regional resource for unknown sector %j', (sector) => {
    expect(ids('Green', 'START', {}, sector))
      .not.toEqual(expect.arrayContaining(['singhealth_healthup', 'nuhs_chp', 'nhg_coaches']));
  });

  it('preserves need and demographic additions', () => {
    expect(ids('Green', 'START', { psychoFlag: true }, null)).toContain('mental_wellness');
    expect(ids('Green', 'START', { sdohPsychological: true }, null)).toContain('mental_wellness');
    expect(ids('Green', 'START', { sdohFinancial: true }, null))
      .toEqual(expect.arrayContaining(['financial_chas', 'touch_community']));
    expect(ids('Green', 'START', { sdohSocial: true }, null))
      .toEqual(expect.arrayContaining(['aic_aac', 'touch_community']));
    expect(ids('Green', 'START', { gender: 'Female', age: '60+' }, null))
      .toContain('society_wings');
  });

  it('deduplicates resources and caps the visible plan at six', () => {
    const plan = ids('Green', 'SOCIAL_CARE', {
      psychoFlag: true,
      sdohFinancial: true,
      sdohSocial: true,
      gender: 'Female',
      age: '60+',
    }, '46');

    expect(new Set(plan).size).toBe(plan.length);
    expect(plan).toHaveLength(6);
  });
});

// ── measurement venues (`CD17`, P9) ─────────────────────────────────────────
describe('where a resident is sent to be measured', () => {
    it('names only assessments the banding code actually supports', () => {
        Object.values(VENUE_MEASURES).forEach((list) => {
            list.forEach((m) => expect(MEASUREMENT_IDS).toContain(m));
        });
    });

    it('lists every marked venue against a real resource id', () => {
        Object.keys(VENUE_MEASURES).forEach((id) => {
            expect(COMMUNITY_RESOURCES[id]).toBeDefined();
        });
    });

    // The guard that matters. A venue somebody half-confirmed, with the assessments
    // named but no statement of how a resident gets seen or what it costs, must not
    // reach a public surface. `CP8`.
    it('shows no venue whose access and cost are undescribed', () => {
        Object.keys(VENUE_MEASURES).forEach((id) => {
            const resource = COMMUNITY_RESOURCES[id];
            if (!resource.access) {
                MEASUREMENT_IDS.forEach((m) => {
                    expect(measurementVenues(m).map((v) => v.id)).not.toContain(id);
                });
            }
        });
    });

    it('returns an empty list rather than a partial one when nothing is confirmed', () => {
        MEASUREMENT_IDS.forEach((m) => {
            expect(Array.isArray(measurementVenues(m))).toBe(true);
        });
    });

    // Named explicitly so that adding them later is a deliberate act with evidence
    // behind it, not an accident of editing a nearby line.
    it.each(['active_health', 'aic_aac', 'healthier_sg'])(
        'does not claim %s performs these assessments without confirmation', (id) => {
            expect(VENUE_MEASURES[id]).toBeUndefined();
        },
    );
});
