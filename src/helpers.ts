import * as $ from "cheerio";
import {BoxrecFighterOption, BoxrecRole} from "./boxrec-requests.constants";
import Root = cheerio.Root;

/**
 * Takes a person's profile and returns what kind of profile role it is
 * @param html
 */
export const getRoleOfHTML: (html: string) => string | null = (html: string): string | null => {
    const $a: Root = $.load(html);
    const href: string | undefined = $a("link[rel='canonical']").attr("href");

    if (href) {
        const matches: RegExpMatchArray | null = href.match(/boxrec\.com\/en\/([\w\-]+)\/\d+/);

        if (matches) {
            const roleValues: string[] = Object.values({ ...Object.values(BoxrecRole), ...Object.values(BoxrecFighterOption)} as Record<number, string>);
            const val: string | undefined = roleValues.find((value: string) => value === matches[1]);

            if (val) {
                return val;
            }
        }
    }

    return null;
};

export const debugMsg = (msg: string): void => {
    if (process.env.BOXREC_REQUESTS_DEBUG) {
        // tslint:disable-next-line:no-console
        console.log(msg);
    }
};
