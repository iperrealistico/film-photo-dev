import type {
  AlertProfile,
  RecipeDefinition,
  RecipeInputMap,
  SelectOption
} from '../domain/types';

const hc110FilmOptions: Array<{
  label: string;
  nativeIso: number;
  options: SelectOption[];
}> = [
  {
    label: 'Ilford HP5+',
    nativeIso: 400,
    options: [
      { value: '400', label: '400 · native' },
      { value: '800', label: '800 · push +1' },
      { value: '1600', label: '1600 · push +2' }
    ]
  },
  {
    label: 'Ilford FP4+',
    nativeIso: 125,
    options: [
      { value: '125', label: '125 · native' },
      { value: '50', label: '50 · pull -1 1/3' }
    ]
  },
  {
    label: 'Ilford Delta 100',
    nativeIso: 100,
    options: [
      { value: '100', label: '100 · native' },
      { value: '50', label: '50 · pull -1' },
      { value: '200', label: '200 · push +1' }
    ]
  },
  {
    label: 'Fomapan 100',
    nativeIso: 100,
    options: [
      { value: '100', label: '100 · native' },
      { value: '50', label: '50 · pull -1' }
    ]
  },
  {
    label: 'Fomapan 200',
    nativeIso: 200,
    options: [
      { value: '200', label: '200 · native' },
      { value: '400', label: '400 · push +1' }
    ]
  },
  {
    label: 'Fomapan 400',
    nativeIso: 400,
    options: [
      { value: '400', label: '400 · native' },
      { value: '320', label: '320 · pull -1/3' }
    ]
  }
];

function getHc110SpeedOptions(values: RecipeInputMap) {
  const selected = hc110FilmOptions.find((film) => film.label === values.filmStock);
  return selected?.options ?? hc110FilmOptions[0].options;
}

