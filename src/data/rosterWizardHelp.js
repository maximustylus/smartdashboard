/**
 * ==============================================================================
 * THE CONFIGURE WIZARD'S HELP COPY — every explanation, in one place
 * ==============================================================================
 *
 * Until v2.15.0 the wizard explained every setting inline, in full, whether or
 * not anybody was touching it: 42 paragraphs and about 1,800 words on screen by
 * default. The explanations were right; they were just always on. They now live
 * here, and the screen shows them in three layers:
 *
 *   1. INLINE stays only for what depends on the CURRENT STATE — a validation
 *      error, "this ruler cannot show the boundaries in force", a one-line
 *      status under a control. Those are written beside the control, not here.
 *   2. AN INFO BUTTON per setting (`FieldHint`) opens the paragraph that used to
 *      be inline. `WIZARD_HELP` below is what it opens.
 *   3. A STEP GUIDE per wizard step (`WizardStep`'s `guide`) carries the
 *      narrative: what to decide here, what a good example looks like, what
 *      happens next. `WIZARD_STEP_GUIDES` below is what it shows.
 *
 * WHY A DATA FILE. The community chat copy already lives in `communityChatCopy.js`
 * with tests pinning it, for the same reason: text in one reviewable place, with
 * stable ids, means the popover, the step guide and any future in-app guide read
 * the same words, and a reviewer can read all of them without opening a JSX
 * tree. `rosterWizardHelp.test.js` checks that every id a component asks for
 * exists here, and that nothing here says something the product no longer does.
 *
 * PLAIN STRINGS, NO MARKUP. A `body` is a list of paragraphs; a `caution` is one
 * paragraph the popover renders in amber. Emphasis that the inline version
 * carried in `<span className="font-bold">` is carried by the wording instead.
 *
 * NOTHING HERE IS A DEFAULT OR A RECOMMENDATION. The owner's decision
 * (2026-09-17): the wizard does not mark any choice as recommended. A hint says
 * what a setting does and what it costs; the choice stays the department's.
 * ==============================================================================
 */

