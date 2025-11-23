/**
 * Normalize and Seed Attribute Registry
 * 
 * Applies normalization rules (teams, colors, materials) and seeds
 * Firestore settings/attributes/* collection with metadata.
 * 
 * Usage: npx tsx scripts/normalizeAndSeedAttributes.ts [--dry-run]
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface AttributeMetadata {
  key: string;
  canonicalPath: string;
  label: string;
  category: string;
  dataType: string;
  required: boolean;
  export: boolean;
  description: string;
  systemFlag: boolean;
  legacyPaths: string[];
  importerColumns: string[];
  exportPath?: string;
  rules: string[];
  usage: { file: string; line: number }[];
  examples: {
    sampleValues: string[];
  };
  validation?: {
    required?: boolean;
    pattern?: string | null;
    allowedValuesRef?: string | null;
    allowedValues?: string[];
  };
  normalizedValues?: string[];
  normalizationNote?: string;
}

// Pro team canonical list (City TeamName format)
const PRO_TEAMS: Record<string, string> = {
  // NFL
  'cardinals': 'Arizona Cardinals',
  'falcons': 'Atlanta Falcons',
  'ravens': 'Baltimore Ravens',
  'bills': 'Buffalo Bills',
  'panthers': 'Carolina Panthers',
  'bears': 'Chicago Bears',
  'bengals': 'Cincinnati Bengals',
  'browns': 'Cleveland Browns',
  'cowboys': 'Dallas Cowboys',
  'broncos': 'Denver Broncos',
  'lions': 'Detroit Lions',
  'packers': 'Green Bay Packers',
  'texans': 'Houston Texans',
  'colts': 'Indianapolis Colts',
  'jaguars': 'Jacksonville Jaguars',
  'chiefs': 'Kansas City Chiefs',
  'raiders': 'Las Vegas Raiders',
  'chargers': 'Los Angeles Chargers',
  'rams': 'Los Angeles Rams',
  'dolphins': 'Miami Dolphins',
  'vikings': 'Minnesota Vikings',
  'patriots': 'New England Patriots',
  'saints': 'New Orleans Saints',
  'giants': 'New York Giants',
  'jets': 'New York Jets',
  'eagles': 'Philadelphia Eagles',
  'steelers': 'Pittsburgh Steelers',
  '49ers': 'San Francisco 49ers',
  'seahawks': 'Seattle Seahawks',
  'buccaneers': 'Tampa Bay Buccaneers',
  'titans': 'Tennessee Titans',
  'commanders': 'Washington Commanders',
  
  // MLB
  'diamondbacks': 'Arizona Diamondbacks',
  'braves': 'Atlanta Braves',
  'orioles': 'Baltimore Orioles',
  'red sox': 'Boston Red Sox',
  'cubs': 'Chicago Cubs',
  'white sox': 'Chicago White Sox',
  'reds': 'Cincinnati Reds',
  'guardians': 'Cleveland Guardians',
  'rockies': 'Colorado Rockies',
  'tigers': 'Detroit Tigers',
  'astros': 'Houston Astros',
  'royals': 'Kansas City Royals',
  'angels': 'Los Angeles Angels',
  'dodgers': 'Los Angeles Dodgers',
  'marlins': 'Miami Marlins',
  'brewers': 'Milwaukee Brewers',
  'twins': 'Minnesota Twins',
  'mets': 'New York Mets',
  'yankees': 'New York Yankees',
  'athletics': 'Oakland Athletics',
  'phillies': 'Philadelphia Phillies',
  'pirates': 'Pittsburgh Pirates',
  'padres': 'San Diego Padres',
  'mariners': 'Seattle Mariners',
  'cardinals (mlb)': 'St. Louis Cardinals',
  'rays': 'Tampa Bay Rays',
  'rangers': 'Texas Rangers',
  'blue jays': 'Toronto Blue Jays',
  'nationals': 'Washington Nationals',
  
  // NBA
  'hawks': 'Atlanta Hawks',
  'celtics': 'Boston Celtics',
  'nets': 'Brooklyn Nets',
  'hornets': 'Charlotte Hornets',
  'bulls (nba)': 'Chicago Bulls',
  'cavaliers': 'Cleveland Cavaliers',
  'mavericks': 'Dallas Mavericks',
  'nuggets': 'Denver Nuggets',
  'pistons': 'Detroit Pistons',
  'warriors': 'Golden State Warriors',
  'rockets': 'Houston Rockets',
  'pacers': 'Indiana Pacers',
  'clippers': 'Los Angeles Clippers',
  'lakers': 'Los Angeles Lakers',
  'grizzlies': 'Memphis Grizzlies',
  'heat': 'Miami Heat',
  'bucks': 'Milwaukee Bucks',
  'timberwolves': 'Minnesota Timberwolves',
  'pelicans': 'New Orleans Pelicans',
  'knicks': 'New York Knicks',
  'thunder': 'Oklahoma City Thunder',
  'magic': 'Orlando Magic',
  '76ers': 'Philadelphia 76ers',
  'suns': 'Phoenix Suns',
  'trail blazers': 'Portland Trail Blazers',
  'kings': 'Sacramento Kings',
  'spurs': 'San Antonio Spurs',
  'raptors': 'Toronto Raptors',
  'jazz': 'Utah Jazz',
  'wizards': 'Washington Wizards',
  
  // NHL
  'ducks': 'Anaheim Ducks',
  'coyotes': 'Arizona Coyotes',
  'bruins': 'Boston Bruins',
  'sabres': 'Buffalo Sabres',
  'flames': 'Calgary Flames',
  'hurricanes': 'Carolina Hurricanes',
  'blackhawks': 'Chicago Blackhawks',
  'avalanche': 'Colorado Avalanche',
  'blue jackets': 'Columbus Blue Jackets',
  'stars': 'Dallas Stars',
  'red wings': 'Detroit Red Wings',
  'oilers': 'Edmonton Oilers',
  'panthers (nhl)': 'Florida Panthers',
  'kings (nhl)': 'Los Angeles Kings',
  'wild': 'Minnesota Wild',
  'canadiens': 'Montreal Canadiens',
  'predators': 'Nashville Predators',
  'devils': 'New Jersey Devils',
  'islanders': 'New York Islanders',
  'rangers (nhl)': 'New York Rangers',
  'senators': 'Ottawa Senators',
  'flyers': 'Philadelphia Flyers',
  'penguins': 'Pittsburgh Penguins',
  'sharks': 'San Jose Sharks',
  'kraken': 'Seattle Kraken',
  'blues': 'St. Louis Blues',
  'lightning': 'Tampa Bay Lightning',
  'maple leafs': 'Toronto Maple Leafs',
  'canucks': 'Vancouver Canucks',
  'golden knights': 'Vegas Golden Knights',
  'capitals': 'Washington Capitals',
  'jets (nhl)': 'Winnipeg Jets',
};

/**
 * Normalize team name to "City TeamName" format
 */
