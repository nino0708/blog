import Anthropic from '@anthropic-ai/sdk';
import { Octokit } from '@octokit/rest';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPrompt, buildVerifyPrompt, buildFixSuffix } from './prompts.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const cfg = {
  owner: process.env.GITHUB_OWNER,
  repo: process.env.GITHUB_REPO,
  branch: process.env.GITHUB_BRANCH || 'main',
  // リポジトリ(nino0708/blog)内の記事Markdown格納先
  contentDir: process.env.CONTENT_DIR || 'site/src/content/buildings',
  model: process.env.MODEL || 'claude-sonnet-4-6',
  anthropicKey: process.env.ANTHROPIC_API_KEY,
  githubToken: process.env.GITHUB_TOKEN,
};

const LOCAL = process.argv.includes('--local');

// Secrets Manager から鍵を解決（*_SECRET_ARN があれば優先。なければ環境変数の素の値）。
async function resolveSecrets() {
  const arns = [process.env.ANTHROPIC_SECRET_ARN, process.env.GITHUB_TOKEN_SECRET_ARN].filter(Boolean);
  if (arns.length === 0) return;
  const { SecretsManagerClient, GetSecretValueCommand } = await import('@aws-sdk/client-secrets-manager');
  const sm = new SecretsManagerClient({});
  const read = async (arn) => (await sm.send(new GetSecretValueCommand({ SecretId: arn }))).SecretString;
  if (process.env.ANTHROPIC_SECRET_ARN) cfg.anthropicKey = await read(process.env.ANTHROPIC_SECRET_ARN);
  if (process.env.GITHUB_TOKEN_SECRET_ARN) cfg.githubToken = await read(process.env.GITHUB_TOKEN_SECRET_ARN);
}

function loadSeed() {
  const raw = readFileSync(join(__dirname, 'data', 'buildings.json'), 'utf-8');
  return JSON.parse(raw).buildings;
}

function yamlString(s) {
  // ダブルクオートで囲み、内部の " をエスケープ
  return `"${String(s).replace(/"/g, '\\"')}"`;
}

function buildFrontmatter(b, body) {
  const today = new Date().toISOString().slice(0, 10);
  const lines = ['---'];
  lines.push(`title: ${yamlString(b.title)}`);
  lines.push(`buildingType: ${b.buildingType}`);
  lines.push(`area: ${yamlString(b.area)}`);
  if (b.address) lines.push(`address: ${yamlString(b.address)}`);
  if (b.completedYear) lines.push(`completedYear: ${b.completedYear}`);
  if (b.floorsAbove) lines.push(`floorsAbove: ${b.floorsAbove}`);
  if (b.floorsBelow) lines.push(`floorsBelow: ${b.floorsBelow}`);
  if (b.heightM) lines.push(`heightM: ${b.heightM}`);
  if (b.totalFloorAreaM2) lines.push(`totalFloorAreaM2: ${b.totalFloorAreaM2}`);
  if (b.developer) lines.push(`developer: ${yamlString(b.developer)}`);
  if (b.architect) lines.push(`architect: ${yamlString(b.architect)}`);
  lines.push(`tags: [${(b.tags || []).map(yamlString).join(', ')}]`);
  lines.push(`publishedAt: ${today}`);
  if (b.summary) lines.push(`summary: ${yamlString(b.summary)}`);
  lines.push(`verified: ${b.verified ? 'true' : 'false'}`);
  lines.push(`sources: [${(b.sources || []).map(yamlString).join(', ')}]`);
  lines.push('---');
  lines.push('');
  if (!b.verified) {
    lines.push('> この記事は事実確認中（未検証）です。数値は出典での裏取り後に確定します。');
    lines.push('');
  }
  lines.push(body.trim());
  lines.push('');
  return lines.join('\n');
}

async function getExistingSlugs(octokit) {
  try {
    const { data } = await octokit.repos.getContent({
      owner: cfg.owner,
      repo: cfg.repo,
      path: cfg.contentDir,
      ref: cfg.branch,
    });
    if (!Array.isArray(data)) return new Set();
    return new Set(
      data
        .filter((f) => f.type === 'file' && f.name.endsWith('.md'))
        .map((f) => f.name.replace(/\.md$/, ''))
    );
  } catch (e) {
    if (e.status === 404) return new Set();
    throw e;
  }
}

