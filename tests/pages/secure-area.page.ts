import { expect, Page } from '@playwright/test';

import secureAreaSelectors from '../selectors/secure-area.selectors.json';

export class SecureAreaPage {
    private readonly flashMessage;
    private readonly pageHeading;
    private readonly description;
    private readonly actionButton;

    constructor(private readonly page: Page) {
        this.flashMessage = this.page.locator(secureAreaSelectors.flashMessage);
        this.pageHeading = this.page.locator(secureAreaSelectors.pageHeading);
        this.description = this.page.locator(secureAreaSelectors.description);
        this.actionButton = this.page.locator(secureAreaSelectors.actionButton);
    }

    async expectDefaultSecureAreaMessage() {
        await expect(this.flashMessage).toContainText('You logged into a secure area!');
    }

    async expectSecureAreaDetails(
        flashMessage: string,
        pageHeading: string,
        description: string,
        actionButtonText: string,
    ) {
        await expect(this.flashMessage).toContainText(flashMessage);
        await expect(this.pageHeading).toContainText(pageHeading);
        await expect(this.description).toContainText(description);
        await expect(this.actionButton).toContainText(actionButtonText);
    }

    async clickActionButton() {
        await this.actionButton.click();
    }
}