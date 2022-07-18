import puppeteer from "puppeteer-extra";
// @ts-ignore
import pluginStealth from "puppeteer-extra-plugin-stealth";

const stripBoxrecFromString: (str: string) => string = (str: string): string => {
    return str.replace(/https?:\/\/boxrec.com/, "");
};

export const puppeteerFetch = async (url: string, cookies?: string, parametersOrQueryString?: any) => {
    puppeteer.use(pluginStealth());

    const browser: any = await puppeteer.launch({
        args: [
            `--window-size=600,1000`,
            "--window-position=000,000",
            "--disable-dev-shm-usage",
            "--no-sandbox",
            "--user-data-dir=\"/tmp/chromium\"",
            "--disable-web-security",
            "--disable-features=site-per-process"
        ],
        headless: false,
        ignoreHTTPSErrors: true,
    } as any);

    const [page] = await browser.pages();
    await page.goto("http://boxrec.com");

    const strippedUrl: string = stripBoxrecFromString(url);

    if (parametersOrQueryString && parametersOrQueryString?.method === "POST") {
        return page.evaluate(() => {
            return fetch(strippedUrl,
                {headers: {
                        cookie: cookies || "",
                        method: "POST",
                    }});
        });
    } else {
        return page.evaluate(() => {
            return fetch(strippedUrl,
                {headers: {
                        cookie: cookies || "",
                        method: "GET",
                    }});
        });
    }
};
