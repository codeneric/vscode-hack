/**
 * @file Convert all <?php files in the project to strictest <?hh mode possible.
 */

'use strict';

import * as fs from 'fs';
import * as os from 'os';
import * as vscode from 'vscode';
import * as hh_client from './proxy';

export function convert() {
    const exclude: string = '{include/**/*.php,translate/**/*.php}';
    vscode.workspace.findFiles('**/*.php', exclude).then(uris => {
        for (const uri of uris) {
            // fileStatus.text = 'Updating file associations (' + i + ' of ' + count + ')';
            vscode.workspace.openTextDocument(uri).then(document => {
                vscode.window.showTextDocument(document, null, false).then(editor => {
                    editor.edit(edit => {
                        edit.replace(new vscode.Range(1, 1, 1, 5), '<?hh // decl');
                        console.log('Converted ' + uri.toString());
                        return;
                    });
                    /*onst text = document.getText();
                    if (text.startsWith('<?php')) {
                        text.replace('<?php', '<?hh // decl');
                    }*/
                });
            });
        }
    });
}

export async function checkDupes() {
    const dupes = new Map<string, any[]>();
    const result = await hh_client.check();
    if (!result.passed) {
        for (const error of result.errors){
            if (error.message[0].code === 2012) {
                const reg = new RegExp(/^Name already bound: (.*)$/);
                const match = reg.exec(error.message[0].descr);
                const sym: string = match[1];

                if (!dupes.has(sym)) {
                    const searchResult = await hh_client.search(sym);
                    if (!searchResult || searchResult.length <= 1) {
                        console.log('Couldn\'t get results for ' + sym);
                    } else {
                        searchResult.forEach(res => {
                            if (res.name === sym) {
                                if (!dupes.has(sym)) {
                                    dupes.set(sym, [res]);
                                } else {
                                    const values = dupes.get(sym);
                                    values.push(res);
                                    dupes.set(sym, values);
                                }
                            }
                        });
                    }
                }
            }
        }
    }
    // console.log(dupes);

    const a = [];
    for (const x of dupes) {
        a.push(x);
    }
    a.sort((x, y) => {
        return y[1].length - x[1].length;
    });

    console.log(__dirname);

    for (const y of a) {
        fs.appendFileSync(__dirname + '/dupes.csv', y[0] + os.EOL);
        for (const yn of y[1]) {
            const line = ',' + yn.filename + ',' + yn.line + ',' + yn.scope + os.EOL;
            fs.appendFileSync(__dirname + '/dupes.csv', line);
        }
        // console.log(y[0] + ' - ' + y[1].length + ' definitions');
    }

    console.log('Done!');
}
