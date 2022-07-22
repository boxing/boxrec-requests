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
async function puppeteerFetch<T = string>(url: "https://boxrec.com/en/quick_search", cookies: string, method: "GET"): Promise<T>;
async function puppeteerFetch<T = string>(url: "https://boxrec.com/en/quick_search", cookies: string, method: "POST", bodyParams?: Record<string, unknown>): Promise<T>;
async function puppeteerFetch<T = LoginResponse>(url: "https://boxrec.com/en/login", cookies: undefined, method: "POST", bodyParams?: Record<string, unknown>): Promise<T>;
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
            // "--auto-open-devtools-for-tabs", // todo dev opens tools
        ],
        headless: false,
        ignoreHTTPSErrors: true,
    } as any);

    const [page] = await browser.pages();

    // user agent helps to get around cloudflare when in headless mode
    // this may need to be dynamic though
    await page.setUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.125 Safari/537.36"
    );

    // todo determine if hit Cloudflare
    // await hcaptcha(page, 10000);
    // await page.goto("http://boxrec.com");

    // todo this might be all we need for GET requests
    if (method === "GET") {
        const queryParams: URLSearchParams = new URLSearchParams(bodyParams as any);
        const queryString = queryParams.toString();
        const urlWithQueryString: string = `${url}${queryString ? `?${queryString.toString()}` : ""}`;

        await page.goto(urlWithQueryString);

        const resolvedUrlAfterPageChange = await page.url();

        if (resolvedUrlAfterPageChange.includes("/recaptcha")) {
            // todo get inside iframe
            await page.click("span[role=\"checkbox\"]");
            await page.click("input[type=\"submit\"]");

            await page.url();
        } else {
            const html = await page.evaluate(() => document.querySelector("*")?.outerHTML);
            await browser.close();
            return html;
        }

        // recaptcha triggered, to do bypass it
        throw new Error("Hit recaptcha");
    }


    page.on('console', async (msg) => {
        const msgArgs = msg.args();
        for (let i = 0; i < msgArgs.length; ++i) {
            console.log(await msgArgs[i].jsonValue());
        }
    });


    // POST requests
    await page.goto("http://localhost:3000");

    const testCookie = "works?"


    const body = await page.evaluate((urlInside: string, cookiesInside: string | undefined, bodyInside: Record<string, string>) => {
        const formData: FormData = new FormData();
        const arr: Array<[string, string]> = Object.entries(bodyInside);
        for (const [cookieName, val] of arr) {
            formData.append(cookieName, val);
        }

        const baseOptions: RequestInit = {
            body: formData as any,
            method: "POST",
            credentials: "include",
            // mode: "cors" // todo needed?
            headers: { // todo not sure if needed
                cookies: cookiesInside,
            }
        };

        if (cookiesInside) {
            baseOptions.credentials = "include";
        }

        return fetch(urlInside, baseOptions).then(res => res.text());
    }, "http://localhost:3000", testCookie, bodyParams);

    if (url === "https://boxrec.com/en/quick_search")  {
        await browser.close();
        return body;
    }

    const cookiesFromPage: Array<{ name: string, value: string}> = await page.cookies();
    await browser.close();

    return {
        body,
        cookies: cookiesFromPage,
    };
}

export {
    puppeteerFetch
};
