/// <reference types="node" />

import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';

import { ExcelUtilities } from './tests/common-utils/excel-utilities';

type RunSelectorRow = {
    tag?: string;
    run?: string;
};

type ProcessEnvironment = Record<string, string | undefined>;

class TestRunner {
    private readonly excelUtilities = new ExcelUtilities();
    private readonly runtimeFeatureDir = '.runtime-features';
    private readonly generatedTestsDir = '.features-gen';
    private readonly featureDir = 'tests/features';
    private readonly dataDir = 'tests/data';
    private readonly runSelectorPath = 'tests/runner-config/run-selector.xlsx';

    run(browser = 'chromium', extraPlaywrightArgs: string[] = []) {
        const featureFiles = this.findFiles(this.featureDir, '.feature');
        const runtimeEnv: ProcessEnvironment = { ...process.env };

        if (featureFiles.length === 0) {
            throw new Error(`No feature files were found under ${this.featureDir}`);
        }

        this.cleanRuntimeFeatures();
        this.cleanGeneratedTests();

        try {
            const selectedFeatureFiles = this.resolveFeatureFiles(featureFiles);
            const enabledTagsExpression = this.buildEnabledTagsExpression();

            runtimeEnv.BDD_FEATURES = JSON.stringify(selectedFeatureFiles.map((filePath) => this.toPosixPath(filePath)));
            runtimeEnv.BDD_TAGS = enabledTagsExpression;

            this.runCommand('npx', ['bddgen'], runtimeEnv);
            this.runCommand('npx', ['playwright', 'test', '--project', browser, ...extraPlaywrightArgs], runtimeEnv);
        } finally {
            this.cleanRuntimeFeatures();
        }
    }

    private resolveFeatureFiles(featureFiles: string[]): string[] {
        return this.excelUtilities.expandFeatureFilesFromExamplesMetadata({
            featureFilePaths: featureFiles,
            outputDir: this.runtimeFeatureDir,
            dataDir: this.dataDir,
        });
    }

    private buildEnabledTagsExpression(): string {
        const selectorRows = this.excelUtilities.readRows<RunSelectorRow>(this.runSelectorPath);
        const enabledTags = selectorRows
            .filter((row) => this.isEnabled(row.run))
            .map((row) => String(row.tag ?? '').trim())
            .filter((tag) => tag.length > 0);

        if (enabledTags.length === 0) {
            throw new Error(`No runnable tags were enabled in ${this.runSelectorPath}`);
        }

        return enabledTags.length === 1 ? enabledTags[0] : `(${enabledTags.join(' or ')})`;
    }

    private isEnabled(value: string | undefined): boolean {
        const normalizedValue = String(value ?? '').trim().toLowerCase();
        return normalizedValue === 'yes' || normalizedValue === 'y' || normalizedValue === 'true';
    }

    private findFiles(directoryPath: string, extension: string): string[] {
        if (!fs.existsSync(directoryPath)) {
            return [];
        }

        const matchedFiles: string[] = [];

        for (const entry of fs.readdirSync(directoryPath, { withFileTypes: true })) {
            const entryPath = path.join(directoryPath, entry.name);

            if (entry.isDirectory()) {
                matchedFiles.push(...this.findFiles(entryPath, extension));
                continue;
            }

            if (entry.isFile() && entry.name.endsWith(extension)) {
                if (entry.name.startsWith('._')) {
                    continue;
                }

                matchedFiles.push(entryPath);
            }
        }

        return matchedFiles.sort((left, right) => left.localeCompare(right));
    }

    private cleanRuntimeFeatures() {
        fs.rmSync(this.runtimeFeatureDir, { recursive: true, force: true });
    }

    private cleanGeneratedTests() {
        fs.rmSync(this.generatedTestsDir, { recursive: true, force: true });
    }

    private toPosixPath(filePath: string): string {
        return filePath.split(path.sep).join('/');
    }

    private runCommand(command: string, args: string[], env: ProcessEnvironment) {
        const result = spawnSync(command, args, {
            stdio: 'inherit',
            env,
        });

        if (result.status !== 0) {
            throw new Error(`Command failed: ${command} ${args.join(' ')}`);
        }
    }
}

const [browser, ...extraPlaywrightArgs] = process.argv.slice(2);

new TestRunner().run(browser, extraPlaywrightArgs);
