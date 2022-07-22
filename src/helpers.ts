import * as $ from "cheerio";
import fetch, {RequestInit, Response} from "node-fetch";
import { URLSearchParams } from "url";
import {BoxrecRequests} from "./boxrec-requests";
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

function sleep(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

const convertPuppeteerCookieToString = (puppeteerCookies: Array<Record<string, string>>): string => {
    return puppeteerCookies.reduce((acc, cur) => {
        const expires = `Sat, 08-Apr-2023 13:16:43 GMT`;
        return acc + `${cur.name}=${cur.value}; expires=${expires}; Max-Age=31536000; path=/; HttpOnly, `;
    }, "");
};

export async function requestWrapperFullResponse(url: string, cookies?: string, parametersOrQueryString?: any): Promise<Response> {
    try {
        if (parametersOrQueryString && parametersOrQueryString?.method === "POST") {
            console.log("make request", url, cookies);
            await sleep(2000);
            const postResponse: Response = await fetch(url, {
                ...parametersOrQueryString,
                headers: {
                    ...parametersOrQueryString.headers,
                    Cookie: cookies || "",
                },
            });

            const t = await postResponse.text();

            if (t.includes("Cloudflare")) {
                const cfCookies = await BoxrecRequests.solveCaptcha();
                const cookieStr = convertPuppeteerCookieToString(cfCookies);
                console.log("solved!", cookieStr);
                const u = await requestWrapperFullResponse(url, cookieStr, parametersOrQueryString);
                console.log("responded!");

                console.log(u);

                return u;
            }

            return postResponse;
        }

        const queryString: URLSearchParams = new URLSearchParams(parametersOrQueryString);
        const urlWithQueryString: string = `${url}?${queryString.toString()}`;

        // todo check this for hcaptcha as well
        const getResponse: Response = await fetch(urlWithQueryString, {
            headers: {
                Cookie: cookies || "",
            },
        });

        return getResponse;
    } catch (e) {
        // todo might be time to remove this as now BoxRec uses Cloudflare and they use hcaptcha
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
