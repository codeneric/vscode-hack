/**
 * Loads values from VS Code config. It is currently only read at extension launch,
 * but config change watchers can be added here if needed.
 */

import * as vscode from 'vscode';
import * as crypto from "crypto";

export function get_container_name(workspace): string {
    let cont_name =
      "hack_" +
      crypto
        .createHash("md5")
        .update(workspace)
        .digest("hex");
    return cont_name;
  }
  
  export function get_hh_client(workspace): string {
    let cont_name = get_container_name(workspace);
    let cmd = `docker exec -i ${cont_name} hh_client`;
    return cmd;
  }

const hackConfig = vscode.workspace.getConfiguration('hack');



export const workspace: string = hackConfig.get('workspaceRootPath') || vscode.workspace.rootPath || '';
export const enableCoverageCheck: boolean = hackConfig.get('enableCoverageCheck') || false;
export const useLanguageServer: boolean = hackConfig.get('useLanguageServer') || false;

// export const clientPath: string = hackConfig.get('clientPath') || 'hh_client';
export const clientPath: string = get_hh_client(workspace);
export const hhClientArgs: string[] = clientPath.split(' ');
export const hhClientCommand: string = String(hhClientArgs.shift());


