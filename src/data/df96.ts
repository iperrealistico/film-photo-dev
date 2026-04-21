export type Df96AgitationMode = 'constant' | 'intermittent' | 'minimal';
export type Df96RatingBand = 'pull' | 'normal' | 'push';
export type Df96MatrixOutcomeKey =
  | 'unsupported'
  | 'pull_full'
  | 'pull_half'
  | 'normal'
  | 'push_half'
  | 'push_full'
  | 'push_two'
  | 'film_3200';

export interface Df96MatrixCell {
  agitationMode: Df96AgitationMode;
  baseTimeSec: number;
  band?: Df96RatingBand;
  outcomeKey: Df96MatrixOutcomeKey;
  outcomeLabel: string;
  temperatureC: number;
  temperatureF: number;
}

export interface Df96RatingOption {
  band: Df96RatingBand;
  id: string;
  isoLabel: string;
  multiplier: number;
  multiplierLabel?: string;
  notes?: string[];
  supports3200Cell?: boolean;
}

export interface Df96FilmSpec {
  advisoryNotes?: string[];
  id: string;
  label: string;
  legacyAliases?: string[];
  ratingOptions: Df96RatingOption[];
}

export const DF96_PULL_BAND_EXTRA_SEC = 60;
export const DF96_REUSE_STEP_SEC = 15;
export const DF96_MAX_REUSE_TIME_SEC = 8 * 60;
export const DF96_STANDARD_WASH_DEFAULT_SEC = 5 * 60;
export const DF96_UNIT_HELPER_TEXT =
  '1 unit = one 135 roll, one 120 roll, one 8x10 sheet, or four 4x5 sheets. Count the total prior units this chemistry has already processed.';
export const DF96_LIFESPAN_NOTE =
  'Expected shelf life is 1 year from purchase. Once opened, CineStill says Df96 should ideally be used within 2 months.';
export const DF96_EXHAUSTION_NOTE =
  'CineStill says exhausted chemistry starts to yellow and eventually turns dark amber.';
export const DF96_SNIP_TEST_NOTE =
  'Before reusing opened chemistry, CineStill recommends a daylight snip test. The processed snippet should come out opaque black.';
export const DF96_ARCHIVAL_NOTE =
  'Longer Df96 time helps full fixing and dye removal, not development density.';
export const DF96_HIGH_SPEED_NOTE =
  'High-speed films like P3200 and Delta 3200 can be processed at native ISO 1000-1600 by the label instructions, or at 3200 by adding 10 F.';
export const DF96_TABULAR_GRAIN_NOTE =
  'Tabular-grain films with color-dye technology require double the minimum time to clear the pink or purple dyes in the emulsion.';
export const DF96_BERGGER_NOTE =
  'Bergger Pancro requires at least triple processing time and the manufacturer also calls for additional handling outside the standard Df96 monobath flow.';
export const DF96_RETRO_80S_NOTE =
  'CineStill notes that Rollei Retro 80S is best rated around ISO 25 for this process.';
export const DF96_STREET_PAN_NOTE =
  'CineStill notes that JCH Street Pan really shines around ISO 200 in Df96.';
export const DF96_CMS20_NOTE =
  'CineStill calls out Adox CMS 20 II as a special exception that reaches its full speed in dedicated developers, not in a generic Df96-style monobath.';
export const DF96_STANDARD_WASH_NOTE =
  'Archival wash: run water at room temperature for 5 minutes, or fill and empty the tank at least 10 times.';
export const DF96_MINIMAL_WASH_NOTE =
  'Minimal-water archival wash: 5 inversions, then 10, then 20, then a final rinse.';

export const df96AgitationOptions = [
  {
    detail: 'Continuous inversions and or rotations while changing direction.',
    id: 'constant',
    label: 'Constant agitation',
    summary: '3 min minimum'
  },
  {
    detail: '30 sec constant agitation, then 10 sec every minute.',
    id: 'intermittent',
    label: 'Intermittent agitation',
    summary: '4 min minimum'
  },
  {
    detail: '10 sec gentle agitation, then 5 sec every minute.',
    id: 'minimal',
    label: 'Minimal agitation',
    summary: '6 min minimum'
  }
] as const satisfies ReadonlyArray<{
  detail: string;
  id: Df96AgitationMode;
  label: string;
  summary: string;
}>;

