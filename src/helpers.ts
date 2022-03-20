import * as $ from "cheerio";
import fetch, {RequestInit, Response} from "node-fetch";
import {UrlOptions} from "request";
import * as rp from "request-promise";
import {RequestPromiseOptions} from "request-promise";
import { URLSearchParams } from "url";
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
 */
export async function requestWrapperFetch(url: string, cookies: undefined, parametersOrQueryString: RequestInit):
    Promise<Response>;
export async function requestWrapperFetch(url: string, cookies: string, parametersOrQueryString?: any):
    Promise<string>;
export async function requestWrapperFetch(url: string, cookies?: string, parametersOrQueryString?: RequestInit | any): Promise<Response | string> {

    try {
        if (parametersOrQueryString && parametersOrQueryString?.method === "POST") {
            return fetch(url, parametersOrQueryString);
        }

        const queryString: URLSearchParams = new URLSearchParams(parametersOrQueryString);
        const response: Response = await fetch(url + queryString, {
            headers: {
                Cookie: cookies || "",
            }
        });

        return await response.text();
    } catch (e) {
        if (e.message.includes("recaptcha")) {
            throw new Error(`429 has occurred.
This is because of too many requests to BoxRec too quickly.
This package has not found a workaround at this time.
Please open a browser and login to BoxRec with this account and then resume.`);
        }

        throw e;
    }
}