/** One entry per setting. `title` is the popover heading and the button's accessible name. */
export const WIZARD_HELP = Object.freeze({
    bands: Object.freeze({
        title: 'Grade bands',
        body: Object.freeze([
            'Where this department cuts the allied-health scale into junior, senior and principal. Drag a divider, or focus one and use the arrow keys; Home and End jump to how far it can go.',
            'Every task’s “who may lead” is resolved against these boundaries, so a change here changes the grade ranges shown beside every task immediately.',
        ]),
    }),
    hours: Object.freeze({
        title: 'Working hours',
        body: Object.freeze([
            'Hours are always counted. Leave both boxes blank and AURA uses the standard week and the day it derives from it, scaled by each person’s FTE; a task with no length of its own counts as one session. Type a number here only to override that.',
            'Same-day durations add up against the daily limit and one week’s against the weekly one. A duty that would breach either is reported as not staffed, with the hours named, rather than quietly assigned.',
        ]),
    }),
    limits: Object.freeze({
        title: 'Department limits',
        body: Object.freeze([
            'How much any one person may be asked to do, and who must not be put together. All of these are hard: a duty that would break one is reported as not staffed, with the limit named, rather than quietly assigned.',
            'Leave a box empty and AURA uses the figure shown in it.',
        ]),
    }),
    standbySecond: Object.freeze({
        title: 'The second person is a standby',
        body: Object.freeze([
            'Tick this if your second person is named to step in when the lead cannot make it: they know the clinic, but they are not in the room. AURA then stops charging them the session’s hours and stops counting it against their duties-per-day, because they are not working it.',
            'Leave it off if the second person genuinely works the session alongside the lead. That is how AURA has always counted them, and every roster already generated assumed it.',
        ]),
        caution: 'A standby still has to be somebody who could run the clinic: the same grade and skill rules apply. What AURA cannot yet check is whether they are free at that hour. It knows how long a duty takes but not when it starts, so it will not stop somebody being standby for a clinic that clashes with one they are leading.',
    }),
    rotateWeekly: Object.freeze({
        title: 'Rotate duties weekly',
        body: Object.freeze([
            'One person leads a duty for the whole week, then it passes to whoever has been away from it longest. In a team of five, a duty comes back to the same person every fifth week. It applies to every duty, including one that only runs a day or two.',
            'Leave it off and AURA decides each day on its own. That shares the work evenly, but it moves people between duties most mornings.',
            'Leave still applies. If the week’s lead is away on the Wednesday, somebody stands in for that day and they take the duty back on the Thursday; the week does not change hands over one absence.',
        ]),
    }),
    maxConcurrentPerDay: Object.freeze({
        title: 'Most duties in one day',
        body: Object.freeze([
            'The department’s ceiling on how many duties one person holds on one day. Anyone may be given their own figure under Limits & dates in the staff table, and their own figure replaces this one for them.',
        ]),
    }),
    maxConsecutiveDays: Object.freeze({
        title: 'Most days in a row',
        body: Object.freeze([
            'The longest run of consecutive working days AURA will roster for one person. Counted inside this run only: the day before the run starts is not known to it.',
        ]),
    }),
    forbidPairs: Object.freeze({
        title: 'Never on the same shift',
        body: Object.freeze([
            'Two people who must not be rostered onto one duty together: a supervision conflict, a household, a grievance. AURA will leave the second half of a shift unstaffed and say so rather than pair them.',
            'The two pickers offer the names in the staff table, so a pair can never name somebody who is not in the department.',
        ]),
    }),
    staffTable: Object.freeze({
        title: 'Staff',
        body: Object.freeze([
            'Leave a grade as Not recorded and AURA keeps that person out of every band-restricted lead slot and says so by name in the warnings. It will not guess a grade for them.',
            'FTE defaults to 1.0; a blank FTE is full time. The days-a-week line under it is that figure spread over the days a week your tasks are ticked for. Away is a comma-separated list of single dates.',
            'Limits & dates opens the rest of a person: how many duties they may hold in one day, a short name for calendars, and, for a rotation, a placement or a locum, the block of dates they are available at all. Away is for single days off; a window is for months at a time.',
        ]),
    }),
    staffMaxPerDay: Object.freeze({
        title: 'This person’s most duties in one day',
        body: Object.freeze([
            'Blank means this person follows the department’s figure, set under Department limits. A number here replaces it for them, higher or lower, and it is hard: a third duty on a day they are capped at two is reported as not staffed, not assigned.',
        ]),
    }),
    shortName: Object.freeze({
        title: 'Short name for calendars',
        body: Object.freeze([
            'A few characters used in the calendar and in the exported .ics in place of this person’s full name; an event title on a phone shows about thirty characters. The .csv keeps full names. Blank keeps the full name here too.',
            'No commas or semicolons: a calendar reads those as separators.',
        ]),
    }),
    windows: Object.freeze({
        title: 'Available only between these dates',
        body: Object.freeze([
            'For a rotation, a placement, a secondment or a locum: a block of months that is theirs, rather than the Away column’s list of single days off. Add nothing and they are available on every date, which is what everybody in a department without rotations is.',
            'Dates are YYYY-MM-DD. Leave “from” blank for “from the start of the run” and “to” blank for “until the end of it”. Task names must match the task table exactly; separate several with commas.',
        ]),
        caution: 'Adding even one window makes this person available only inside their windows, not “available as usual, plus these”. Two windows are read as either one. A window that names tasks admits only those tasks, so somebody whose one window names a single clinic is on that clinic or on nothing.',
    }),
    taskTable: Object.freeze({
        title: 'Tasks',
        body: Object.freeze([
            'Ticking two bands makes both equally eligible to lead; it is not a preference order. Bands gate the lead only: anyone may co-lead, which is what makes a band-gated task a supervision pairing rather than a closed shop.',
            'Minimum grade is a different question from the chips: it is the lowest grade anybody on the duty may hold, lead and co-lead alike.',
            'Repeat, hours & limits opens the rest of a task: whether it repeats weekly or on the 3rd Wednesday of the month, how long one session takes, whether it needs a whole team on the shift at once instead of a lead and a co-lead, whether the same person should keep it, how many of it any one person may take, and what to call it.',
        ]),
    }),
    taskRepeat: Object.freeze({
        title: 'How often it repeats',
        body: Object.freeze([
            'Every week means on the weekdays ticked in the Days column. Once a month is for a clinic that runs on the 3rd Wednesday, or the last Friday, of each month.',
            'Last is not the same as 4th: most months hold four of a weekday and some hold five. There is no 5th option because a 5th-Wednesday clinic would silently vanish in most months.',
            'While a task is monthly its Days chips do not apply; a task repeats weekly or monthly, never both. The ticked days are kept, so switching back restores them.',
        ]),
    }),
    taskHours: Object.freeze({
        title: 'Hours per session',
        body: Object.freeze([
            'Blank means one session, which is what these teams roster in. Typing any length here starts AURA counting hours for the whole run, even if the department boxes under Working hours are empty.',
        ]),
    }),
    taskStaffing: Object.freeze({
        title: 'How this shift is staffed',
        body: Object.freeze([
            'Lead + co-lead is one person in charge, plus a second alongside if the Co-lead box is ticked.',
            'A team of slots is for a shift that needs three or four named people together, a principal, a senior and a junior on the same session. One line per person the shift needs, filled independently. The lead is whoever ends up on it holding the highest grade; there is no lead slot to pick. If one line cannot be filled the others still are, with the empty one reported by name. Listing a band first does not make it more likely to be staffed.',
            'A skill only narrows a slot: somebody in the staff pool has to hold it already, or AURA refuses the whole run and says so. A team typed in by hand has no skills, so leave the skill blank for them.',
            'While a task is a team, its “who may lead” chips and its co-lead box do not apply. A band goes on the slot that must hold it, and the co-lead is simply the second person on the shift.',
        ]),
    }),
    taskContinuity: Object.freeze({
        title: 'Continuity of care',
        body: Object.freeze([
            'Same lead asks for the same person to lead every occurrence of this task, where they can. It never beats a hard limit: an incumbent who is on leave, at their daily limit or out of band loses the slot to the next person, and AURA counts every change of lead and names it in the warnings, so you find out when continuity broke, and why.',
            'Not available while a task is a team of slots: the lead of a team shift is whichever assignee holds the highest grade, so there is no lead slot to keep with one person.',
        ]),
        caution: 'What it costs: this task’s lead stops being shared out fairly. Continuity beats FTE-weighted fairness for this one slot, so one colleague carries every occurrence and the others carry none.',
    }),
    taskQuota: Object.freeze({
        title: 'How many of these one person takes',
        body: Object.freeze([
            'At most is hard: a duty that would take somebody past it is reported as not staffed, with the count named. At least is a preference, not a guarantee. A floor cannot be met by inventing capacity, so AURA prefers whoever is behind for every occurrence it can and then names anybody still short in the warnings. Leave both blank for no limit at all.',
            'Counted in duties, not hours, and only over whole periods inside the run; a month the run only half covers is reported as a partial period rather than judged. A floor nobody could possibly meet is refused before generating, with the arithmetic shown.',
        ]),
    }),
    taskCategory: Object.freeze({
        title: 'Category',
        body: Object.freeze([
            'What kind of work this is. Four standard categories are colour-coded in the calendar and travel into the downloaded .ics: Clinical, Education, Research, Management. Any other word still works; a weekend floor pools over whatever category its tasks carry. Blank means the engine’s default.',
        ]),
    }),
    shapePicker: Object.freeze({
        title: 'Shape to start from',
        body: Object.freeze([
            'Every shape here is a structure a team described, how their duties, grades and weekends fit together, not a description of anybody else’s service. Pick the one closest to how your team works and it fills the tables below; everything it loads stays editable, including the parts that make it interesting.',
            'Or start blank and type your own team: a name alone is enough.',
        ]),
    }),
    liveShapePicker: Object.freeze({
        title: 'Shape to start from',
        body: Object.freeze([
            'A shape is a structure another team described: its duties, grade bands, hours and limits, not its people. Loading one replaces the tasks, bands, hours and limits on this screen with that team’s, so you edit a filled form instead of an empty one. Your staff are always your team.',
            'Nothing is saved until you generate. Choose “Keep what is configured” to leave the screen as it is.',
        ]),
    }),
});

