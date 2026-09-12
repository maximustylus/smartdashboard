import { COMMUNITY_RESOURCES } from '../data/communityResources';
import { clusterForSector } from './singapore/communityServices';

export const RESOURCE_IDS_BY_CTA_TIER = Object.freeze({
  URGENT: ['healthier_sg', 'active_health'],
  CLINICAL: ['active_health', 'healthier_sg'],
  COMMUNITY: ['aic_aac', 'pa_courses'],
  SOCIAL_CARE: ['singhealth_careline', 'aic_aac', 'touch_community'],
  WELLBEING: ['mental_wellness', 'touch_community'],
  FREE_FIRST: ['start2move', 'financial_chas', 'pa_courses'],
  START: ['start2move', 'pa_courses'],
  LEVEL_UP: ['active_health', 'activesg_gym'],
  ADVANCED: ['activesg_gym', 'active_health'],
});

export const REGIONAL_RESOURCE_ID_BY_CLUSTER = Object.freeze({
  SingHealth: 'singhealth_healthup',
  NUHS: 'nuhs_chp',
  NHG: 'nhg_coaches',
});

const resourcesForIds = (ids) => ids.map((id) => COMMUNITY_RESOURCES[id]);

/**
 * Deterministic public resource selection. Ordering is user-visible because the
 * result is capped at six cards, so preserve it when maintaining this function.
 */
/**
 * ==============================================================================
 * MEASUREMENT VENUES — where a resident can have grip or sit-to-stand measured
 * ==============================================================================
 *
 * `CD17` settled that NEXUS never administers either test; it accepts a value
 * measured elsewhere and routes people to where measurement actually happens. This
 * is that routing list, and it is deliberately NOT the general resource plan: a
 * place being a good exercise resource does not mean it will put a dynamometer in
 * somebody's hand.
 *
 * ⚠️ A VENUE APPEARS HERE ONLY WHEN SOMEBODY WITH AUTHORITY HAS CONFIRMED IT.
 *    `CP8` governs factual claims on live public surfaces, and this is one of the
 *    strongest: it sends a cost-constrained resident on a bus journey. Two fields
 *    are therefore both required before a venue is shown, and `measurementVenues`
 *    filters out anything missing either:
 *
 *      `measures`  which assessments the venue actually performs
 *      `access`    how a resident gets seen and what it costs, in all four
 *                  languages, because that is what decides whether the journey is
 *                  worth making
 *
 *    A venue with `measures` but no `access` is a venue somebody has half-confirmed.
 *    It stays invisible rather than being shown with the cost left vague.
 */
export const MEASUREMENT_IDS = Object.freeze(['grip', 'sts-30s', 'sts-60s']);

/**
 * Which venues perform which assessments. Owner-confirmed entries only.
 *
 * `ssmc_kkh` confirmed 2026-09-12 by the service lead, who is the Lead and Senior
 * Exercise Physiologist there and can speak for it. The `access` copy is still
 * outstanding, so it does not yet surface; see the ledger row for P9.
 *
 * Active Health Labs, Active Ageing Centres and polyclinics are DELIBERATELY absent.
 * They are plausible and unconfirmed, and the preview that showed them said so.
 */
export const VENUE_MEASURES = Object.freeze({
  ssmc_kkh: Object.freeze(['grip', 'sts-30s', 'sts-60s']),
});

/**
 * Venues that can measure `measurement` for a resident, ready to show. Returns []
 * rather than a partial list when nothing is fully confirmed, so the caller renders
 * "we do not have a confirmed place near you yet" instead of a half-true one.
 */
export const measurementVenues = (measurement) => Object.keys(VENUE_MEASURES)
  .filter((id) => VENUE_MEASURES[id].includes(measurement))
  .map((id) => COMMUNITY_RESOURCES[id])
  .filter((resource) => Boolean(resource && resource.access));

export const generateCommunityResourcePlan = (riskTier, ctaTier, data = {}, postalSector) => {
  const cluster = clusterForSector(postalSector);
  const plan = resourcesForIds(['ssmc_kkh', 'spag']);
  const tierIds = ctaTier ? RESOURCE_IDS_BY_CTA_TIER[ctaTier] : null;

  if (tierIds) plan.push(...resourcesForIds(tierIds));
  else if (riskTier === 'Red') plan.push(...resourcesForIds(['healthier_sg', 'active_health']));
  else if (riskTier === 'Amber') plan.push(...resourcesForIds(['start2move', 'pa_courses']));
  else plan.push(...resourcesForIds(['activesg_gym', 'pa_courses']));

  const regionalId = REGIONAL_RESOURCE_ID_BY_CLUSTER[cluster];
  if (regionalId) plan.push(COMMUNITY_RESOURCES[regionalId]);

  if (data.psychoFlag || data.sdohPsychological) plan.push(COMMUNITY_RESOURCES.mental_wellness);
  if (data.sdohFinancial) plan.push(...resourcesForIds(['financial_chas', 'touch_community']));
  if (data.sdohSocial) {
    if (cluster === 'SingHealth') plan.push(COMMUNITY_RESOURCES.singhealth_careline);
    plan.push(...resourcesForIds(['aic_aac', 'touch_community']));
  }
  if (data.gender === 'Female' && (data.age === '41-60' || data.age === '60+')) {
    plan.push(COMMUNITY_RESOURCES.society_wings);
  }

  const seen = new Set();
  return plan
    .filter((resource) => {
      if (seen.has(resource.id)) return false;
      seen.add(resource.id);
      return true;
    })
    .slice(0, 6);
};
