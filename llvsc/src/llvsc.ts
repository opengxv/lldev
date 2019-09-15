'use strict';
import * as vscode from 'vscode';
import { format } from 'path';
import { EILSEQ, ENGINE_METHOD_NONE } from 'constants';
import { ClientRequest } from 'http';

interface Tag {
    text: string;
    range: vscode.Range;
}

enum ActionType {
    None,
    SmartSpace,
    SmartSemicolon,
    SmartColon,
    SmartEnter,
}

enum UpdateType {
    Smart,
    Replace,
    Snippet,
    FormatLine,
}

interface UpdateData {
    type: UpdateType;
    range?: vscode.Range;
    position?: vscode.Position;
    text?: string;
}

export class LLVsc {
    private _actionType: ActionType = ActionType.None;
    private _defaultText = ["", " ", ";", ":", "\n"];
    private _updates: Array<UpdateData> = [];
    private _position: vscode.Position = new vscode.Position(0, 0);
    private _lineText: string = "";
    private _text: string = "";

    run(context: vscode.ExtensionContext) {
        vscode.window.onDidChangeActiveTextEditor(event => {
            this.onDidChangeActiveTextEditor(event);
        });

        vscode.window.onDidChangeTextEditorSelection(event => {
            this.onDidChangeTextEditorSelection(event);
        });

        vscode.workspace.onDidChangeTextDocument(event => {
            this.onDidChangeTextDocument(event);
        });

        context.subscriptions.push(vscode.commands.registerCommand('llvsc.smartSpace', () => {
            this.doSmart(ActionType.SmartSpace);
        }));
        context.subscriptions.push(vscode.commands.registerCommand('llvsc.smartSemicolon', () => {
            this.doSmart(ActionType.SmartSemicolon);
        }));
        context.subscriptions.push(vscode.commands.registerCommand('llvsc.smartColon', () => {
            this.doSmart(ActionType.SmartColon);
        }));
        context.subscriptions.push(vscode.commands.registerCommand('llvsc.smartEnter', () => {
            this.doSmart(ActionType.SmartEnter);
        }));
    }

    private onDidChangeActiveTextEditor(editor: vscode.TextEditor | undefined): void {
        if (!editor) {
            return;
        }
        let document = editor.document;
        let selection = editor.selection;
    }

    private onDidChangeTextEditorSelection(event: vscode.TextEditorSelectionChangeEvent): void {
    }


    private onDidChangeTextDocument(event: vscode.TextDocumentChangeEvent): void {
        let document = event.document;
        if (!event.contentChanges[0] || vscode.window.activeTextEditor === undefined) {
            return;
        }
        this.doUpdates(vscode.window.activeTextEditor);
    }

    private doSmart(type: ActionType): void {
        this._updates = [];
        let editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        if (!editor.selection.isEmpty) {
            this._updates.push({
                type: UpdateType.Replace,
            });
        }
        this._actionType = type;
        this.pushUpdate(editor, {type: UpdateType.Smart});
        this.doUpdates(editor);
    }

    private doUpdates(editor: vscode.TextEditor): void {
        var update: UpdateData | undefined;
        while ((update = this._updates.shift()) !== undefined) {
            if (!this.doUpdate(editor, update)) {
                this._updates = [];
                break;
            }
            if (update.type !== UpdateType.Smart) {
                break;
            }
        }
    }

    private doUpdate(editor: vscode.TextEditor, update: UpdateData): boolean {
        var range: vscode.Range;
        var text: string;
        var nextPos: vscode.Position;

        switch (update.type) {
            case UpdateType.Replace:
                text = update.text === undefined ? "" : update.text;
                if (update.range !== undefined) {
                    range = update.range;
                }
                else if (update.position !== undefined) {
                    range = new vscode.Range(update.position, update.position);
                }
                else {
                    range = editor.selection;
                }
                editor.edit((builder) => {
                    builder.replace(range, text);
                }, { undoStopBefore: false, undoStopAfter: false });
                nextPos = new vscode.Position(range.start.line, range.start.character + text.length);
                editor.selection = new vscode.Selection(nextPos, nextPos);
                break;
            case UpdateType.Snippet:
                editor.insertSnippet(new vscode.SnippetString(update.text));
                break;
            case UpdateType.FormatLine:
                vscode.commands.executeCommand("editor.action.formatSelection");
                break;
            case UpdateType.Smart:
                this._position = editor.selection.start;
                this._lineText = editor.document.lineAt(this._position.line).text;
                this._text = this._lineText;
                switch (this._actionType) {
                    case ActionType.SmartSpace:
                        this.doSmartSpace(editor);
                        break;
                    case ActionType.SmartSemicolon:
                        this.doSmartSemicolon(editor);
                        break;
                    case ActionType.SmartColon:
                        this.doSmartColon(editor);
                        break;
                    case ActionType.SmartEnter:
                        this.doSmartEnter(editor);
                        break;
                }
                break;
            default:
                return false;
        }
        return true;
    }

    private pushUpdate(editor: vscode.TextEditor, update: UpdateData): void {
        this._updates.push(update);
    }

    private pushDefault(editor: vscode.TextEditor): void {
        this.pushUpdate(editor, {
            type: UpdateType.Replace,
            text: this._defaultText[this._actionType],
        });
    }

    private pushSnippet(editor: vscode.TextEditor, tag: Tag, snippet: string): void {
        this.pushUpdate(editor, {type: UpdateType.Replace, range: tag.range});
        this.pushUpdate(editor, {type: UpdateType.Snippet, text: snippet});
    }