/**
 * One entry per wizard step (`WIZARD_STEPS` in `rosterWizard.js`), keyed by step
 * id. `decide` is the question this step answers, `example` is what a sensible
 * answer looks like, `next` is what happens with it. Short on purpose: the step
 * guide is a walk-through, and the detail is behind each setting’s info button.
 */
export const WIZARD_STEP_GUIDES = Object.freeze({
    team: Object.freeze({
        decide: 'Whose roster this is, and what structure to start from.',
        example: 'A respiratory team picks the shape closest to how it already runs and edits the parts that differ, rather than describing its week from a blank page.',
        next: 'The shape fills the steps below. Everything it loads stays editable.',
    }),
    period: Object.freeze({
        decide: 'The Monday the roster starts on, and how many weeks it covers.',
        example: 'Cardiology rosters four weeks at a time and regenerates before the next block; a lab that rotates monthly rosters a whole quarter.',
        next: 'Every date-based rule below, leave, availability windows, monthly clinics, is resolved inside this window and nowhere else.',
    }),
    bands: Object.freeze({
        decide: 'Where your department draws the lines between junior, senior and principal on the AH7–AH17 scale.',
        example: 'Most departments cut at AH11 and AH13; a service whose seniors start at AH14 drags one divider one grade to the right.',
        next: 'Each task’s “who may lead” chips read these bands, so the grade ranges beside every task change with them.',
    }),
    hours: Object.freeze({
        decide: 'Whether to override the standard working week and the longest working day.',
        example: 'A department on a 42-hour week leaves both boxes blank; a service contracted at 40 types 40 and lets the day follow.',
        next: 'Sessions add up against these limits, scaled by each person’s FTE, and a duty that would breach them is reported as not staffed.',
    }),
    limits: Object.freeze({
        decide: 'How much any one person may be asked to do, whether duties rotate weekly, whether the second person is a standby, and who must never share a shift.',
        example: 'A team that hands each duty round week by week ticks weekly rotation; a clinic whose second name is on call ticks standby.',
        next: 'These are hard limits: a duty that would break one is reported as not staffed, with the limit named.',
    }),
    staff: Object.freeze({
        decide: 'Who is in the pool, their grade and FTE, and the dates they are away or only available.',
        example: 'A 0.6-FTE colleague on a three-month placement gets an FTE of 0.6 and one availability window covering the placement.',
        next: 'Grades decide which band-gated duties somebody may lead; FTE weights the fairness of the spread.',
    }),
    tasks: Object.freeze({
        decide: 'The duties to fill: which days each runs, who may lead it, whether it takes a co-lead or a whole team, and how long a session is.',
        example: 'A room that needs three people at once is one task staffed as a team of slots; a Tuesday clinic that one senior always runs is a weekly task with continuity of care switched on.',
        next: 'Draft the roster. Anything the rules could not fill is listed by name, with the rule that blocked it.',
    }),
});

/** The help entry for a setting, or `null` for an id nothing has copy for. */
export const helpFor = (id) => (Object.prototype.hasOwnProperty.call(WIZARD_HELP, id) ? WIZARD_HELP[id] : null);

/** The step guide for a wizard step, or `null`. */
export const stepGuideFor = (stepId) =>
    (Object.prototype.hasOwnProperty.call(WIZARD_STEP_GUIDES, stepId) ? WIZARD_STEP_GUIDES[stepId] : null);
