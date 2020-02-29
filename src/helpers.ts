import * as $ from "cheerio";
import {Response, UrlOptions} from "request";
import * as rp from "request-promise";
import {RequestPromiseOptions} from "request-promise";
import {BoxrecRole} from "./boxrec-requests.constants";

/**
 * Takes a person's profile and returns what kind of profile role it is
 * @param html
 */
export const getRoleOfHTML: (html: string) => string | null = (html: string): string | null => {
    const $a: CheerioStatic = $.load(html);
    const href: string = $a("link[rel='canonical']").attr("href");

    if (href) {
        const matches: RegExpMatchArray | null = href.match(/boxrec\.com\/en\/(\w+)\/\d+/);

        if (matches) {
            const roleValues: string[] = Object.values(BoxrecRole);
            const val: string | undefined = roleValues.find((value: string) => value === matches[1]);

            if (val) {
                return val;
            }
        }
    }

    return null;
};

/**
 * This acts as a middleware between the package and the requests to BoxRec
 * For example if we hit a 429 "Too Many Requests" we want to return a proper message to the callers
 * @param options   the options used when calling rp ex. rp(OPTIONS)
 */
export const requestWrapper: <T extends Response | string>(options: UrlOptions & RequestPromiseOptions) => Promise<T>
    = async <T extends Response | string>(options: UrlOptions & RequestPromiseOptions): Promise<T> => {
    try {
        return await rp(options);
    } catch (e) {
        if (e.message.includes("recaptcha")) {
            throw new Error(`429 has occurred.
This is because of too many requests to BoxRec too quickly.
This package has not found a workaround at this time.
Please open a browser and login to BoxRec with this account and then resume.`);
        }

        throw e;
    }
};
