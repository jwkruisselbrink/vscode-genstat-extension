import { biometrisKeywords } from "./biometrisKeywords";
import { genstatKeywords } from "./genstatKeywords";

export class GenStatKeywordProvider {

    private _keyWordMap: Map<string, string>;

    public get KeywordMap(): Map<string, string> {
        if (!this._keyWordMap) {
            let map = new Map<string, string>();
            genstatKeywords.forEach(r => map.set(r.substr(0,4), r));
            biometrisKeywords.forEach(r => map.set(r.substr(0,4), r));
            this._keyWordMap = map;
        }
        return this._keyWordMap;
    }

    public tryFindKeyword(str: string) {
        let upper = str.toUpperCase();
        if (this.KeywordMap.has(upper)) {
            return this.KeywordMap.get(upper);
        }
        return null;
    }
}
