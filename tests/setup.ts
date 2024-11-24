import { chromium, ChromiumBrowser, Page } from '@playwright/test';

interface TestContext {
  browser: ChromiumBrowser | null;
  page: Page | null;
  getPage: () => Promise<Page>;
}

const testContext: TestContext = {
  browser: null,
  page: null,
  async getPage() {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: !process.env.TEST_UI
      });
    }
    this.page = await this.browser.newPage();
    return this.page;
  }
};

beforeAll(async () => {
  testContext.browser = await chromium.launch({
    headless: !process.env.TEST_UI
  });
});

afterAll(async () => {
  if (testContext.browser) {
    await testContext.browser.close();
  }
});

beforeEach(async () => {
  testContext.page = await testContext.getPage();
});

afterEach(async () => {
  if (testContext.page) {
    await testContext.page.close();
  }
});

export default testContext;
