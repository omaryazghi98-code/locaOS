/**
 * PDF service (ADR-0007): headless Chromium via puppeteer-core + @sparticuz/chromium
 * (npm-distributed binary — see ADR-0011; CHROMIUM_EXECUTABLE overrides for a system install).
 * Arabic (RTL + shaping) and Latin render through embedded @font-face TTFs.
 */
import { readFileSync, mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import puppeteer from 'puppeteer-core';
import type { Browser, Page } from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { env } from '../../env';

const nodeRequire = createRequire(__filename);

export function ensureChromiumLibs(): string | null {
  try {
    const root = join(tmpdir(), 'locaos-chromium-libs');
    if (existsSync(join(root, 'lib', 'libnss3.so'))) return root;
    const entry = nodeRequire.resolve('@sparticuz/chromium');
    let dir = dirname(entry);
    while (dir !== dirname(dir)) {
      if (existsSync(join(dir, 'bin', 'al2023.tar.br'))) break;
      dir = dirname(dir);
    }
    const tarPath = join(dir, 'bin', 'al2023.tar.br');
    if (!existsSync(tarPath)) return null;
    const zlib = require('node:zlib') as typeof import('node:zlib');
    const buf = zlib.brotliDecompressSync(readFileSync(tarPath));
    mkdirSync(root, { recursive: true });
    const tarFile = join(root, 'al2023.tar');
    writeFileSync(tarFile, buf);
    execSync(`tar -xf ${JSON.stringify(tarFile)} -C ${JSON.stringify(root)}`);
    return existsSync(join(root, 'lib', 'libnss3.so')) ? root : null;
  } catch {
    return null;
  }
}

let fontsCache: { latin: string; latinBold: string; arabic: string; arabicBold: string } | null = null;

async function loadFonts() {
  if (fontsCache) return fontsCache;
  const [latin, latinBold, arabic, arabicBold] = await Promise.all([
    readFile(nodeRequire.resolve('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf')),
    readFile(nodeRequire.resolve('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf')),
    readFile(nodeRequire.resolve('@expo-google-fonts/noto-naskh-arabic/400Regular/NotoNaskhArabic_400Regular.ttf')),
    readFile(nodeRequire.resolve('@expo-google-fonts/noto-naskh-arabic/700Bold/NotoNaskhArabic_700Bold.ttf')),
  ]);
  fontsCache = {
    latin: latin.toString('base64'), latinBold: latinBold.toString('base64'),
    arabic: arabic.toString('base64'), arabicBold: arabicBold.toString('base64'),
  };
  return fontsCache;
}

let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    const libs = ensureChromiumLibs();
    browserPromise = puppeteer.launch({
      executablePath: env.chromiumExecutable || await chromium.executablePath(),
      args: [...chromium.args, '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
      env: libs ? { ...process.env, LD_LIBRARY_PATH: `${libs}/lib:${process.env.LD_LIBRARY_PATH ?? ''}` } : process.env,
      headless: true,
    }).then((b) => {
      b.once('disconnected', () => { browserPromise = null; });
      return b;
    });
  }
  return browserPromise;
}

export async function shutdownPdf(): Promise<void> {
  if (browserPromise) {
    const b = await browserPromise;
    await b.close();
    browserPromise = null;
  }
}

export async function htmlToPdf(html: string): Promise<Buffer> {
  const fonts = await loadFonts();
  const fontFaces = `<style>
    @font-face { font-family:'ContractLatin'; src:url(data:font/ttf;base64,${fonts.latin}) format('truetype'); font-weight:400; }
    @font-face { font-family:'ContractLatin'; src:url(data:font/ttf;base64,${fonts.latinBold}) format('truetype'); font-weight:700; }
    @font-face { font-family:'ContractArabic'; src:url(data:font/ttf;base64,${fonts.arabic}) format('truetype'); font-weight:400; }
    @font-face { font-family:'ContractArabic'; src:url(data:font/ttf;base64,${fonts.arabicBold}) format('truetype'); font-weight:700; }
  </style>`;
  const withFonts = html.replace('<head>', `<head>${fontFaces}`);
  const browser = await getBrowser();
  const page: Page = await browser.newPage();
  try {
    await page.setContent(withFonts, { waitUntil: 'load', timeout: 20000 });
    return Buffer.from(await page.pdf({ format: 'A4', printBackground: true, margin: { top: '8mm', bottom: '8mm' } }));
  } finally {
    await page.close();
  }
}
