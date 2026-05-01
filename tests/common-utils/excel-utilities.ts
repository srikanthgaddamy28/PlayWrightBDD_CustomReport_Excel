import * as fs from 'node:fs';
import * as path from 'node:path';
import * as XLSX from 'xlsx';

type ExcelRow = Record<string, unknown>;

type ExpandFeatureFilesFromMetadataOptions = {
    featureFilePaths: string[];
    outputDir: string;
    dataDir: string;
};

type ScenarioOutlineBlock = {
    scenarioName: string;
    examplesLineIndex: number;
    headerCells: string[];
    headerLineIndex: number;
    dataStartLineIndex: number;
    dataLineCount: number;
    dataRows: string[][];
    indentation: string;
};

type ParsedFeatureFile = {
    filePath: string;
    lines: string[];
    scenarioOutlines: ScenarioOutlineBlock[];
};

export class ExcelUtilities {
    readRows<T extends Record<string, unknown>>(
        filePath: string,
        sheetName?: string,
    ): T[] {
        const workbook = XLSX.readFile(filePath);
        const targetSheetName = sheetName ?? workbook.SheetNames[0];
        const worksheet = workbook.Sheets[targetSheetName];

        if (!worksheet) {
            throw new Error(`Sheet "${targetSheetName}" was not found in ${filePath}`);
        }

        return XLSX.utils.sheet_to_json<T>(worksheet, {
            defval: '',
        });
    }

    writeRows<T extends Record<string, unknown>>(
        filePath: string,
        rows: T[],
        sheetName = 'Sheet1',
        headerOrder?: string[],
    ): void {
        const worksheet = XLSX.utils.json_to_sheet(rows, {
            header: headerOrder,
        });
        const workbook = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        XLSX.writeFile(workbook, filePath);
    }

    appendRows<T extends Record<string, unknown>>(
        filePath: string,
        rows: T[],
        sheetName?: string,
    ): void {
        const workbook = XLSX.readFile(filePath);
        const targetSheetName = sheetName ?? workbook.SheetNames[0];
        const worksheet = workbook.Sheets[targetSheetName];

        if (!worksheet) {
            throw new Error(`Sheet "${targetSheetName}" was not found in ${filePath}`);
        }

        const existingRows = XLSX.utils.sheet_to_json<T>(worksheet, {
            defval: '',
        });

        const updatedWorksheet = XLSX.utils.json_to_sheet([...existingRows, ...rows]);
        workbook.Sheets[targetSheetName] = updatedWorksheet;

        XLSX.writeFile(workbook, filePath);
    }

    expandFeatureFilesFromExamplesMetadata(options: ExpandFeatureFilesFromMetadataOptions): string[] {
        const { featureFilePaths, outputDir, dataDir } = options;
        const parsedFeatureFiles = featureFilePaths.map((featureFilePath) =>
            this.parseFeatureFile(featureFilePath),
        );

        return parsedFeatureFiles.map((featureFile) => {
            if (featureFile.scenarioOutlines.length === 0) {
                return featureFile.filePath;
            }

            const expandedLines = [...featureFile.lines];
            let featureWasExpanded = false;

            for (const scenarioOutline of [...featureFile.scenarioOutlines].reverse()) {
                if (!this.isExcelReferenceOutline(scenarioOutline.headerCells)) {
                    continue;
                }

                const excelExamples = this.buildExamplesFromExcelReferences(
                    scenarioOutline,
                    dataDir,
                    featureFile.filePath,
                );

                expandedLines.splice(
                    scenarioOutline.examplesLineIndex,
                    scenarioOutline.dataLineCount + 2,
                    `${scenarioOutline.indentation}Examples:`,
                    excelExamples.headerLine,
                    ...excelExamples.dataLines,
                );
                featureWasExpanded = true;
            }

            if (!featureWasExpanded) {
                return featureFile.filePath;
            }

            const outputFilePath = path.join(outputDir, path.relative(process.cwd(), featureFile.filePath));
            fs.mkdirSync(path.dirname(outputFilePath), { recursive: true });
            fs.writeFileSync(outputFilePath, expandedLines.join('\n'));

            return outputFilePath;
        });
    }

    private parseFeatureFile(filePath: string): ParsedFeatureFile {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const lines = fileContent.split(/\r?\n/);
        const scenarioOutlines: ScenarioOutlineBlock[] = [];

        for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
            const trimmedLine = lines[lineIndex].trim();

            if (!trimmedLine.startsWith('Scenario Outline:')) {
                continue;
            }

            const scenarioName = trimmedLine.replace('Scenario Outline:', '').trim();
            const scenarioEndLineIndex = this.findScenarioOutlineEndLineIndex(lines, lineIndex + 1);
            let searchIndex = lineIndex + 1;

            while (searchIndex < scenarioEndLineIndex) {
                const examplesLineIndex = this.findExamplesLineIndex(lines, searchIndex, scenarioEndLineIndex);

                if (examplesLineIndex === -1) {
                    break;
                }

                const headerLineIndex = this.findExampleHeaderLineIndex(
                    lines,
                    examplesLineIndex + 1,
                    scenarioEndLineIndex,
                );

                if (headerLineIndex === -1) {
                    break;
                }

                const headerCells = this.parseTableRow(lines[headerLineIndex]);
                const dataStartLineIndex = headerLineIndex + 1;
                let dataEndLineIndex = dataStartLineIndex;

                while (dataEndLineIndex < scenarioEndLineIndex && lines[dataEndLineIndex].trim().startsWith('|')) {
                    dataEndLineIndex += 1;
                }

                scenarioOutlines.push({
                    scenarioName,
                    examplesLineIndex,
                    headerCells,
                    headerLineIndex,
                    dataStartLineIndex,
                    dataLineCount: dataEndLineIndex - dataStartLineIndex,
                    dataRows: lines
                        .slice(dataStartLineIndex, dataEndLineIndex)
                        .map((line) => this.parseTableRow(line)),
                    indentation: lines[headerLineIndex].match(/^\s*/)?.[0] ?? '',
                });

                searchIndex = dataEndLineIndex;
            }

            lineIndex = scenarioEndLineIndex - 1;
        }