function client() {
  return new Anthropic({ apiKey: cfg.anthropicKey });
}

async function askText(prompt, maxTokens = 2048) {
  const msg = await client().messages.create({
    model: cfg.model,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  });
  return msg.content.find((c) => c.type === 'text').text.trim();
}

// 本文を確定事実に照らして検証。{ok, issues} を返す。
async function verifyBody(b, body) {
  const raw = await askText(buildVerifyPrompt(b, body), 1024);
  const json = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
  try {
    const parsed = JSON.parse(json);
    return { ok: parsed.ok === true, issues: Array.isArray(parsed.issues) ? parsed.issues : [] };
  } catch {
    // 検証結果がパースできない場合は「安全側」に倒して不合格扱い
    return { ok: false, issues: ['検証結果のパースに失敗（安全のため非公開）'] };
  }
}

// 生成 → 検証 → NGなら指摘を反映して1回だけ再生成 → なお不合格なら null。
async function generateVerifiedBody(b) {
  let body = await askText(buildPrompt(b));
  let check = await verifyBody(b, body);
  if (check.ok) return { body, attempts: 1 };

  console.log(`  ファクトチェック指摘(1回目): ${check.issues.join(' / ')}`);
  body = await askText(buildPrompt(b) + buildFixSuffix(check.issues));
  check = await verifyBody(b, body);
  if (check.ok) return { body, attempts: 2 };

  console.log(`  ファクトチェック指摘(2回目): ${check.issues.join(' / ')}`);
  return { body: null, attempts: 2, issues: check.issues };
}

async function commitToGithub(octokit, slug, content) {
  const path = `${cfg.contentDir}/${slug}.md`;
  await octokit.repos.createOrUpdateFileContents({
    owner: cfg.owner,
    repo: cfg.repo,
    path,
    branch: cfg.branch,
    message: `記事自動生成: ${slug}`,
    content: Buffer.from(content, 'utf-8').toString('base64'),
  });
  return path;
}

export async function handler() {
  await resolveSecrets();
  const seed = loadSeed();

  let octokit = null;
  let existing;
  if (LOCAL) {
    // ローカルでも content ディレクトリの既存slugを見て、次の未生成を選ぶ
    const dir = join(__dirname, '..', 'site', 'src', 'content', 'buildings');
    existing = existsSync(dir)
      ? new Set(readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, '')))
      : new Set();
  } else {
    octokit = new Octokit({ auth: cfg.githubToken });
    existing = await getExistingSlugs(octokit);
  }

  // 自動公開は verified:true（事実が裏取り済み）の建物だけ。未検証は人の確認待ちで公開しない。
  // ローカル検証時は ALLOW_UNVERIFIED=1 で未検証も対象にできる。
  const allowUnverified = LOCAL && process.env.ALLOW_UNVERIFIED === '1';
  const next = seed.find((b) => !existing.has(b.slug) && (b.verified || allowUnverified));
  if (!next) {
    console.log('公開できる未処理の建物がありません（verified:true のストック切れか全件公開済み）。検証済みの建物をseedに追記してください。');
    return { status: 'no-op' };
  }

  console.log(`生成対象: ${next.title} (${next.slug})`);
  const { body, attempts, issues } = await generateVerifiedBody(next);
  if (!body) {
    // ファクトチェックを通らなかった → 公開しない（間違った投稿を出さない）
    console.log(`ファクトチェック不合格のため公開を見送り: ${next.slug}`);
    return { status: 'rejected', slug: next.slug, issues };
  }
  console.log(`ファクトチェック合格（試行${attempts}回）`);
  const content = buildFrontmatter(next, body);

  if (LOCAL) {
    const out = join(__dirname, '..', 'site', 'src', 'content', 'buildings', `${next.slug}.md`);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, content, 'utf-8');
    console.log(`ローカル出力: ${out}`);
    return { status: 'local', slug: next.slug };
  }

  const path = await commitToGithub(octokit, next.slug, content);
  console.log(`コミット完了: ${path}（CodeBuildのwebhookでデプロイされます）`);
  return { status: 'committed', slug: next.slug, path };
}

// ローカル実行 / Lambda外実行のエントリ
if (LOCAL || process.env.RUN_NOW) {
  handler().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
