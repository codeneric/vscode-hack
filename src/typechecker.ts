/**
 * @file VS Code diagnostics integration with Hack typechecker.
 */

'use strict';

import * as vscode from 'vscode';
import * as hh_client from './proxy';

// tslint:disable-next-line:export-name
export class HackTypeChecker {
    constructor(private hhvmTypeDiag: vscode.DiagnosticCollection, private hhvmSoftDiag: vscode.DiagnosticCollection) {}

    public async run(document: vscode.TextDocument) {
        const typecheckResult = await hh_client.check();
        this.hhvmTypeDiag.clear();

        if (document !== null) {
            await this.runCustom(document);
        }

        if (!typecheckResult || typecheckResult.passed) {
            return;
        }

        const diagnosticMap: Map<string, vscode.Diagnostic[]> = new Map();
        typecheckResult.errors.forEach(error => {
            let fullMessage = '';
            error.message.forEach(messageUnit => {
                fullMessage = fullMessage + messageUnit.descr + ' [' + messageUnit.code + ']' + '\n';
            });
            const diagnostic = new vscode.Diagnostic(
                new vscode.Range(
                    new vscode.Position(error.message[0].line - 1, error.message[0].start - 1),
                    new vscode.Position(error.message[0].line - 1, error.message[0].end)),
                fullMessage,
                vscode.DiagnosticSeverity.Error);
            diagnostic.source = 'Hack';
            const file = error.message[0].path;
            if (diagnosticMap.has(file)) {
                diagnosticMap.get(file).push(diagnostic);
            } else {
                diagnosticMap.set(file, [diagnostic]);
            }
        });
        diagnosticMap.forEach((diags, file) => {
            this.hhvmTypeDiag.set(vscode.Uri.file(file), diags);
        });
    }

    /**
     * Optionally run a set of custom "soft" typecheck rules that aren't enforced by hh_client
     */
    public async runCustom(document: vscode.TextDocument) {
        this.hhvmSoftDiag.clear();
        const text = document.getText();
        const documentSymbols = await hh_client.outline(text);
        if (!documentSymbols || documentSymbols.length === 0) {
            return;
        }

        const diagnosticCollection: vscode.Diagnostic[] = [];
        for (const documentSymbol of documentSymbols) {
            if (documentSymbol.kind === 'function') {
                const found = await hh_client.ideFindRefs(text, documentSymbol.position.line, documentSymbol.position.char_start);
                if (!found) {
                    const diagnostic = new vscode.Diagnostic(
                        new vscode.Range(
                            new vscode.Position(documentSymbol.position.line - 1, documentSymbol.position.char_start - 1),
                            new vscode.Position(documentSymbol.position.line - 1, documentSymbol.position.char_end)),
                        'Reference not found in Typechecked code.',
                        vscode.DiagnosticSeverity.Warning);
                    diagnostic.source = 'Hack (Custom)';
                    diagnosticCollection.push(diagnostic);
                }
            }
        }
        if (diagnosticCollection.length > 0) {
            this.hhvmSoftDiag.set(document.uri, diagnosticCollection);
        }
    }
}
