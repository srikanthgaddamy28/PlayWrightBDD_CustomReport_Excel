import { expect, Page } from '@playwright/test';

import demoLoginCredentials from '../credentials/demo-login.credentials.json';
import loginPageSelectors from '../selectors/login-page.selectors.json';

export class LoginPage {
    private readonly heading;
    private readonly usernameInput;
    private readonly passwordInput;
    private readonly loginButton;
    private readonly flashMessage;

    constructor(private readonly page: Page) {
        this.heading = this.page.locator(loginPageSelectors.heading);
        this.usernameInput = this.page.locator(loginPageSelectors.usernameInput);
        this.passwordInput = this.page.locator(loginPageSelectors.passwordInput);
        this.loginButton = this.page.locator(loginPageSelectors.loginButton);
        this.flashMessage = this.page.locator(loginPageSelectors.flashMessage);
    }

    async goto() {
        await this.page.goto(demoLoginCredentials.baseUrl);
    }

    async expectLoaded() {
        await expect(this.heading).toHaveText('Login Page');
    }

    async signInWithDemoCredentials() {
        await this.usernameInput.fill(demoLoginCredentials.username);
        await this.passwordInput.fill(demoLoginCredentials.password);
        await this.loginButton.click();
    }

    async expectLoggedOutMessage(loggedOutMessage: string) {
        await expect(this.heading).toHaveText('Login Page');
        await expect(this.flashMessage).toContainText(loggedOutMessage);
    }
}