export const df96WashModes = [
  {
    id: 'standard',
    label: 'Standard archival wash',
    summary: '5 min running-water wash'
  },
  {
    id: 'minimal',
    label: 'Minimal-water archival wash',
    summary: 'Guided 5 / 10 / 20 inversion sequence'
  }
] as const;

const matrixRows = [
  {
    temperatureF: 65,
    temperatureC: 18,
    constant: 'unsupported',
    intermittent: 'pull_full',
    minimal: 'pull_half'
  },
  {
    temperatureF: 70,
    temperatureC: 21,
    constant: 'pull_full',
    intermittent: 'pull_half',
    minimal: 'normal'
  },
  {
    temperatureF: 75,
    temperatureC: 24,
    constant: 'pull_half',
    intermittent: 'normal',
    minimal: 'push_half'
  },
  {
    temperatureF: 80,
    temperatureC: 27,
    constant: 'normal',
    intermittent: 'push_half',
    minimal: 'push_full'
  },
  {
    temperatureF: 85,
    temperatureC: 30,
    constant: 'push_half',
    intermittent: 'push_full',
    minimal: 'film_3200'
  },
  {
    temperatureF: 90,
    temperatureC: 32,
    constant: 'push_full',
    intermittent: 'film_3200',
    minimal: 'push_two'
  },
  {
    temperatureF: 95,
    temperatureC: 35,
    constant: 'film_3200',
    intermittent: 'push_two',
    minimal: 'unsupported'
  }
] as const satisfies ReadonlyArray<{
  constant: Df96MatrixOutcomeKey;
  intermittent: Df96MatrixOutcomeKey;
  minimal: Df96MatrixOutcomeKey;
  temperatureC: number;
  temperatureF: number;
}>;

function getBaseTimeSec(agitationMode: Df96AgitationMode) {
  switch (agitationMode) {
    case 'constant':
      return 3 * 60;
    case 'intermittent':
      return 4 * 60;
    case 'minimal':
      return 6 * 60;
  }
}

function getOutcomeLabel(outcomeKey: Df96MatrixOutcomeKey) {
  switch (outcomeKey) {
    case 'pull_full':
      return 'Pull -1';
    case 'pull_half':
      return 'Pull -1/2';
    case 'normal':
      return 'Normal';
    case 'push_half':
      return 'Push +1/2';
    case 'push_full':
      return 'Push +1';
    case 'push_two':
      return 'Push +2';
    case 'film_3200':
      return '3200 Film';
    case 'unsupported':
      return '---';
  }
}

function getOutcomeBand(outcomeKey: Df96MatrixOutcomeKey) {
  switch (outcomeKey) {
    case 'pull_full':
    case 'pull_half':
      return 'pull';
    case 'normal':
      return 'normal';
    case 'push_half':
    case 'push_full':
    case 'push_two':
    case 'film_3200':
      return 'push';
    case 'unsupported':
      return undefined;
  }
}

export const df96MatrixCells: Df96MatrixCell[] = matrixRows.flatMap((row) =>
  df96AgitationOptions.map((option) => {
    const outcomeKey = row[option.id];

    return {
      agitationMode: option.id,
      baseTimeSec: getBaseTimeSec(option.id),
      band: getOutcomeBand(outcomeKey),
      outcomeKey,
      outcomeLabel: getOutcomeLabel(outcomeKey),
      temperatureC: row.temperatureC,
      temperatureF: row.temperatureF
    };
  }),
);

