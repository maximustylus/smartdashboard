import { describe, expect, it } from 'vitest';
import {
  DAYS_MIDPOINT,
  MINS_MIDPOINT,
  deriveFormClinicalData,
} from './formClinicalData';

const answers = (overrides = {}) => ({
  pavsDays: '3–4 days',
  pavsMins: '45–60 mins',
  strength: '2 days a week',
  medical: ['No conditions or symptoms'],
  barriers: ['No barriers for me'],
  incomeAdequacy: 'Adequate',
  social: 'I have several people I can rely on',
  wellbeing: 'Feeling good overall',
  falls: 'No falls',
  healthierSg: 'Yes, I am enrolled',
  foodInsecure: false,
  housing: 'HDB 3-5 Room',
  race: 'Chinese',
  postalCode: '560123',
  ageYears: '52',
  gender: 'Female',
  previousId: ' nx-ab12cd ',
  ...overrides,
});

describe('deriveFormClinicalData', () => {
  it('converts a completed low-risk form into the shared result contract', () => {
    expect(deriveFormClinicalData(answers())).toEqual({
      pavsScore: 182,
      pavsDays: 3.5,
      pavsMinutes: 52,
      strengthDays: 2,
      medFlag: false,
      symptomFlag: false,
      sdohFinancial: false,
      sdohSocial: false,
      sdohPsychological: false,
      caregiverStrain: false,
      fallsCount: 0,
      fallsRisk: false,
      fearOfFalling: false,
      fallsAsked: true,
      healthierSgEnrolled: true,
      psychoFlag: false,
      sdohFoodInsecure: false,
      sdohHousing: false,
      ethnicity: 'Chinese',
      housingType: 'HDB 3-5 Room',
      postalSector: '56',
      age: '41-60',
      ageYears: 52,
      gender: 'Female',
      previousId: 'NX-AB12CD',
      /*
        ⚠️ A SKIPPED MEASUREMENT IS `missing`, NOT A ZERO AND NOT AN ERROR. This
           fixture gives neither figure, which is what most residents will do, and
           the contract has to say so in a shape the report can render a sentence
           from. `functionalStorable` being null on both is the privacy default:
           nothing is aggregated for somebody who was never measured.
      */
      functional: {
        grip: { ok: false, reason: 'missing', value: null },
        sitToStand: { ok: false, reason: 'missing', value: null, protocol: 'sts-60s' },
        setting: null,
      },
      functionalStorable: { grip: null, sitToStand: null },
    });
  });

  it.each(Object.entries(DAYS_MIDPOINT))(
    'maps activity frequency %s to %s days',
    (value, expected) => {
      expect(deriveFormClinicalData(answers({ pavsDays: value })).pavsDays).toBe(expected);
    },
  );

  it.each(Object.entries(MINS_MIDPOINT))(
    'maps activity duration %s to %s minutes',
    (value, expected) => {
      expect(deriveFormClinicalData(answers({ pavsMins: value })).pavsMinutes).toBe(expected);
    },
  );

  it('forces minutes and weekly score to zero when activity frequency is zero', () => {
    expect(deriveFormClinicalData(answers({ pavsDays: '0 days', pavsMins: '60+ mins' })))
      .toMatchObject({ pavsDays: 0, pavsMinutes: 0, pavsScore: 0 });
  });

  it.each([
    ['No strength training', 0],
    ['1 day a week', 1],
    ['2 days a week', 2],
    ['3+ days a week', 3],
  ])('maps strength answer %s to %s days', (value, expected) => {
    expect(deriveFormClinicalData(answers({ strength: value })).strengthDays).toBe(expected);
  });

  it.each([
    ['High blood pressure', 'medFlag'],
    ['Prediabetes or diabetes', 'medFlag'],
    ['Heart condition', 'medFlag'],
    ['Dizziness or chest pain when active', 'symptomFlag'],
  ])('maps medical answer %s to %s', (value, flag) => {
    expect(deriveFormClinicalData(answers({ medical: [value] }))[flag]).toBe(true);
  });

  it('lets the exclusive no-condition answer suppress contradictory medical flags', () => {
    const result = deriveFormClinicalData(answers({
      medical: [
        'No conditions or symptoms',
        'Heart condition',
        'Dizziness or chest pain when active',
      ],
    }));
    expect(result).toMatchObject({ medFlag: false, symptomFlag: false });
  });

  it.each([
    [{ barriers: ['Too expensive'] }, 'sdohFinancial'],
    [{ barriers: ['Too far away'] }, 'sdohFinancial'],
    [{ incomeAdequacy: 'Inadequate' }, 'sdohFinancial'],
    [{ social: 'I mostly manage on my own' }, 'sdohSocial'],
    [{ social: 'I feel quite isolated' }, 'sdohSocial'],
    [{ wellbeing: 'Some stress but managing' }, 'sdohPsychological'],
    [{ wellbeing: 'Feeling quite stressed or low' }, 'sdohPsychological'],
    [{ wellbeing: 'Overwhelmed — financial pressure' }, 'sdohPsychological'],
  ])('maps controlled social answer %# to %s', (override, flag) => {
    expect(deriveFormClinicalData(answers(override))[flag]).toBe(true);
  });

  it('maps caregiving strain to both psychological and caregiver flags', () => {
    expect(deriveFormClinicalData(answers({ wellbeing: 'Overwhelmed — caregiving' })))
      .toMatchObject({
        sdohPsychological: true,
        psychoFlag: true,
        caregiverStrain: true,
      });
  });

  it('preserves the shared falls and Healthier SG parser semantics', () => {
    expect(deriveFormClinicalData(answers({
      falls: 'A fall, and I now avoid some activities',
      healthierSg: 'I am not sure',
    }))).toMatchObject({
      fallsCount: 1,
      fallsRisk: true,
      fearOfFalling: true,
      fallsAsked: true,
      healthierSgEnrolled: null,
    });
  });

  it('sets food and housing flags only from their exact controlled answers', () => {
    expect(deriveFormClinicalData(answers({
      foodInsecure: true,
      housing: 'HDB 1-2 Room',
    }))).toMatchObject({ sdohFoodInsecure: true, sdohHousing: true });
  });

  it('handles incomplete or degraded input without inventing known answers', () => {
    [undefined, null, [], 'answers', {
      medical: 'Heart condition',
      barriers: 'Too expensive',
      previousId: 123,
    }].forEach((input) => {
      expect(() => deriveFormClinicalData(input)).not.toThrow();
      expect(deriveFormClinicalData(input)).toMatchObject({
        pavsScore: 0,
        pavsDays: 0,
        pavsMinutes: 0,
        strengthDays: 0,
        medFlag: false,
        symptomFlag: false,
        sdohFinancial: false,
        sdohSocial: false,
        sdohPsychological: false,
        caregiverStrain: false,
        fallsAsked: false,
        healthierSgEnrolled: null,
        ethnicity: 'Unknown',
        housingType: 'Unknown',
        postalSector: null,
        age: 'Unknown',
        gender: 'Unknown',
        previousId: null,
      });
    });
  });
});
