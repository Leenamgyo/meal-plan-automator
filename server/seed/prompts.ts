// AI 기능별 프롬프트 로더
// 프롬프트 관리 UI가 제거되어 모든 프롬프트는 ./prompts/*.md 파일에서 항상 최신 버전으로 갱신된다.
// 프롬프트 내용(business content)은 .md 파일에, 이 파일은 로딩/DB 반영 로직만 담당한다.
//
// 기능 매핑:
//   chat_base          — 공통 시스템 지시문
//   ingredient_suggest — 재료 자동 추천 (단품 등록 모달 보조)
import fs from 'node:fs';
import path from 'node:path';
import type Database from 'better-sqlite3';
import { ROOT_DIR } from '../config';

export interface PromptSeed {
  id: string;
  description: string;
  content: string;
}

// 두 가지 실행 컨텍스트 모두 지원 (config.ts의 ROOT_DIR과 동일한 접근):
//   1. tsc 컴파일 산출물 (dist-server/server/seed/prompts/)
//   2. tsx 직접 실행 (npm test, server/seed/prompts/)
declare const __dirname: string | undefined;

const PROMPTS_DIR =
  typeof __dirname !== 'undefined'
    ? path.join(__dirname, 'prompts')
    : path.join(ROOT_DIR, 'server', 'seed', 'prompts');
const FRONTMATTER_PATTERN = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;

function parsePromptFile(id: string, raw: string): PromptSeed {
  const match = raw.match(FRONTMATTER_PATTERN);
  if (!match) {
    throw new Error(`Prompt file "${id}.md" is missing frontmatter (description: ...)`);
  }
  const [, frontmatter, content] = match;
  const descriptionLine = frontmatter
    .split('\n')
    .find((line) => line.startsWith('description:'));
  if (!descriptionLine) {
    throw new Error(`Prompt file "${id}.md" is missing a description in its frontmatter`);
  }
  return {
    id,
    description: descriptionLine.slice('description:'.length).trim(),
    content: content.trim(),
  };
}

export const seedPrompts: PromptSeed[] = fs
  .readdirSync(PROMPTS_DIR)
  .filter((file) => file.endsWith('.md'))
  .map((file) => parsePromptFile(path.basename(file, '.md'), fs.readFileSync(path.join(PROMPTS_DIR, file), 'utf-8')))
  .sort((a, b) => a.id.localeCompare(b.id));

// 모든 프롬프트를 항상 최신 코드 버전으로 갱신 (프롬프트 편집 UI 제거됨)
export function upsertPrompts(db: Database.Database): void {
  const stmt = db.prepare(`
    INSERT INTO prompts (id, description, content)
    VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET content = excluded.content, description = excluded.description
  `);
  for (const p of seedPrompts) {
    stmt.run(p.id, p.description, p.content);
  }
}