function normalizeTeam(team: string): string {
  const lower = team.toLowerCase().trim();
  return PRO_TEAMS[lower] || toTitleCase(team);
}

/**
 * Normalize color to Title Case
 */
function normalizeColor(color: string): string {
  return toTitleCase(color);
}

/**
 * Convert to Title Case
 */
function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Apply normalization rules to attribute metadata
 * Lisa v3.3.0: Added vocab denormalization for select-style attributes
 */
function normalizeAttributes(attributes: AttributeMetadata[]): AttributeMetadata[] {
  return attributes.map(attr => {
    const normalized = { ...attr };

    // Normalize sportsTeam examples
    if (attr.canonicalPath === 'descriptive.sportsTeam' && attr.examples.sampleValues.length > 0) {
      normalized.normalizedValues = attr.examples.sampleValues.map(normalizeTeam);
      normalized.normalizationNote = 'Teams normalized to "City TeamName" format using pro-team canonical list';
      
      // Denormalize as allowedValues for v3.3 vocab UX
      if (!normalized.validation) {
        normalized.validation = {};
      }
      normalized.validation.allowedValues = normalized.normalizedValues;
    }

    // Normalize color examples
    if ((attr.canonicalPath === 'descriptive.primaryColor' || attr.canonicalPath === 'descriptive.descriptiveColor') 
        && attr.examples.sampleValues.length > 0) {
      normalized.normalizedValues = attr.examples.sampleValues.map(normalizeColor);
      normalized.normalizationNote = 'Colors normalized to Title Case';
      
      // Denormalize as allowedValues for v3.3 vocab UX
      if (!normalized.validation) {
        normalized.validation = {};
      }
      normalized.validation.allowedValues = normalized.normalizedValues;
    }

    // Material normalization note
    if (attr.canonicalPath === 'descriptive.material') {
      normalized.normalizationNote = 'Materials stored as deduped arrays in canonical schema';
    }

    // Collection canonicalization note
    if (attr.canonicalPath === 'launch.newCollection') {
      normalized.normalizationNote = 'Canonicalized from legacy "collection" field';
    }
    
    // v3.3.0: For attributes with allowedValuesRef, attempt to denormalize if we have sample values
    // TODO v3.4: Extend to actually fetch from settings/lists/* collection
    if (attr.validation?.allowedValuesRef && attr.examples.sampleValues.length > 0) {
      if (!normalized.validation) {
        normalized.validation = { ...attr.validation };
      }
      // Use sample values as a fallback until we wire up full vocab resolution
      normalized.validation.allowedValues = attr.examples.sampleValues;
      normalized.normalizationNote = (normalized.normalizationNote || '') + 
        ' | Vocab values denormalized from samples (TODO: wire to settings/lists/*)';
    }

    return normalized;
  });
}

