import * as $ from "cheerio";
import {BoxrecRole} from "./boxrec-requests.constants";

/**
 * Takes a person's profile and returns what kind of profile role it is
 * @param html
 */
export const getRoleOfHTML: (html: string) => string | null = (html: string): string | null => {
    const $a: CheerioStatic = $.load(html);
    const href: string = $a("link[rel='canonical']").attr("href");
    const matches: RegExpMatchArray | null = href.match(/boxrec\.com\/en\/(\w+)\/\d+/);

    if (matches) {
        const roleValues: string[] = Object.values(BoxrecRole);
        const val: string | undefined = roleValues.find((value: string) => value === matches[1]);

        if (val) {
            return val;
        }
    }

    return null;
};
