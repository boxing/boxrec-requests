import puppeteer from "puppeteer-extra";
// tslint:disable-next-line:typedef no-var-requires
const pluginStealth = require("puppeteer-extra-plugin-stealth");
// tslint:disable-next-line:typedef no-var-requires
const {hcaptcha} = require("puppeteer-hcaptcha");

import * as FormData from "form-data";
import {URLSearchParams} from "url";

export interface LoginResponse {
    body: string;
    cookies: Array<{ name: string, value: string}>;
}

async function puppeteerFetch<T = string>(url: string, cookies: string, method: "GET", bodyParams?: Record<string, unknown>): Promise<T>;
async function puppeteerFetch<T = LoginResponse>(url: "https://boxrec.com/en/login", cookies: string | undefined, method: "POST", bodyParams?: Record<string, unknown>): Promise<T>;
async function puppeteerFetch<T = string>(url: string, cookies: string | undefined, method: "POST" | "GET" = "GET", bodyParams?: Record<string, unknown>): Promise<T | LoginResponse> {
    puppeteer.use(pluginStealth());

    const browser: any = await puppeteer.launch({
        args: [
            `--window-size=600,1000`,
            "--window-position=000,000",
            "--disable-dev-shm-usage",
            "--no-sandbox",
            "--user-data-dir=\"/tmp/chromium\"",
            "--disable-web-security",
            "--disable-features=site-per-process",
            "--auto-open-devtools-for-tabs", // todo dev opens tools
        ],
        headless: false,
        ignoreHTTPSErrors: true,
    } as any);

    const [page] = await browser.pages();
    await page.goto("http://boxrec.com");

    // todo determine if hit Cloudflare
    // await hcaptcha(page, 10000);

    // todo this might be all we need for GET requests
    if (method === "GET") {
        const queryString: URLSearchParams = new URLSearchParams(bodyParams as any);
        const urlWithQueryString: string = `${url}?${queryString.toString()}`;

        await page.goto(urlWithQueryString);
        const html = await page.evaluate(() => document.querySelector("*")?.outerHTML);
        await browser.close();
        return html;
    }

    if (method === "POST") {
        const body = await page.evaluate((strippedUrlInside: string, bodyInside: Record<string, string>) => {
            const formData: FormData = new FormData();
            const arr: Array<[string, string]> = Object.entries(bodyInside);
            for (const i of arr) {
                formData.append(i[0], i[1]);
            }

            return fetch(strippedUrlInside, {
                body: formData as any,
                headers: {
                    "Access-Control-Expose-Headers": "Location",
                },
                method: "POST",
                mode: "cors"
            }).then(res => res.text());
        }, url, bodyParams);

        const cookiesFromPage: Array<{ name: string, value: string}> = await page.cookies();

        await browser.close();

        return {
            body,
            cookies: cookiesFromPage,
        };
    }

    // const queryString: URLSearchParams = new URLSearchParams(bodyParams as any);
    // const urlWithQueryString: string = `${url}?${queryString.toString()}`;
    //
    // return page.evaluate((strippedUrlInside: string, cookiesInside: string) => {
    //     return fetch(strippedUrlInside,
    //         {method: "GET", headers: {
    //                 cookie: cookiesInside || "",
    //
    //             }}).then(res => res.text());
    // }, urlWithQueryString, cookies);
}

export {
    puppeteerFetch
};
