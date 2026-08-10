// KOTONE 検証ハーネス: プロンプト文字列のハッシュ化
import { createHash } from 'node:crypto';

/**
 * @param {string} promptString
 * @returns {string} "sha256:xxxx" 形式
 */
export function hashPrompt(promptString) {
  const digest = createHash('sha256').update(promptString, 'utf8').digest('hex');
  return `sha256:${digest}`;
}
