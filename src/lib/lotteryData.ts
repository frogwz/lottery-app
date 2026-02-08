import type { Employee, PrizeConfig, PrizeLevel } from '@/types';

export interface LotteryData {
  employees: Employee[];
  prizes: PrizeConfig[];
  source: 'json' | 'txt';
}

const ALLOWED_LEVELS: PrizeLevel[] = ['lucky', 'third', 'second', 'first', 'special'];

function isImageFilename(value: string) {
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(value.trim());
}

function filenameToName(value: string) {
  const trimmed = value.trim();
  const withoutExt = trimmed.replace(/\.[^/.]+$/, '');
  return withoutExt || trimmed;
}

function normalizeEmployees(input: Array<Partial<Employee>>): Employee[] {
  const result: Employee[] = [];
  let index = 0;
  for (const item of input) {
    const name = (item.name || '').trim();
    if (!name) continue;
    // 保留原始 avatar 值，不做路径转换，方便后续头像匹配
    const avatar = item.avatar?.trim() || undefined;
    result.push({
      id: `emp_${index + 1}`,
      name,
      avatar,
      department: item.department,
    });
    index += 1;
  }
  return result;
}

function normalizePrizes(input: Array<Partial<PrizeConfig>>): PrizeConfig[] {
  const result: PrizeConfig[] = [];
  for (const item of input) {
    const level = item.level as PrizeLevel | undefined;
    if (!level || !ALLOWED_LEVELS.includes(level)) continue;
    const count = Number(item.count);
    if (!Number.isFinite(count) || count <= 0) continue;
    if (!item.name || !item.prize) continue;
    result.push({
      level,
      name: String(item.name).trim(),
      count,
      prize: String(item.prize).trim(),
    });
  }
  return result;
}

function parseEmployeesBlock(lines: string[]): Employee[] {
  const employees: Array<Partial<Employee>> = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('//')) continue;

    if (line.includes(',')) {
      const [name, avatar] = line.split(',').map(part => part.trim());
      if (!name) continue;
      employees.push({ name, avatar });
      continue;
    }

    if (isImageFilename(line)) {
      employees.push({ name: filenameToName(line), avatar: line });
      continue;
    }

    employees.push({ name: line });
  }
  return normalizeEmployees(employees);
}

function parsePrizesBlock(lines: string[]): PrizeConfig[] {
  const prizes: Array<Partial<PrizeConfig>> = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('//')) continue;
    const parts = line.split(',').map(part => part.trim());
    if (parts.length < 4) continue;
    const [level, name, count, prize] = parts;
    prizes.push({
      level: level as PrizeLevel,
      name,
      count: Number(count),
      prize,
    });
  }
  return normalizePrizes(prizes);
}

export function parseLotteryContent(text: string): Omit<LotteryData, 'source'> | null {
  let trimmed = text.replace(/^\uFEFF/, '').trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    trimmed = trimmed.replace(/,\s*([\]}])/g, '$1');
    try {
      const json = JSON.parse(trimmed);
      if (json && Array.isArray(json.employees) && Array.isArray(json.prizes)) {
        const employees = normalizeEmployees(json.employees);
        const prizes = normalizePrizes(json.prizes);
        // 只要有员工数据就算成功，奖品可以用默认值
        if (employees.length > 0) {
          return {
            employees,
            prizes: prizes.length > 0 ? prizes : [
              { level: 'lucky', name: '幸运奖', count: 20, prize: '精美礼品一份' },
              { level: 'third', name: '三等奖', count: 10, prize: '蓝牙耳机' },
              { level: 'second', name: '二等奖', count: 5, prize: '智能手表' },
              { level: 'first', name: '一等奖', count: 2, prize: '平板电脑' },
              { level: 'special', name: '特等奖', count: 1, prize: 'iPhone 16 Pro' },
            ]
          };
        }
      }
      // 尝试只有员工数组的情况
      if (Array.isArray(json)) {
        const employees = normalizeEmployees(json);
        if (employees.length > 0) {
          return {
            employees,
            prizes: [
              { level: 'lucky', name: '幸运奖', count: 20, prize: '精美礼品一份' },
              { level: 'third', name: '三等奖', count: 10, prize: '蓝牙耳机' },
              { level: 'second', name: '二等奖', count: 5, prize: '智能手表' },
              { level: 'first', name: '一等奖', count: 2, prize: '平板电脑' },
              { level: 'special', name: '特等奖', count: 1, prize: 'iPhone 16 Pro' },
            ]
          };
        }
      }
    } catch {
      return null;
    }
  }
  return parseMarkdownLottery(text);
}

