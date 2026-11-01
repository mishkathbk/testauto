import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

const stealth = StealthPlugin();

console.log('Playwright Extra:', typeof chromium.launch);
console.log('Stealth plugin:', typeof stealth);
console.log('Plugin name:', stealth.name);