    private pushFormatLine(editor: vscode.TextEditor): void {
        this.pushUpdate(editor, {type: UpdateType.FormatLine});
    }
    private checkInString(editor: vscode.TextEditor): boolean {
        this._text = this._text.replace(/\\\\|\\\"/, "  ");
        let regex = /\"[^\"]*(\"?)/g;
        let result = null;
        while ((result = regex.exec(this._text)) !== null) {
            let length = 0;
            if (result[0]) {
                length = result[0].length;
            }
            else {
                length = Number.MAX_VALUE;
            }
            if (this._position.character > result.index && this._position.character <= result.index + length - 1) {
                this.pushDefault(editor);
                return true;
            }
        }
        return false;
    }
    private checkInLineComment(editor: vscode.TextEditor): boolean {
        let regex = /\/\/.*$/;
        var result;
        if ((result = regex.exec(this._text)) !== null) {
            if (this._position.character > result.index) {
                this.pushDefault(editor);
                return true;
            }
            this._text = this._text.substr(0, result.index);
        }
        return false;
    }

    private doSmartSpace(editor: vscode.TextEditor): void {
        if (this.checkInLineComment(editor)) {
            return;
        }
        if (this.checkInString(editor)) {
            return;
        }
        let document = editor.document;
        let selection = editor.selection;
        let tag = this.getTag(this._position);

        if (!tag) {
            this.pushDefault(editor);
            return;
        }
        switch (tag.text) {
            case "if":
                this.pushSnippet(editor, tag, "if ($1) {\n\t$0\n}");
                break;
            case "while":
                this.pushSnippet(editor, tag, "while ($1) {\n\t$0\n}");
                break;
            case "else":
                this.pushSnippet(editor, tag, "else {\n\t$0\n}");
                break;
            case "elsif":
            case "elif":
                this.pushSnippet(editor, tag, "else if ($1) {\n\t$0\n}");
                break;
            case "switch":
                this.pushSnippet(editor, tag, "switch ($1) {\n case $0:\n\t\n\tbreak;\n}");
                break;
            default:
                this.pushDefault(editor);
                break;
        }
        return;
    }

    private doSmartSemicolon(editor: vscode.TextEditor): void {
        if (this.checkInLineComment(editor)) {
            return;
        }
        if (this.checkInString(editor)) {
            return;
        }
        let regex = /(\;*)[ \t]*$/;
        let result = null;
        var range: vscode.Range;
        if ((result = regex.exec(this._text)) !== null) {
            range = new vscode.Range(
                new vscode.Position(this._position.line, result.index),
                new vscode.Position(this._position.line, this._text.length));
        }
        else {
            range = new vscode.Range(
                new vscode.Position(this._position.line, this._text.length),
                new vscode.Position(this._position.line, this._text.length));
        }
        this.pushUpdate(editor, {type: UpdateType.Replace, range: range, text: ";"});
        this.pushFormatLine(editor);
    }

    private doSmartColon(editor: vscode.TextEditor): void {
        if (this.checkInLineComment(editor)) {
            return;
        }
        if (this.checkInString(editor)) {
            return;
        }
        let regex = /(:*)[ \t]*$/;
        let result = null;
        var range: vscode.Range;
        let doFomrat = true;
        if (!/(^case|[^0-9a-zA-Z_]case).*$/.test(this._text) &&
            !/(^default|[^0-9a-zA-Z_]default).*$/.test(this._text) &&
            !/(^public|[^0-9a-zA-Z_]public).*$/.test(this._text) &&
            !/(^private|[^0-9a-zA-Z_]private).*$/.test(this._text) &&
            !/(^protected|[^0-9a-zA-Z_]protected).*$/.test(this._text)) {
            range = new vscode.Range(this._position, this._position);
            doFomrat = false;
        }
        else if ((result = regex.exec(this._text)) !== null) {
            range = new vscode.Range(
                new vscode.Position(this._position.line, result.index),
                new vscode.Position(this._position.line, this._text.length));
        }
        else {
            range = new vscode.Range(
                new vscode.Position(this._position.line, this._text.length),
                new vscode.Position(this._position.line, this._text.length));
        }
        this.pushUpdate(editor, {type: UpdateType.Replace, range: range, text: ":"});
        if (doFomrat) {
            this.pushFormatLine(editor);
        }
    }

    private doSmartEnter(editor: vscode.TextEditor): void {
        //this.pushFormatLine(editor);
        vscode.commands.executeCommand("Insert Line Below");
    }

    private defaultInput(editor: vscode.TextEditor, text: string): vscode.Selection {
        let selection = editor.selection;
        editor.edit((builder) => {
            builder.replace(selection, text);
        }, { undoStopBefore: false, undoStopAfter: false });
        let nextPos = new vscode.Position(selection.active.line, selection.active.character + text.length);
        editor.selection = new vscode.Selection(nextPos, nextPos);
        return editor.selection;
    }

    private getTag(position: vscode.Position): Tag | null {
        let char = position.character;
        let regex = /[a-zA-Z_][a-zA-Z0-9_]*/g;
        let result = null;
        while ((result = regex.exec(this._text)) !== null) {
            if (result[0] && result.index + result[0].length === char) {
                return {
                    text: result[0],
                    range: new vscode.Range(
                        new vscode.Position(position.line, result.index),
                        new vscode.Position(position.line, result.index + result[0].length))
                };
            }
        }

        return null;
    }

    private enabled(): boolean {
        return true;
    }
}