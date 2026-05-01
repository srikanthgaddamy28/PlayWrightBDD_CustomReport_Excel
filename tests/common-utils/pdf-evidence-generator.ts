/// <reference types="node" />

import * as fs from 'fs';
import * as path from 'path';

import type { TestInfo } from '@playwright/test';
import imageSize from 'image-size';
import PDFDocument = require('pdfkit');

type EvidenceStep = {
    text: string;
    screenshotPath: string;
};

type LayoutSlot = {
    x: number;
    y: number;
    width: number;
    height: number;
};

export class PdfEvidenceGenerator {
    private static readonly evidenceSteps = new Map<string, EvidenceStep[]>();

    constructor(private readonly testInfo: TestInfo) { }

    addEvidenceStep(text: string, screenshotPath: string): void {
        const testKey = this.getTestKey();
        const existingSteps = PdfEvidenceGenerator.evidenceSteps.get(testKey) ?? [];

        existingSteps.push({ text, screenshotPath });
        PdfEvidenceGenerator.evidenceSteps.set(testKey, existingSteps);
    }

    clearEvidenceSteps(): void {
        PdfEvidenceGenerator.evidenceSteps.delete(this.getTestKey());
    }

    async generateAndAttach(): Promise<string | undefined> {
        const steps = PdfEvidenceGenerator.evidenceSteps.get(this.getTestKey()) ?? [];

        if (steps.length === 0) {
            return undefined;
        }

        const timestamp = this.createTimestamp();
        const safeTitle = this.sanitizeForFileName(this.getDisplayTestName());
        const pdfFileName = `${safeTitle}-${timestamp}-evidence.pdf`;
        const pdfPath = this.testInfo.outputPath(pdfFileName);

        await this.generatePdf(pdfPath, steps, timestamp);
        await this.testInfo.attach(pdfFileName, {
            path: pdfPath,
            contentType: 'application/pdf',
        });

        this.clearEvidenceSteps();

        return pdfPath;
    }

    private async generatePdf(pdfPath: string, steps: EvidenceStep[], timestamp: string): Promise<void> {
        await new Promise<void>((resolve, reject) => {
            const document = new PDFDocument({ margin: 48, size: 'A4' });
            const stream = fs.createWriteStream(pdfPath);

            stream.on('finish', () => resolve());
            stream.on('error', reject);
            document.on('error', reject);
            document.pipe(stream);

            this.drawReportHeader(document, timestamp);

            let pageIndex = 0;
            let slotIndex = 0;

            steps.forEach((step, stepIndex) => {
                const pageCapacity = pageIndex === 0 ? 1 : 2;

                if (slotIndex >= pageCapacity) {
                    document.addPage();
                    pageIndex += 1;
                    slotIndex = 0;
                }

                const slot = this.getLayoutSlot(document, pageIndex, slotIndex);
                this.drawEvidenceStep(document, step, stepIndex + 1, slot);
                slotIndex += 1;
            });

            document.end();
        });
    }

    private drawReportHeader(document: PDFKit.PDFDocument, timestamp: string): void {
        document.fontSize(18).text(this.getDisplayTestName(), 48, 48, { width: document.page.width - 96 });
        document
            .fontSize(10)
            .fillColor('#555555')
            .text(`Generated: ${timestamp}`, 48, 78, { width: document.page.width - 96 });
        document.fillColor('black');
    }

    private drawEvidenceStep(
        document: PDFKit.PDFDocument,
        step: EvidenceStep,
        stepNumber: number,
        slot: LayoutSlot,
    ): void {
        const stepLabel = `Step ${stepNumber}: ${step.text}`;
        const labelHeight = document.heightOfString(stepLabel, { width: slot.width, align: 'left' });
        const labelY = slot.y;
        const imageY = labelY + labelHeight + 8;
        const imageHeight = slot.height - labelHeight - 8;
        const imageWidth = slot.width;

        document.fontSize(12).text(stepLabel, slot.x, labelY, { width: slot.width, align: 'left' });

        const imageBuffer = fs.readFileSync(step.screenshotPath);
        const imageDimensions = imageSize(imageBuffer);
        const sourceWidth = imageDimensions.width ?? imageWidth;
        const sourceHeight = imageDimensions.height ?? imageHeight;
        const scale = Math.min(imageWidth / sourceWidth, imageHeight / sourceHeight, 1);
        const targetWidth = sourceWidth * scale;
        const targetHeight = sourceHeight * scale;

        document.image(step.screenshotPath, slot.x, imageY, {
            width: targetWidth,
            height: targetHeight,
        });

        document
            .rect(slot.x, imageY, targetWidth, targetHeight)
            .lineWidth(0.5)
            .strokeColor('#cfcfcf')
            .stroke();
        document.strokeColor('black');
    }

    private getLayoutSlot(document: PDFKit.PDFDocument, pageIndex: number, slotIndex: number): LayoutSlot {
        const x = 48;
        const width = document.page.width - 96;

        if (pageIndex === 0) {
            return {
                x,
                y: 110,
                width,
                height: document.page.height - 158,
            };
        }

        const gap = 20;
        const usableHeight = document.page.height - 96 - gap;
        const slotHeight = usableHeight / 2;

        return {
            x,
            y: 48 + slotIndex * (slotHeight + gap),
            width,
            height: slotHeight,
        };
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
        return value.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'test-case';
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