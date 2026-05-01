import { createBdd } from 'playwright-bdd';

import { PdfEvidenceGenerator } from '../common-utils/pdf-evidence-generator';
import { ScreenshotTaker } from '../common-utils/screenshot-taker';
import { LoginPage } from '../pages/login.page';
import { SecureAreaPage } from '../pages/secure-area.page';

const { Before, After, Given, When, Then } = createBdd();

Before(async ({ $testInfo }) => {
    const pdfEvidenceGenerator = new PdfEvidenceGenerator($testInfo);
    const screenshotTaker = new ScreenshotTaker($testInfo);

    pdfEvidenceGenerator.clearEvidenceSteps();
    screenshotTaker.clearSequence();
});

After(async ({ page, $testInfo }) => {
    const screenshotTaker = new ScreenshotTaker($testInfo);
    const pdfEvidenceGenerator = new PdfEvidenceGenerator($testInfo);

    if (!page.isClosed()) {
        await screenshotTaker.getscreenshotinreport(page, 'Final scenario state');
    }

    await pdfEvidenceGenerator.generateAndAttach();
    screenshotTaker.clearSequence();
});

Given('the demo login page is open', async ({ page, $testInfo }) => {
    const loginPage = new LoginPage(page);
    const screenshotTaker = new ScreenshotTaker($testInfo);

    await loginPage.goto();
    await loginPage.expectLoaded();
    await screenshotTaker.getscreenshot(page, 'Login page is open');
});

When('I sign in with the demo credentials', async ({ page, $testInfo }) => {
    const loginPage = new LoginPage(page);
    const screenshotTaker = new ScreenshotTaker($testInfo);

    await loginPage.signInWithDemoCredentials();
    await screenshotTaker.getscreenshot(page, 'Credentials submitted');
});

Then('I should see the secure area message', async ({ page, $testInfo }) => {
    const secureAreaPage = new SecureAreaPage(page);
    const screenshotTaker = new ScreenshotTaker($testInfo);

    await secureAreaPage.expectDefaultSecureAreaMessage();
    await screenshotTaker.getscreenshot(page, 'Secure area message validated');
});

Then(
    'the secure area should contain {string}, {string}, {string}, and {string}',
    async ({ page, $testInfo }, flashMessage: string, pageHeading: string, description: string, actionButtonText: string) => {
        const secureAreaPage = new SecureAreaPage(page);
        const screenshotTaker = new ScreenshotTaker($testInfo);

        await secureAreaPage.expectSecureAreaDetails(
            flashMessage,
            pageHeading,
            description,
            actionButtonText,
        );
        await screenshotTaker.getscreenshot(page, 'Secure area details validated');
    },
);

Then(
    'I should be able to log out and see {string} on the login page',
    async ({ page, $testInfo }, loggedOutMessage: string) => {
        const secureAreaPage = new SecureAreaPage(page);
        const loginPage = new LoginPage(page);
        const screenshotTaker = new ScreenshotTaker($testInfo);

        await secureAreaPage.clickActionButton();
        await loginPage.expectLoggedOutMessage(loggedOutMessage);
        await screenshotTaker.getscreenshot(page, 'Logged out back on login page');
    },
);