        return {
            filePath,
            lines,
            scenarioOutlines,
        };
    }

    private findScenarioOutlineEndLineIndex(lines: string[], startIndex: number): number {
        for (let lineIndex = startIndex; lineIndex < lines.length; lineIndex += 1) {
            const trimmedLine = lines[lineIndex].trim();

            if (/^(Scenario|Scenario Outline|Background|Rule|Feature):/.test(trimmedLine)) {
                return lineIndex;
            }
        }

        return lines.length;
    }

    private findExamplesLineIndex(lines: string[], startIndex: number, endIndex: number): number {
        for (let lineIndex = startIndex; lineIndex < endIndex; lineIndex += 1) {
            const trimmedLine = lines[lineIndex].trim();

            if (trimmedLine.startsWith('Examples:')) {
                return lineIndex;
            }
        }

        return -1;
    }

    private findExampleHeaderLineIndex(lines: string[], startIndex: number, endIndex: number): number {
        for (let lineIndex = startIndex; lineIndex < endIndex; lineIndex += 1) {
            const trimmedLine = lines[lineIndex].trim();

            if (trimmedLine === '') {
                continue;
            }

            if (trimmedLine.startsWith('|')) {
                return lineIndex;
            }

            return -1;
        }

        return -1;
    }

    private parseTableRow(line: string): string[] {
        return line
            .trim()
            .split('|')
            .map((cell) => cell.trim())
            .filter((cell) => cell.length > 0);
    }

    private isExcelReferenceOutline(headerCells: string[]): boolean {
        return headerCells.length === 2
            && headerCells[0] === 'excelFile'
            && headerCells[1] === 'sheetName';
    }

    private buildExamplesFromExcelReferences(
        scenarioOutline: ScenarioOutlineBlock,
        dataDir: string,
        featureFilePath: string,
    ): { headerLine: string; dataLines: string[] } {
        let resolvedHeaders: string[] = [];
        const resolvedRows: ExcelRow[] = [];

        for (const metadataRow of scenarioOutline.dataRows) {
            const excelFileName = this.getCellValue(metadataRow[0]);
            const sheetName = this.getCellValue(metadataRow[1]);

            if (excelFileName === '' || sheetName === '') {
                continue;
            }

            const excelFilePath = path.join(dataDir, excelFileName);
            const workbookData = this.readSheetData(excelFilePath, sheetName);

            if (workbookData.headers.length === 0) {
                throw new Error(
                    `No headers were found in sheet "${sheetName}" for ${excelFilePath}`,
                );
            }

            if (resolvedHeaders.length === 0) {
                resolvedHeaders = workbookData.headers;
            } else if (!this.areHeadersEqual(resolvedHeaders, workbookData.headers)) {
                throw new Error(
                    `Mismatched Excel headers for scenario outline "${scenarioOutline.scenarioName}" in ${featureFilePath}`,
                );
            }

            resolvedRows.push(...workbookData.rows);
        }

        if (resolvedHeaders.length === 0) {
            throw new Error(
                `No excelFile/sheetName metadata rows were found for scenario outline "${scenarioOutline.scenarioName}" in ${featureFilePath}`,
            );
        }

        return {
            headerLine: `${scenarioOutline.indentation}| ${resolvedHeaders.join(' | ')} |`,
            dataLines: resolvedRows.map((row) =>
                `${scenarioOutline.indentation}| ${resolvedHeaders
                    .map((header) => this.formatExampleCell(row[header]))
                    .join(' | ')} |`,
            ),
        };
    }

    private readSheetData(filePath: string, sheetName: string): { headers: string[]; rows: ExcelRow[] } {
        const workbook = XLSX.readFile(filePath);
        const worksheet = workbook.Sheets[sheetName];

        if (!worksheet) {
            throw new Error(`Sheet "${sheetName}" was not found in ${filePath}`);
        }

        const rawRows = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(worksheet, {
            header: 1,
            defval: '',
        });
        const [headerRow = [], ...dataRows] = rawRows;
        const headers = headerRow
            .map((cell) => this.getCellValue(cell))
            .filter((header) => header.length > 0);
        const rows = dataRows
            .filter((dataRow) => dataRow.some((cell) => this.getCellValue(cell) !== ''))
            .map((dataRow) => this.mapRowToHeaders(headers, dataRow));

        return { headers, rows };
    }

    private mapRowToHeaders(headers: string[], dataRow: (string | number | boolean | null)[]): ExcelRow {
        return headers.reduce<ExcelRow>((row, header, index) => {
            row[header] = this.getCellValue(dataRow[index]);
            return row;
        }, {});
    }

    private areHeadersEqual(leftHeaders: string[], rightHeaders: string[]): boolean {
        return leftHeaders.length === rightHeaders.length
            && leftHeaders.every((header, index) => header === rightHeaders[index]);
    }

    private getCellValue(cellValue: unknown): string {
        return String(cellValue ?? '').trim();
    }

    private formatExampleCell(cellValue: unknown): string {
        return this.getCellValue(cellValue).replace(/\|/g, '\\|');
    }
}