export const df96Films: Df96FilmSpec[] = [
  {
    id: 'bwxx',
    label: 'CineStill BwXX',
    ratingOptions: [
      { id: 'pull', band: 'pull', isoLabel: 'ISO 100-125', multiplier: 1 },
      { id: 'normal', band: 'normal', isoLabel: 'ISO 200-400', multiplier: 1 },
      { id: 'push', band: 'push', isoLabel: 'ISO 500-800', multiplier: 1 }
    ]
  },
  {
    id: 'tri_x',
    label: 'Kodak Tri-X',
    legacyAliases: ['Tri-X 400'],
    ratingOptions: [
      { id: 'pull', band: 'pull', isoLabel: 'ISO 200', multiplier: 1 },
      { id: 'normal', band: 'normal', isoLabel: 'ISO 400', multiplier: 1 },
      { id: 'push', band: 'push', isoLabel: 'ISO 800', multiplier: 1 }
    ]
  },
  {
    id: 'tmax_100',
    label: 'Kodak Tmax 100',
    advisoryNotes: [DF96_TABULAR_GRAIN_NOTE],
    ratingOptions: [
      {
        id: 'pull',
        band: 'pull',
        isoLabel: 'ISO 25-50',
        multiplier: 2,
        multiplierLabel: '2x min',
        notes: [DF96_TABULAR_GRAIN_NOTE]
      },
      {
        id: 'normal',
        band: 'normal',
        isoLabel: 'ISO 80-100',
        multiplier: 2,
        multiplierLabel: '2x min',
        notes: [DF96_TABULAR_GRAIN_NOTE]
      },
      {
        id: 'push',
        band: 'push',
        isoLabel: 'ISO 125-200',
        multiplier: 2,
        multiplierLabel: '2x min',
        notes: [DF96_TABULAR_GRAIN_NOTE]
      }
    ]
  },
  {
    id: 'tmax_400',
    label: 'Kodak Tmax 400',
    advisoryNotes: [DF96_TABULAR_GRAIN_NOTE],
    ratingOptions: [
      {
        id: 'pull',
        band: 'pull',
        isoLabel: 'ISO 200',
        multiplier: 2,
        multiplierLabel: '2x min',
        notes: [DF96_TABULAR_GRAIN_NOTE]
      },
      {
        id: 'normal',
        band: 'normal',
        isoLabel: 'ISO 400',
        multiplier: 2,
        multiplierLabel: '2x min',
        notes: [DF96_TABULAR_GRAIN_NOTE]
      },
      {
        id: 'push',
        band: 'push',
        isoLabel: 'ISO 800',
        multiplier: 2,
        multiplierLabel: '2x min',
        notes: [DF96_TABULAR_GRAIN_NOTE]
      }
    ]
  },
  {
    id: 'tmax_p3200',
    label: 'Kodak Tmax P3200',
    advisoryNotes: [DF96_TABULAR_GRAIN_NOTE, DF96_HIGH_SPEED_NOTE],
    ratingOptions: [
      {
        id: 'pull',
        band: 'pull',
        isoLabel: 'ISO 1000',
        multiplier: 2,
        multiplierLabel: '2x min',
        notes: [DF96_TABULAR_GRAIN_NOTE, DF96_HIGH_SPEED_NOTE]
      },
      {
        id: 'normal',
        band: 'normal',
        isoLabel: 'ISO 1600',
        multiplier: 2,
        multiplierLabel: '2x min',
        notes: [DF96_TABULAR_GRAIN_NOTE, DF96_HIGH_SPEED_NOTE]
      },
      {
        id: 'push',
        band: 'push',
        isoLabel: 'ISO 3200',
        multiplier: 2,
        multiplierLabel: '2x min',
        notes: [DF96_TABULAR_GRAIN_NOTE, DF96_HIGH_SPEED_NOTE],
        supports3200Cell: true
      }
    ]
  },
  {
    id: 'plus_x',
    label: 'Kodak Plus-X',
    ratingOptions: [
      { id: 'pull', band: 'pull', isoLabel: 'ISO 50-60', multiplier: 1 },
      { id: 'normal', band: 'normal', isoLabel: 'ISO 100-125', multiplier: 1 },
      { id: 'push', band: 'push', isoLabel: 'ISO 200-250', multiplier: 1 }
    ]
  },
  {
    id: 'fp4_plus',
    label: 'Ilford FP4 Plus',
    ratingOptions: [
      { id: 'pull', band: 'pull', isoLabel: 'ISO 60', multiplier: 1 },
      { id: 'normal', band: 'normal', isoLabel: 'ISO 125', multiplier: 1 },
      { id: 'push', band: 'push', isoLabel: 'ISO 250', multiplier: 1 }
    ]
  },
  {
    id: 'hp5_plus',
    label: 'Ilford HP5 Plus',
    legacyAliases: ['HP5+ 400'],
    ratingOptions: [
      { id: 'pull', band: 'pull', isoLabel: 'ISO 200', multiplier: 1 },
      { id: 'normal', band: 'normal', isoLabel: 'ISO 400', multiplier: 1 },
      { id: 'push', band: 'push', isoLabel: 'ISO 800', multiplier: 1 }
    ]
  },
  {
    id: 'delta_100',
    label: 'Ilford Delta 100',
    advisoryNotes: [DF96_TABULAR_GRAIN_NOTE],
    ratingOptions: [
      {
        id: 'pull',
        band: 'pull',
        isoLabel: 'ISO 50',
        multiplier: 2,
        multiplierLabel: '2x min',
        notes: [DF96_TABULAR_GRAIN_NOTE]
      },
      {
        id: 'normal',
        band: 'normal',
        isoLabel: 'ISO 100',
        multiplier: 2,
        multiplierLabel: '2x min',
        notes: [DF96_TABULAR_GRAIN_NOTE]
      },
      {
        id: 'push',
        band: 'push',
        isoLabel: 'ISO 200',
        multiplier: 2,
        multiplierLabel: '2x min',
        notes: [DF96_TABULAR_GRAIN_NOTE]
      }
    ]
  },
  {
    id: 'delta_400',
    label: 'Ilford Delta 400',
    advisoryNotes: [DF96_TABULAR_GRAIN_NOTE],
    ratingOptions: [
      {
        id: 'pull',
        band: 'pull',
        isoLabel: 'ISO 200',
        multiplier: 2,
        multiplierLabel: '2x min',
        notes: [DF96_TABULAR_GRAIN_NOTE]
      },
      {
        id: 'normal',
        band: 'normal',
        isoLabel: 'ISO 400',
        multiplier: 2,
        multiplierLabel: '2x min',
        notes: [DF96_TABULAR_GRAIN_NOTE]
      },
      {
        id: 'push',
        band: 'push',
        isoLabel: 'ISO 800',
        multiplier: 2,
        multiplierLabel: '2x min',
        notes: [DF96_TABULAR_GRAIN_NOTE]
      }
    ]
  },
  {
    id: 'delta_3200',
    label: 'Ilford Delta 3200',
    advisoryNotes: [DF96_TABULAR_GRAIN_NOTE, DF96_HIGH_SPEED_NOTE],
    ratingOptions: [
      {
        id: 'pull',
        band: 'pull',
        isoLabel: 'ISO 500',
        multiplier: 2,
        multiplierLabel: '2x min',
        notes: [DF96_TABULAR_GRAIN_NOTE, DF96_HIGH_SPEED_NOTE]
      },
      {
        id: 'normal',
        band: 'normal',
        isoLabel: 'ISO 1000-1600',
        multiplier: 2,
        multiplierLabel: '2x min',
        notes: [DF96_TABULAR_GRAIN_NOTE, DF96_HIGH_SPEED_NOTE]
      },
      {
        id: 'push',
        band: 'push',
        isoLabel: 'ISO 2000-3200',
        multiplier: 2,
        multiplierLabel: '2x min',
        notes: [DF96_TABULAR_GRAIN_NOTE, DF96_HIGH_SPEED_NOTE],
        supports3200Cell: true
      }
    ]
  },
  {
    id: 'pan_f_plus',
    label: 'Ilford Pan F Plus',
    ratingOptions: [
      { id: 'pull', band: 'pull', isoLabel: 'ISO 25', multiplier: 1 },
      { id: 'normal', band: 'normal', isoLabel: 'ISO 50', multiplier: 1 },
      { id: 'push', band: 'push', isoLabel: 'ISO 100', multiplier: 1 }
    ]
  },
  {
    id: 'street_pan',
    label: 'JCH Street Pan',
    advisoryNotes: [DF96_STREET_PAN_NOTE],
    ratingOptions: [
      { id: 'pull', band: 'pull', isoLabel: 'ISO 100', multiplier: 1 },
      {
        id: 'normal',
        band: 'normal',
        isoLabel: 'ISO 200',
        multiplier: 1,
        notes: [DF96_STREET_PAN_NOTE]
      },
      { id: 'push', band: 'push', isoLabel: 'ISO 400', multiplier: 1 }
    ]
  },
  {
    id: 'silvermax',
    label: 'Adox Silvermax',
    ratingOptions: [
      { id: 'pull', band: 'pull', isoLabel: 'ISO 25-50', multiplier: 1 },
      { id: 'normal', band: 'normal', isoLabel: 'ISO 80-100', multiplier: 1 },
      { id: 'push', band: 'push', isoLabel: 'ISO 125-200', multiplier: 1 }
    ]
  },
  {
    id: 'chs_100_ii',
    label: 'Adox CHS 100 II',
    advisoryNotes: [DF96_CMS20_NOTE],
    ratingOptions: [
      { id: 'pull', band: 'pull', isoLabel: 'ISO 25-50', multiplier: 1 },
      { id: 'normal', band: 'normal', isoLabel: 'ISO 50-100', multiplier: 1 },
      { id: 'push', band: 'push', isoLabel: 'ISO 125-200', multiplier: 1 }
    ]
  },
  {
    id: 'kentmere_100',
    label: 'Kentmere 100',
    ratingOptions: [
      { id: 'pull', band: 'pull', isoLabel: 'ISO 25-50', multiplier: 1 },
      { id: 'normal', band: 'normal', isoLabel: 'ISO 80-100', multiplier: 1 },
      { id: 'push', band: 'push', isoLabel: 'ISO 160', multiplier: 1 }
    ]
  },
  {
    id: 'kentmere_400',
    label: 'Kentmere 400',
    ratingOptions: [
      { id: 'pull', band: 'pull', isoLabel: 'ISO 160-200', multiplier: 1 },
      { id: 'normal', band: 'normal', isoLabel: 'ISO 250-400', multiplier: 1 },
      { id: 'push', band: 'push', isoLabel: 'ISO 500-800', multiplier: 1 }
    ]
  },
  {
    id: 'rpx_25',
    label: 'Rollei RPX 25',
    ratingOptions: [
      { id: 'pull', band: 'pull', isoLabel: 'ISO 12', multiplier: 1 },
      { id: 'normal', band: 'normal', isoLabel: 'ISO 25', multiplier: 1 },
      { id: 'push', band: 'push', isoLabel: 'ISO 50', multiplier: 1 }
    ]
  },
  {
    id: 'rpx_100',
    label: 'Rollei RPX 100',
    ratingOptions: [
      { id: 'pull', band: 'pull', isoLabel: 'ISO 50', multiplier: 1 },
      { id: 'normal', band: 'normal', isoLabel: 'ISO 100', multiplier: 1 },
      { id: 'push', band: 'push', isoLabel: 'ISO 200', multiplier: 1 }
    ]
  },
  {
    id: 'rpx_400',
    label: 'Rollei RPX 400',
    ratingOptions: [
      { id: 'pull', band: 'pull', isoLabel: 'ISO 200', multiplier: 1 },
      { id: 'normal', band: 'normal', isoLabel: 'ISO 400', multiplier: 1 },
      { id: 'push', band: 'push', isoLabel: 'ISO 800', multiplier: 1 }
    ]
  },
  {
    id: 'retro_80s',
    label: 'Rollei Retro 80S',
    advisoryNotes: [DF96_RETRO_80S_NOTE],
    ratingOptions: [
      { id: 'pull', band: 'pull', isoLabel: 'ISO 12', multiplier: 1 },
      {
        id: 'normal',
        band: 'normal',
        isoLabel: 'ISO 25-50',
        multiplier: 1,
        notes: [DF96_RETRO_80S_NOTE]
      },
      { id: 'push', band: 'push', isoLabel: 'ISO 80-100', multiplier: 1 }
    ]
  },
  {
    id: 'retro_400s',
    label: 'Rollei Retro 400S',
    ratingOptions: [
      { id: 'pull', band: 'pull', isoLabel: 'ISO 100', multiplier: 1 },
      { id: 'normal', band: 'normal', isoLabel: 'ISO 200', multiplier: 1 },
      { id: 'push', band: 'push', isoLabel: 'ISO 400', multiplier: 1 }
    ]
  },
  {
    id: 'retropan_320',
    label: 'Foma Retropan 320',
    ratingOptions: [
      { id: 'pull', band: 'pull', isoLabel: 'ISO 80-125', multiplier: 1 },
      { id: 'normal', band: 'normal', isoLabel: 'ISO 200-320', multiplier: 1 },
      { id: 'push', band: 'push', isoLabel: 'ISO 400-500', multiplier: 1 }
    ]
  },
  {
    id: 'fomapan_100',
    label: 'Foma Fomapan 100',
    ratingOptions: [
      { id: 'pull', band: 'pull', isoLabel: 'ISO 50', multiplier: 1 },
      { id: 'normal', band: 'normal', isoLabel: 'ISO 100', multiplier: 1 },
      { id: 'push', band: 'push', isoLabel: 'ISO 200', multiplier: 1 }
    ]
  },
  {
    id: 'fomapan_200',
    label: 'Foma Fomapan 200',
    ratingOptions: [
      { id: 'pull', band: 'pull', isoLabel: 'ISO 100', multiplier: 1 },
      { id: 'normal', band: 'normal', isoLabel: 'ISO 200', multiplier: 1 },
      { id: 'push', band: 'push', isoLabel: 'ISO 400', multiplier: 1 }
    ]
  },
  {
    id: 'fomapan_400',
    label: 'Foma Fomapan 400',
    ratingOptions: [
      { id: 'pull', band: 'pull', isoLabel: 'ISO 200', multiplier: 1 },
      { id: 'normal', band: 'normal', isoLabel: 'ISO 400', multiplier: 1 },
      { id: 'push', band: 'push', isoLabel: 'ISO 800', multiplier: 1 }
    ]
  },
  {
    id: 'bergger_pancro',
    label: 'Bergger Pancro',
    advisoryNotes: [DF96_BERGGER_NOTE],
    ratingOptions: [
      {
        id: 'pull',
        band: 'pull',
        isoLabel: 'ISO 125-200',
        multiplier: 3,
        multiplierLabel: '3x min',
        notes: [DF96_BERGGER_NOTE]
      },
      {
        id: 'normal',
        band: 'normal',
        isoLabel: 'ISO 320-400',
        multiplier: 3,
        multiplierLabel: '3x min',
        notes: [DF96_BERGGER_NOTE]
      },
      {
        id: 'push',
        band: 'push',
        isoLabel: 'ISO 500-800',
        multiplier: 3,
        multiplierLabel: '3x min',
        notes: [DF96_BERGGER_NOTE]
      }
    ]
  },
  {
    id: 'arista_edu_ultra_400',
    label: 'Arista EDU Ultra 400',
    ratingOptions: [
      { id: 'pull', band: 'pull', isoLabel: 'ISO 200', multiplier: 1 },
      { id: 'normal', band: 'normal', isoLabel: 'ISO 400', multiplier: 1 },
      { id: 'push', band: 'push', isoLabel: 'ISO 800', multiplier: 1 }
    ]
  },
  {
    id: 'arista_edu_ultra_200',
    label: 'Arista EDU Ultra 200',
    ratingOptions: [
      { id: 'pull', band: 'pull', isoLabel: 'ISO 100', multiplier: 1 },
      { id: 'normal', band: 'normal', isoLabel: 'ISO 200', multiplier: 1 },
      { id: 'push', band: 'push', isoLabel: 'ISO 400', multiplier: 1 }
    ]
  },
  {
    id: 'arista_edu_ultra_100',
    label: 'Arista EDU Ultra 100',
    ratingOptions: [
      { id: 'pull', band: 'pull', isoLabel: 'ISO 50', multiplier: 1 },
      { id: 'normal', band: 'normal', isoLabel: 'ISO 100', multiplier: 1 },
      { id: 'push', band: 'push', isoLabel: 'ISO 200', multiplier: 1 }
    ]
  }
];

export function getDf96MatrixCell(
  temperatureF: number | string,
  agitationMode: string,
) {
  return (
    df96MatrixCells.find(
      (cell) => cell.temperatureF === Number(temperatureF) && cell.agitationMode === agitationMode,
    ) ?? null
  );
}

export function getDf96FilmById(filmId: string) {
  return df96Films.find((film) => film.id === filmId) ?? df96Films[0];
}

export function getDf96FilmByLegacyName(name: string) {
  return (
    df96Films.find(
      (film) => film.label === name || film.legacyAliases?.includes(name),
    ) ?? null
  );
}

export function getDf96RatingOption(filmId: string, ratingId: string) {
  return getDf96FilmById(filmId).ratingOptions.find((option) => option.id === ratingId) ?? null;
}