export function isTauriRuntime() {
  return typeof window !== 'undefined' && !!(window as { __TAURI__?: unknown }).__TAURI__;
}

export async function getTauriLotteryPath(filename = 'lottery.json'): Promise<string | null> {
  if (!isTauriRuntime()) return null;
  try {
    const { resolveResource } = await import('@tauri-apps/api/path');
    return await resolveResource(filename);
  } catch {
    return null;
  }
}

async function loadLotteryDataFromTauri(): Promise<LotteryData | null> {
  if (!isTauriRuntime()) return null;
  try {
    const { readTextFile } = await import('@tauri-apps/api/fs');
    const { resolveResource, appLocalDataDir, join } = await import('@tauri-apps/api/path');

    try {
      const resourcePath = await resolveResource('lottery.json');
      const text = await readTextFile(resourcePath);
      const parsed = parseLotteryContent(text);
      if (parsed) return { ...parsed, source: 'json' };
    } catch {
      // 资源目录读取失败，尝试数据目录
    }

    try {
      const dataDir = await appLocalDataDir();
      const jsonPath = await join(dataDir, 'lottery.json');
      const text = await readTextFile(jsonPath);
      const parsed = parseLotteryContent(text);
      if (parsed) return { ...parsed, source: 'json' };
    } catch {
      // 数据目录读取失败
    }

  } catch {
    return null;
  }
  return null;
}

export function parseMarkdownLottery(text: string): Omit<LotteryData, 'source'> | null {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const sections: Record<string, string[]> = {};
  let current: string | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith('#')) {
      const heading = line.replace(/^#+\s*/, '').toLowerCase();
      if (heading === 'employees' || heading === '员工') {
        current = 'employees';
        sections[current] = sections[current] || [];
        continue;
      }
      if (heading === 'prizes' || heading === '奖品') {
        current = 'prizes';
        sections[current] = sections[current] || [];
        continue;
      }
      current = null;
      continue;
    }

    if (!current) continue;
    sections[current].push(raw);
  }

  const employees = parseEmployeesBlock(sections.employees || []);
  const prizes = parsePrizesBlock(sections.prizes || []);

  if (employees.length === 0 || prizes.length === 0) return null;
  return { employees, prizes };
}

export async function loadLotteryData(): Promise<LotteryData | null> {
  const tauriData = await loadLotteryDataFromTauri();
  if (tauriData) return tauriData;

  const baseUrl = import.meta.env.BASE_URL || '/';
  const jsonUrl = `${baseUrl}lottery.json`;
  const txtUrl = `${baseUrl}lottery.txt`;

  const jsonResponse = await fetch(jsonUrl, { cache: 'no-store' }).catch(() => null);
  if (jsonResponse && jsonResponse.ok) {
    const json = await jsonResponse.json().catch(() => null);
    if (json && Array.isArray(json.employees) && Array.isArray(json.prizes)) {
      const employees = normalizeEmployees(json.employees);
      const prizes = normalizePrizes(json.prizes);
      if (employees.length > 0 && prizes.length > 0) {
        return { employees, prizes, source: 'json' };
      }
    }
  }

  const textResponse = await fetch(txtUrl, { cache: 'no-store' }).catch(() => null);
  if (textResponse && textResponse.ok) {
    const text = await textResponse.text();
    const parsed = parseMarkdownLottery(text);
    if (parsed) {
      return { ...parsed, source: 'txt' };
    }
  }

  return null;
}