/**
 * Seed Firestore settings/attributes/* collection
 */
async function seedFirestore(attributes: AttributeMetadata[], dryRun: boolean): Promise<void> {
  if (dryRun) {
    console.log('\n[DRY RUN] Would seed to Firestore settings/attributes/*');
    console.log(`Total attributes: ${attributes.length}\n`);
    
    // Show sample
    console.log('Sample attribute (descriptive.sportsTeam):');
    const sample = attributes.find(a => a.canonicalPath === 'descriptive.sportsTeam');
    if (sample) {
      console.log(JSON.stringify(sample, null, 2));
    }
    return;
  }

  // Initialize Firebase Admin
  const serviceAccountPath = path.join(__dirname, '../service-account.json');
  if (!fs.existsSync(serviceAccountPath)) {
    throw new Error('service-account.json not found. Cannot seed Firestore.');
  }

  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
  initializeApp({
    credential: cert(serviceAccount),
  });

  const db = getFirestore();
  const batch = db.batch();
  let count = 0;

  for (const attr of attributes) {
    const docRef = db.collection('settings').doc('attributes').collection('keys').doc(attr.canonicalPath);
    batch.set(docRef, attr, { merge: true });
    count++;
  }

  await batch.commit();
  console.log(`\n✓ Seeded ${count} attributes to Firestore settings/attributes/keys`);
}

/**
 * Main execution
 */
async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const rootDir = path.join(__dirname, '..');
  
  console.log('Normalizing and seeding attribute registry...\n');
  if (dryRun) {
    console.log('[DRY RUN MODE]\n');
  }

  // Load attribute registry
  const registryPath = path.join(rootDir, 'scripts/attribute-registry.json');
  if (!fs.existsSync(registryPath)) {
    throw new Error('attribute-registry.json not found. Run parseAttributesFromCode.ts first.');
  }

  const attributes: AttributeMetadata[] = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
  console.log(`✓ Loaded ${attributes.length} attributes from registry`);

  // Apply normalization rules
  const normalized = normalizeAttributes(attributes);
  console.log(`✓ Applied normalization rules`);

  // Save normalized registry
  const normalizedPath = path.join(rootDir, 'scripts/attribute-registry-normalized.json');
  fs.writeFileSync(normalizedPath, JSON.stringify(normalized, null, 2));
  console.log(`✓ Saved normalized registry to ${normalizedPath}`);

  // Seed Firestore
  await seedFirestore(normalized, dryRun);

  // Generate CSV report
  const csvPath = path.join(rootDir, 'scripts/attribute-registry.csv');
  const csvHeader = 'Canonical Path,Label,Category,Data Type,Required,Export,Legacy Paths,Importer Columns,Rules,Normalization Note\n';
  const csvRows = normalized.map(attr => [
    attr.canonicalPath,
    attr.label,
    attr.category,
    attr.dataType,
    attr.required,
    attr.export,
    `"${attr.legacyPaths.join(', ')}"`,
    `"${attr.importerColumns.join(', ')}"`,
    `"${attr.rules.join(', ')}"`,
    `"${attr.normalizationNote || ''}"`,
  ].join(','));
  fs.writeFileSync(csvPath, csvHeader + csvRows.join('\n'));
  console.log(`✓ Generated CSV report at ${csvPath}`);

  console.log('\n✅ Complete!');
  if (dryRun) {
    console.log('\nRun without --dry-run to seed Firestore.');
  }
}

main().catch(console.error);
