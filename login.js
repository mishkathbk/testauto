
import "dotenv/config";
import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const LOGIN_URL = "https://visa.vfsglobal.com/are/en/jpn/login";

const email = process.env.VFS_EMAIL;
const password = process.env.VFS_PASSWORD;

if (!email || !password) {
  throw new Error("Missing VFS_EMAIL or VFS_PASSWORD in .env");
}

chromium.use(StealthPlugin());

const browser = await chromium.launch({
  headless: false,
});

const page = await browser.newPage();

const rl = readline.createInterface({ input, output });

try {
  // STEP 1: Open VFS login page
  console.log("Opening VFS login page...");

  await page.goto(LOGIN_URL, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await page.waitForTimeout(3000);

  // STEP 2: Inspect cookie consent button
  console.log("\nChecking cookie consent...");

  const acceptCookies = page.getByRole("button", {
    name: "Accept All Cookies",
    exact: true,
  });

  const cookieCount = await acceptCookies.count();

  console.log("Accept All Cookies count:", cookieCount);

  if (cookieCount > 0) {
    const visible = await acceptCookies.first().isVisible();
    const enabled = await acceptCookies.first().isEnabled();

    console.log("Cookie button visible:", visible);
    console.log("Cookie button enabled:", enabled);

    if (visible && enabled) {
      await acceptCookies.first().click();

      console.log("Cookie consent button clicked.");

      await page.waitForTimeout(2000);
    }
  } else {
    console.log("Cookie button not found.");

    const buttons = await page.locator("button").evaluateAll(
      elements =>
        elements.map(el => ({
          id: el.id,
          text: el.innerText.trim(),
          visible: el.getBoundingClientRect().width > 0
        }))
    );

    console.log("Available buttons:", buttons);
  }

  // STEP 3: Check login form
  console.log("\nChecking login form...");

  await page.locator("#email").waitFor({
    state: "visible",
    timeout: 30000,
  });

  // STEP 4: Fill credentials
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);

  console.log("Email filled.");
  console.log("Password filled.");

  // STEP 5: Manual Cloudflare verification
  console.log("\nPlease complete the human verification manually.");

  await rl.question(
    "Complete verification in the browser, then press ENTER..."
  );

  // STEP 6: Check Sign In button
  const signInButton = page.getByRole("button", {
    name: "Sign In",
    exact: true,
  });

  const deadline = Date.now() + 60000;

  while (!(await signInButton.isEnabled())) {
    if (Date.now() > deadline) {
      console.log("Sign In is still disabled.");
      console.log("Please check the verification status.");

      break;
    }

    await page.waitForTimeout(1000);
  }

  // STEP 7: Submit only if enabled
  if (await signInButton.isEnabled()) {
    await signInButton.click();

    console.log("Sign In clicked.");

    await page.waitForTimeout(5000);

    console.log("\n--- Login Result ---");
    console.log("URL:", page.url());
    console.log("Title:", await page.title());

    console.log(
      "Page content:",
      (await page.locator("body").innerText()).substring(0, 1500)
    );
  }

  await rl.question("\nPress ENTER to close browser...");

} catch (error) {
  console.error("\nAutomation Error:", error.message);

  await rl.question(
    "Press ENTER to close browser..."
  );

} finally {
  rl.close();
  await browser.close();
}
