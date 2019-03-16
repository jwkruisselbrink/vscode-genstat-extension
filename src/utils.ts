import { TextDocument, Position } from "vscode";

export const genstatKeywords: string[] = [
	'if',
	'elsif',
	'endif',
	'for',
	'endfor'
];

export function adjustWordPosition(document: TextDocument, position: Position): [boolean, string, Position] {
	let wordRange = document.getWordRangeAtPosition(position);
	let lineText = document.lineAt(position.line).text;
	let word = wordRange ? document.getText(wordRange) : '';
	if (!wordRange || lineText.startsWith('//') || isPositionInString(document, position) || word.match(/^\d+.?\d+$/) || genstatKeywords.indexOf(word) > 0) {
	 	return [false, null, null];
	}
	if (position.isEqual(wordRange.end) && position.isAfter(wordRange.start)) {
 	    position = position.translate(0, -1);
    }
	return [true, word, position];
}

export function isPositionInString(document: TextDocument, position: Position): boolean {
	let lineText = document.lineAt(position.line).text;
	let lineTillCurrentPosition = lineText.substr(0, position.character);

	// Count the number of double quotes in the line till current position. Ignore escaped double quotes
	let doubleQuotesCnt = (lineTillCurrentPosition.match(/\"/g) || []).length;
	let escapedDoubleQuotesCnt = (lineTillCurrentPosition.match(/\\\"/g) || []).length;

	doubleQuotesCnt -= escapedDoubleQuotesCnt;
	return doubleQuotesCnt % 2 === 1;
}
