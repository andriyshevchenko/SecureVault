import { homedir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  readdirSync,
} from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// One-line summary agents use to decide when to load the skill.
const DESCRIPTION =
  'Run any command that needs secrets by injecting them from the OS keychain as environment variables via `securevault run --profile`. Use instead of reading .env files or handling raw secret values.';

// All three agents use the same personal SKILL.md format: YAML frontmatter
// (name + description) followed by the shared instructions body.
const FRONTMATTER = `---\nname: securevault\ndescription: '${DESCRIPTION}'\n---\n\n`;

function skillContent() {
  const body = readFileSync(join(__dirname, 'securevault-skill.md'), 'utf8').trimEnd() + '\n';
  return FRONTMATTER + body;
}

// Each supported agent: where it lives (for auto-detection) and where its
// personal SKILL.md goes.
const TARGETS = {
  claude: {
    label: 'Claude Code',
    detectDir: join(homedir(), '.claude'),
    dest: join(homedir(), '.claude', 'skills', 'securevault', 'SKILL.md'),
  },
  codex: {
    label: 'OpenAI Codex',
    detectDir: join(homedir(), '.codex'),
    dest: join(homedir(), '.agents', 'skills', 'securevault', 'SKILL.md'),
  },
  copilot: {
    label: 'GitHub Copilot',
    detectDir: join(homedir(), '.copilot'),
    dest: join(homedir(), '.copilot', 'skills', 'securevault', 'SKILL.md'),
  },
};

function parseArgs(args) {
  const selected = new Set();
  let customPath = null;
  let force = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--claude' || a === '--codex' || a === '--copilot') selected.add(a.slice(2));
    else if (a === '--all') ['claude', 'codex', 'copilot'].forEach((k) => selected.add(k));
    else if (a === '--force') force = true;
    else if (a === '--path' && i + 1 < args.length) customPath = args[++i];
  }
  return { selected: [...selected], customPath, force };
}

function writeSkill(dest, content, force) {
  if (existsSync(dest) && !force) return false;
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, content, 'utf8');
  return true;
}

export async function installSkill(args) {
  const { selected, customPath, force } = parseArgs(args);

  if (customPath) {
    const dest = join(customPath, 'securevault', 'SKILL.md');
    if (writeSkill(dest, skillContent(), force)) {
      console.log(`✅ Wrote skill to ${dest}`);
    } else {
      console.log(`↷ Already exists (use --force to overwrite): ${dest}`);
    }
    return 0;
  }

  let targets = selected;
  if (targets.length === 0) {
    targets = Object.keys(TARGETS).filter((k) => existsSync(TARGETS[k].detectDir));
    if (targets.length === 0) {
      console.error('No agent detected (~/.claude, ~/.codex, ~/.copilot not found).');
      console.error('Pick a target: securevault install-skill --claude | --copilot | --codex | --all');
      console.error('Or a custom directory: securevault install-skill --path <dir>');
      return 1;
    }
    console.log(`Detected: ${targets.map((t) => TARGETS[t].label).join(', ')}`);
  }

  let wrote = 0;
  for (const key of targets) {
    const t = TARGETS[key];
    if (writeSkill(t.dest, skillContent(), force)) {
      console.log(`✅ ${t.label}: ${t.dest}`);
      wrote++;
    } else {
      console.log(`↷ ${t.label}: already exists (use --force to overwrite): ${t.dest}`);
    }
  }
  console.log(
    wrote > 0
      ? `\nInstalled the SecureVault skill for ${wrote} agent(s). Restart your agent to pick it up.`
      : '\nNothing installed.'
  );
  return 0;
}

export async function uninstallSkill(args) {
  const { selected } = parseArgs(args);
  const targets = selected.length ? selected : Object.keys(TARGETS);
  let removed = 0;
  for (const key of targets) {
    const t = TARGETS[key];
    if (existsSync(t.dest)) {
      rmSync(t.dest);
      // Remove the skill's own directory if it is now empty (Claude/Codex layout).
      const dir = dirname(t.dest);
      try {
        if (readdirSync(dir).length === 0) rmSync(dir, { recursive: true });
      } catch {
        // leaving an empty dir behind is harmless
      }
      console.log(`🗑️  ${t.label}: removed ${t.dest}`);
      removed++;
    }
  }
  console.log(removed ? `\nRemoved ${removed} skill file(s).` : '\nNo SecureVault skill files found to remove.');
  return 0;
}
