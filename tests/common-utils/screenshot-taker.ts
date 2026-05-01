/// <reference types="node" />

import type { Page, TestInfo } from '@playwright/test';

import { PdfEvidenceGenerator } from './pdf-evidence-generator';

export class ScreenshotTaker {
    private static readonly sequenceByTest = new Map<string, number>();

    constructor(private readonly testInfo: TestInfo) { }

    async getscreenshotinreport(page: Page, text: string): Promise<string> {
        const fileName = this.createFileName(text, 'report');
        const screenshotPath = this.testInfo.outputPath(fileName);

        await page.screenshot({ path: screenshotPath, fullPage: true });
        await this.testInfo.attach(fileName, {
            path: screenshotPath,
            contentType: 'image/png',
        });

        return screenshotPath;
    }

    async getscreenshot(page: Page, text: string): Promise<string> {
        const fileName = this.createFileName(text, 'pdf');
        const screenshotPath = this.testInfo.outputPath(fileName);
        const pdfEvidenceGenerator = new PdfEvidenceGenerator(this.testInfo);

        await page.screenshot({ path: screenshotPath, fullPage: true });
        pdfEvidenceGenerator.addEvidenceStep(text, screenshotPath);

        return screenshotPath;
    }

    clearSequence(): void {
        ScreenshotTaker.sequenceByTest.delete(this.getTestKey());
    }

    private createFileName(text: string, suffix: string): string {
        const timestamp = this.createTimestamp();
        const safeTitle = this.sanitizeForFileName(this.getDisplayTestName());
        const safeText = this.sanitizeForFileName(text);
        const sequence = this.nextSequence();

        return `${safeTitle}-${timestamp}-${sequence}-${safeText}-${suffix}.png`;
    }

    private nextSequence(): number {
        const testKey = this.getTestKey();
        const currentValue = ScreenshotTaker.sequenceByTest.get(testKey) ?? 0;
        const nextValue = currentValue + 1;

        ScreenshotTaker.sequenceByTest.set(testKey, nextValue);

        return nextValue;
    }

    private getTestKey(): string {
        return [
            this.testInfo.project.name,
            this.getFullTitlePath().join('::') || this.testInfo.title,
            this.testInfo.retry,
            this.testInfo.repeatEachIndex,
        ].join('::');
    }

    private getDisplayTestName(): string {
        const titlePath = this.getFullTitlePath();
        const scenarioTitle = [...titlePath]
            .reverse()
            .find((segment) => segment.length > 0 && !/^Example #\d+$/i.test(segment));

        return scenarioTitle ?? this.testInfo.title;
    }

    private getFullTitlePath(): string[] {
        const testInfoWithTitlePath = this.testInfo as TestInfo & {
            titlePath?: string[] | (() => string[]);
        };
        const rawTitlePath = typeof testInfoWithTitlePath.titlePath === 'function'
            ? testInfoWithTitlePath.titlePath()
            : Array.isArray(testInfoWithTitlePath.titlePath)
                ? testInfoWithTitlePath.titlePath
                : [];

        return rawTitlePath.filter((segment) =>
            segment.length > 0
            && segment !== this.testInfo.project.name
            && !segment.endsWith('.spec.js')
            && !segment.endsWith('.spec.ts'),
        );
    }

    private sanitizeForFileName(value: string): string {
        return value.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'artifact';
    }

    private createTimestamp(): string {
        const currentDate = new Date();
        const parts = [
            currentDate.getFullYear(),
            String(currentDate.getMonth() + 1).padStart(2, '0'),
            String(currentDate.getDate()).padStart(2, '0'),
            String(currentDate.getHours()).padStart(2, '0'),
            String(currentDate.getMinutes()).padStart(2, '0'),
            String(currentDate.getSeconds()).padStart(2, '0'),
        ];

        return parts.join('');
    }
}