export const recipes: RecipeDefinition[] = [
  {
    id: 'cs41-powder',
    name: 'Cs41 powder kit',
    developerLabel: 'CineStill Cs41',
    subtitle: 'Color negative processing with push/pull and reuse adjustments',
    description:
      'A guided color workflow with source-backed temperature timing, developer reuse adjustments, fixed blix timing, and a fuller post-blix timeline.',
    processType: 'color',
    family: 'color_kit',
    accentTone: 'ember',
    source: {
      id: 'source-cs41',
      title: 'CineStill Cs41 Powder Kit Instructions',
      label: 'Manufacturer',
      kind: 'manufacturer',
      url: 'https://cinestillfilm.com/pages/resources',
      accessedAt: '2026-04-18'
    },
    notes: [
      'Primary source: CineStill Cs41 kit instructions.',
      'Developer time depends on both temperature and reuse.',
      'Blix stays visible as its own timed step and does not auto-change with reuse.'
    ],
    plannerId: 'cs41',
    inputs: [
      {
        id: 'temperatureF',
        label: 'Developer temperature',
        type: 'select',
        section: 'chemistry',
        defaultValue: '102',
        options: [
          { value: '72', label: '72 F · 22.2 C' },
          { value: '75', label: '75 F · 23.9 C' },
          { value: '80', label: '80 F · 26.7 C' },
          { value: '85', label: '85 F · 29.4 C' },
          { value: '90', label: '90 F · 32.2 C' },
          { value: '95', label: '95 F · 35 C' },
          { value: '102', label: '102 F · 38.9 C' }
        ]
      },
      {
        id: 'processingMode',
        label: 'Exposure change',
        type: 'select',
        section: 'film',
        defaultValue: 'standard',
        options: [
          { value: 'standard', label: 'Standard' },
          { value: 'pushpull', label: 'Push / pull' }
        ]
      },
      {
        id: 'pushPullStops',
        label: 'Push / pull',
        type: 'select',
        section: 'film',
        defaultValue: '1',
        options: [
          { value: '-1', label: '-1 stop · pull' },
          { value: '1', label: '+1 stop' },
          { value: '2', label: '+2 stops' },
          { value: '3', label: '+3 stops' }
        ],
        isVisible: (values) => values.processingMode === 'pushpull'
      },
      {
        id: 'chemistryState',
        label: 'Developer condition',
        type: 'select',
        section: 'chemistry',
        defaultValue: 'fresh',
        options: [
          { value: 'fresh', label: 'Fresh chemistry' },
          { value: 'reused', label: 'Reused chemistry' }
        ]
      },
      {
        id: 'solutionVolume',
        label: 'Reuse batch size',
        type: 'select',
        section: 'chemistry',
        defaultValue: '1000',
        options: [
          { value: '500', label: '500 ml batch' },
          { value: '1000', label: '1000 ml batch' },
          { value: '2000', label: '2000 ml batch' }
        ],
        isVisible: (values) => values.chemistryState === 'reused'
      },
      {
        id: 'filmsProcessed',
        label: 'Rolls already processed',
        type: 'number',
        section: 'chemistry',
        min: 1,
        max: 50,
        step: 1,
        defaultValue: 1,
        isVisible: (values) => values.chemistryState === 'reused'
      },
      {
        id: 'agitationMode',
        label: 'Agitation',
        type: 'select',
        section: 'workflow',
        defaultValue: 'intermittent',
        options: [
          { value: 'intermittent', label: 'Intermittent' },
          { value: 'continuous', label: 'Continuous' }
        ]
      },
      {
        id: 'blixTimeMin',
        label: 'Blix time',
        type: 'number',
        section: 'workflow',
        unit: 'min',
        min: 4,
        max: 12,
        step: 0.5,
        defaultValue: 8
      },
      {
        id: 'transitionDelaySec',
        label: 'Drain and refill time',
        type: 'number',
        section: 'runtime',
        unit: 'sec',
        min: 5,
        max: 30,
        step: 5,
        defaultValue: 10
      },
      {
        id: 'warningLeadSec',
        label: 'Early warning',
        type: 'number',
        section: 'runtime',
        unit: 'sec',
        min: 2,
        max: 6,
        step: 1,
        defaultValue: 3
      },
      {
        id: 'inversions',
        label: 'Inversions per set',
        type: 'number',
        section: 'runtime',
        min: 2,
        max: 10,
        step: 1,
        defaultValue: 4
      },
      {
        id: 'inversionIntervalSec',
        label: 'Seconds between inversions',
        type: 'number',
        section: 'runtime',
        unit: 'sec',
        min: 1,
        max: 5,
        step: 0.5,
        defaultValue: 2
      }
    ]
  },
  {
    id: 'kodak-hc110',
    name: 'HC-110',
    developerLabel: 'Kodak HC-110',
    subtitle: 'Black-and-white development with dilution math and capacity checks',
    description:
      'A guided B/W workflow with dilution-based mix calculations, developer capacity checks, and a full multi-bath timeline.',
    processType: 'bw',
    family: 'bw_concentrate',
    accentTone: 'amber',
    source: {
      id: 'source-hc110',
      title: 'Massive Dev Chart and curated workflow notes',
      label: 'Curated',
      kind: 'curated',
      url: 'https://www.digitaltruth.com/devchart.php',
      accessedAt: '2026-04-18'
    },
    notes: [
      'Film and exposure combinations currently follow the seeded recipe set for this app.',
      'Capacity checks are shown explicitly before the session starts.',
      'The full stop, fix, wash, and optional hypo sequence stays visible in the review.'
    ],
    plannerId: 'hc110',
    inputs: [
      {
        id: 'filmStock',
        label: 'Film stock',
        type: 'select',
        section: 'film',
        defaultValue: 'Ilford HP5+',
        options: hc110FilmOptions.map((film) => ({
          value: film.label,
          label: film.label
        }))
      },
      {
        id: 'exposureIndex',
        label: 'Exposure index',
        type: 'select',
        section: 'film',
        defaultValue: '400',
        getOptions: getHc110SpeedOptions
      },
      {
        id: 'dilution',
        label: 'Dilution',
        type: 'select',
        section: 'chemistry',
        defaultValue: '31',
        options: [
          { value: '15', label: 'A · 1+15' },
          { value: '31', label: 'B · 1+31' },
          { value: '39', label: 'D · 1+39' },
          { value: '47', label: 'E · 1+47' },
          { value: '79', label: 'F · 1+79' },
          { value: '63', label: 'H · 1+63' }
        ]
      },
      {
        id: 'temperatureC',
        label: 'Developer temperature',
        type: 'number',
        section: 'chemistry',
        unit: 'C',
        helperText: 'Uses a general B/W compensation guide when you leave 20 C.',
        min: 18,
        max: 27,
        step: 1,
        defaultValue: 20
      },
      {
        id: 'agitationMode',
        label: 'Agitation',
        type: 'select',
        section: 'workflow',
        defaultValue: 'intermittent',
        options: [
          { value: 'intermittent', label: 'Intermittent' },
          { value: 'continuous', label: 'Continuous' }
        ]
      },
      {
        id: 'tankVolumeMl',
        label: 'Working solution volume',
        type: 'number',
        section: 'chemistry',
        unit: 'ml',
        min: 250,
        max: 1000,
        step: 50,
        defaultValue: 500
      },
      {
        id: 'filmFormat',
        label: 'Film format',
        type: 'select',
        section: 'film',
        defaultValue: '135-36exp',
        options: [
          { value: '4x5', label: '4x5 sheet' },
          { value: '5x7', label: '5x7 sheet' },
          { value: '8x10', label: '8x10 sheet' },
          { value: '135-36exp', label: '35mm roll' },
          { value: '120', label: '120 roll' }
        ]
      },
      {
        id: 'quantity',
        label: 'Rolls or sheets',
        type: 'number',
        section: 'film',
        min: 1,
        max: 10,
        step: 1,
        defaultValue: 2
      },
      {
        id: 'stopBathSec',
        label: 'Stop bath',
        type: 'number',
        section: 'workflow',
        unit: 'sec',
        min: 15,
        max: 60,
        step: 15,
        defaultValue: 30
      },
      {
        id: 'fixerSec',
        label: 'Fixer',
        type: 'number',
        section: 'workflow',
        unit: 'sec',
        min: 180,
        max: 600,
        step: 60,
        defaultValue: 300
      },
      {
        id: 'washSec',
        label: 'Wash',
        type: 'number',
        section: 'workflow',
        unit: 'sec',
        min: 300,
        max: 720,
        step: 60,
        defaultValue: 600
      },
      {
        id: 'hypoEnabled',
        label: 'Include hypo clear',
        type: 'toggle',
        section: 'workflow',
        defaultValue: false
      },
      {
        id: 'hypoSec',
        label: 'Hypo clear',
        type: 'number',
        section: 'workflow',
        unit: 'sec',
        min: 60,
        max: 180,
        step: 60,
        defaultValue: 120,
        isVisible: (values) => values.hypoEnabled === true
      },
      {
        id: 'drainSec',
        label: 'Drain step time',
        type: 'number',
        section: 'runtime',
        unit: 'sec',
        min: 5,
        max: 20,
        step: 5,
        defaultValue: 10
      },
      {
        id: 'fillSec',
        label: 'Fill step time',
        type: 'number',
        section: 'runtime',
        unit: 'sec',
        min: 5,
        max: 20,
        step: 5,
        defaultValue: 10
      },
      {
        id: 'warningLeadSec',
        label: 'Early warning',
        type: 'number',
        section: 'runtime',
        unit: 'sec',
        min: 2,
        max: 6,
        step: 1,
        defaultValue: 3
      },
      {
        id: 'inversions',
        label: 'Inversions each set',
        type: 'number',
        section: 'runtime',
        min: 2,
        max: 6,
        step: 1,
        defaultValue: 4
      }
    ]
  },
  {
    id: 'cinestill-df96',
    name: 'Df96 monobath',
    developerLabel: 'CineStill Df96',
    subtitle: 'A streamlined black-and-white monobath workflow',
    description:
      'A simpler B/W process with a lighter setup, a clear timeline review, and the same guided session flow.',
    processType: 'bw',
    family: 'monobath',
    accentTone: 'red',
    source: {
      id: 'source-df96',
      title: 'CineStill Df96 Monobath instructions',
      label: 'Manufacturer',
      kind: 'manufacturer',
      url: 'https://cinestillfilm.com/pages/resources',
      accessedAt: '2026-04-18'
    },
    notes: [
      'Minimum monobath timing now follows the CineStill temperature/agitation guidance.',
      'You still get the same review and guided session flow.'
    ],
    plannerId: 'df96',
    inputs: [
      {
        id: 'filmName',
        label: 'Film',
        type: 'select',
        section: 'film',
        defaultValue: 'HP5+ 400',
        options: [
          { value: 'HP5+ 400', label: 'HP5+ 400' },
          { value: 'Tri-X 400', label: 'Tri-X 400' },
          { value: 'Delta 100', label: 'Delta 100' }
        ]
      },
      {
        id: 'temperatureF',
        label: 'Monobath temperature',
        type: 'number',
        section: 'chemistry',
        unit: 'F',
        min: 70,
        max: 85,
        step: 1,
        defaultValue: 80
      },
      {
        id: 'developSec',
        label: 'Monobath time',
        type: 'number',
        section: 'workflow',
        unit: 'sec',
        helperText: 'Acts as a manual override above the CineStill minimum for the chosen temperature.',
        min: 180,
        max: 720,
        step: 30,
        defaultValue: 240
      },
      {
        id: 'washSec',
        label: 'Wash time',
        type: 'number',
        section: 'workflow',
        unit: 'sec',
        min: 180,
        max: 600,
        step: 60,
        defaultValue: 300
      },
      {
        id: 'warningLeadSec',
        label: 'Early warning',
        type: 'number',
        section: 'runtime',
        unit: 'sec',
        min: 2,
        max: 6,
        step: 1,
        defaultValue: 3
      },
      {
        id: 'inversions',
        label: 'Inversions each minute',
        type: 'number',
        section: 'runtime',
        min: 2,
        max: 6,
        step: 1,
        defaultValue: 4
      }
    ]
  }
];

export const defaultAlertProfiles: AlertProfile[] = [
  {
    id: 'balanced',
    name: 'Balanced cues',
    audioEnabled: true,
    vibrationEnabled: true,
    visualEnabled: true,
    warningLeadSec: 3
  },
  {
    id: 'quiet',
    name: 'Quiet cues',
    audioEnabled: false,
    vibrationEnabled: true,
    visualEnabled: true,
    warningLeadSec: 3
  },
  {
    id: 'red-safe',
    name: 'Visual only',
    audioEnabled: false,
    vibrationEnabled: false,
    visualEnabled: true,
    warningLeadSec: 4
  }
];

export function getRecipeById(recipeId: string) {
  return recipes.find((recipe) => recipe.id === recipeId) ?? recipes[0];
}
