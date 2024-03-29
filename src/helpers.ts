import * as $ from "cheerio";
import fetch, {RequestInit, Response} from "node-fetch";
import { URLSearchParams } from "url";
import {BoxrecRole} from "./boxrec-requests.constants";
import Root = cheerio.Root;

/**
 * Takes a person's profile and returns what kind of profile role it is
 * @param html
 */
export const getRoleOfHTML: (html: string) => string | null = (html: string): string | null => {
    const $a: Root = $.load(html);
    const href: string | undefined = $a("link[rel='canonical']").attr("href");

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

export async function requestWrapperFullResponse(url: string, cookies?: string, parametersOrQueryString?: any): Promise<Response> {
    try {
        if (parametersOrQueryString && parametersOrQueryString?.method === "POST") {
            return fetch(url, {
                ...parametersOrQueryString,
                headers: {
                    ...parametersOrQueryString.headers,
                    Cookie: cookies || "",
                },
            });
        }

        const queryString: URLSearchParams = new URLSearchParams(parametersOrQueryString);
        const urlWithQueryString: string = `${url}?${queryString.toString()}`;

        return fetch(urlWithQueryString, {
            headers: {
                Cookie: cookies || "",
            },
        });
    } catch (e) {
        if ((e as any).message.includes("recaptcha")) {
            throw new Error(`429 has occurred.
This is because of too many requests to BoxRec too quickly.
This package has not found a workaround at this time.
Please open a browser and login to BoxRec with this account and then resume.`);
        }

        throw e;
    }
}

/**
 * This acts as a middleware between the package and the requests to BoxRec
 * For example if we hit a 429 "Too Many Requests" we want to return a proper message to the callers
 */
export async function requestWrapper(url: string, cookies?: string, parametersOrQueryString?: RequestInit | any): Promise<string> {
    const response: Response = await requestWrapperFullResponse(url, cookies, parametersOrQueryString);
    return response.text();
}
