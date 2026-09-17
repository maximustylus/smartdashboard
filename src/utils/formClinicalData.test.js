import { describe, expect, it } from 'vitest';
import { FALLS_CHIPS } from '../data/screeningChips';
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
  /*
    ⚠️ THE AGE AND THE FALLS ANSWER HAVE TO AGREE, SINCE `CP34`. This fixture used
       to be a 52-year-old who had answered the falls question — a resident who
       cannot exist, because the question is only rendered from 60. It passed
       because `deriveFormClinicalData` read the field regardless, which was the
       defect. The age is now 65 so the answer is one a real person could give.
  */
  falls: 'No falls',
  healthierSg: 'Yes, I am enrolled',
  foodInsecure: false,
  housing: 'HDB 4 Room',
  race: 'Chinese',
  postalCode: '560123',
  ageYears: '65',
  gender: 'Female',
  previousId: ' nx-ab12cd ',
  ...overrides,
});

describe('deriveFormClinicalData', () => {
  /**
   * ==============================================================================
   * ⚠️ `CP34` — A HIDDEN FIELD KEEPS ITS ANSWER
   * ==============================================================================
   *
   * The falls question renders only for residents aged 60 and over, and the
   * strength block only where a published reference exists. Hiding a field does not
   * clear it, and this function used to read them regardless:
   *
   *     enter age 65 -> answer "two or more falls" -> change the age to 20
   *
   * derived `fallsCount: 2, fallsRisk: true, fallsAsked: true` for a 20-year-old.
   * It reached the record, printed on the handover slip as fact, and changed the
   * routing. The chat never asks at that age, so the two pathways also disagreed
   * about the same person.
   */
  const stale = (over) => ({
    pavsDays: '3–4 days', pavsMins: '45–60 mins', strength: '2 days a week',
    medical: [], barriers: [], social: 'I have one or two close people',
    wellbeing: 'Feeling good overall', foodInsecure: false, housing: 'HDB 4 Room',
    race: 'Chinese', postalCode: '730123', gender: 'Female', previousId: '',
    healthierSg: 'Yes, I am enrolled', ageYears: '65',
    falls: FALLS_CHIPS.en[2], gripKg: '22', sitToStand: '12',
    measureSetting: 'At a community event',
    ...over,
  });

  it('ignores a falls answer left behind when the age dropped below 60', () => {
    const r = deriveFormClinicalData(stale({ ageYears: '20' }));
    expect(r.fallsCount).toBe(0);
    expect(r.fallsRisk).toBe(false);
    // ⚠️ NOT ASKED, which is different from "no falls" and must stay different.
    expect(r.fallsAsked).toBe(false);
  });

  it('ignores strength figures left behind when the age dropped below 20', () => {
    const r = deriveFormClinicalData(stale({ ageYears: '18' }));
    expect(r.functional.grip.value).toBeNull();
    expect(r.functional.sitToStand.value).toBeNull();
    expect(r.functionalStorable).toEqual({ grip: null, sitToStand: null });
  });

  // And the answers of somebody who WAS asked must still be read, or the fix would
  // have quietly deleted the feature rather than corrected it.
  it('still reads both when the age says the question was asked', () => {
    const r = deriveFormClinicalData(stale({}));
    expect(r.fallsAsked).toBe(true);
    expect(r.fallsCount).toBe(2);
    expect(r.functional.grip.ok).toBe(true);
    expect(r.functional.sitToStand.protocol).toBe('sts-30s');
  });

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
      housingType: 'HDB 4 Room',
      postalSector: '56',
      age: '60+',
      ageYears: 65,
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
        // 65, so the thirty-second chair stand is the protocol their age selects.
        sitToStand: { ok: false, reason: 'missing', value: null, protocol: 'sts-30s' },
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
    [{ wellbeing: 'Overwhelmed by financial pressure' }, 'sdohPsychological'],
  ])('maps controlled social answer %# to %s', (override, flag) => {
    expect(deriveFormClinicalData(answers(override))[flag]).toBe(true);
  });

  it('maps caregiving strain to both psychological and caregiver flags', () => {
    expect(deriveFormClinicalData(answers({ wellbeing: 'Overwhelmed by caregiving' })))
      .toMatchObject({
        sdohPsychological: true,
        psychoFlag: true,
        caregiverStrain: true,
      });
  });

  it('preserves the shared falls and Healthier SG parser semantics', () => {
    expect(deriveFormClinicalData(answers({
      // The value the form actually stores, read from the shared chips so this
      // fixture cannot drift from what a resident can select.
      falls: FALLS_CHIPS.en[3],
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
