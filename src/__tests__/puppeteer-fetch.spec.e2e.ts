import * as FormData from "form-data";
import puppeteer from "puppeteer-extra";
import {puppeteerFetch} from "../puppeteer-fetch";
// tslint:disable-next-line:no-var-requires
const {hcaptcha} = require("puppeteer-hcaptcha");
// tslint:disable-next-line:no-var-requires
const solve = require("puppeteer-recaptcha-solver");

global.fetch = jest.fn();

jest.mock("puppeteer-extra-plugin-stealth", () => {
    return () => { /**/ };
});

jest.mock("puppeteer-hcaptcha");
jest.mock("puppeteer-recaptcha-solver");

describe("puppeteer-fetch", () => {

    let evaluateFn: jest.Mock;
    let fetchSpy: jest.Mock;
    let gotoFn: jest.Mock;
    let hcaptchaSpy: jest.Mock;
    let recaptchSpy: jest.Mock;
    let reloadFn: jest.Mock;
    let urlFn: jest.Mock;
    let userAgentFn: jest.Mock;

    beforeEach(() => {
        evaluateFn = jest.fn();
        gotoFn = jest.fn();
        hcaptchaSpy = jest.fn();
        recaptchSpy = jest.fn();
        reloadFn = jest.fn();
        urlFn = jest.fn();
        userAgentFn = jest.fn();
        jest.spyOn(puppeteer, "launch").mockImplementation(() => {
            return {
                close: () => { /**/ },
                pages: () => [{
                    cookies: () => "SESSID=123",
                    evaluate: evaluateFn,
                    goto: gotoFn,
                    reload: reloadFn,
                    setUserAgent: userAgentFn,
                    url: urlFn.mockResolvedValue(""),
                }],
            };
        });
        jest.spyOn(puppeteer, "use").mockImplementation(() => { /**/ });
        fetchSpy = jest.spyOn(global, "fetch").mockImplementation(() => {
            /**/
        });
        (global as any).document = {
            querySelector: () => {
                return { outerHTML: "" };
            }
        };
        hcaptcha.mockImplementation(hcaptchaSpy);
        solve.mockImplementation(recaptchSpy);
    });

    afterAll(() => {
        (global.fetch as any).mockClear();
    });

    it("should set a user agent", async () => {
        await puppeteerFetch("http://boxrec.com/en/schedule", "", "GET");

        expect(userAgentFn).toBeCalledWith( "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.125 Safari/537.36");
    });

    it("should make a GET request by loading the URL", async () => {
        await puppeteerFetch("http://boxrec.com/en/schedule", "", "GET", {
            foo: "bar",
        });
        await evaluateFn.mock.calls[0][0]();

        expect(gotoFn).toHaveBeenCalledWith("http://boxrec.com/en/schedule?foo=bar");
    });

    // it("should use 'credentials: include' in the fetch if cookies passed in", async () => {
    //     fetchSpy.mockImplementation(() => {
    //         return {
    //             then: () => { /**/ },
    //         };
    //     });
    //
    //     await puppeteerFetch("https://boxrec.com/en/quick_search", "SESSID=123", "POST", {
    //         foo: "bar"
    //     });
    //
    //     await evaluateFn.mock.calls[0][0]("https://boxrec.com/en/quick_search", "SESSID=123", { foo: "bar" });
    //
    //     expect(fetchSpy).toHaveBeenCalledWith("https://boxrec.com/en/quick_search", expect.objectContaining({
    //         credentials: "include"
    //     }));
    // });

    it("should be able to make a POST request through fetch", async () => {
        const formData = new FormData();
        formData.append("foo", "bar");

        fetchSpy.mockImplementation(() => {
           return {
               then: () => { /**/ },
           };
        });

        await puppeteerFetch("https://boxrec.com/en/login", undefined, "POST", {
            foo: "bar",
        });
        await evaluateFn.mock.calls[0][0]("https://boxrec.com/en/login", "SESSID=123", { foo: "bar" });

        expect(fetchSpy).toHaveBeenCalledWith("https://boxrec.com/en/login", expect.anything());
    });

    it("should return a JSON object if url is `location_search_ajax`", async () => {
        evaluateFn.mockReturnValueOnce(false)
        const jsonSpy = jest.spyOn(JSON, "parse");
        jest.spyOn(puppeteer, "launch").mockImplementation(() => {
            return {
                close: () => { /**/ },
                pages: () => [{
                    cookies: () => Promise.resolve("SESSID=123"),
                    evaluate: evaluateFn,
                    goto: gotoFn,
                    setUserAgent: userAgentFn,
                    url: urlFn.mockResolvedValue("http://boxrec.com/location_search_ajax"),
                }],
            };
        });
        (global as any).document = {
            querySelector: () => {
                return { innerText: "{\"foo\": \"bar\"}" };
            }
        };

        await puppeteerFetch("https://boxrec.com/en/location_search_ajax", "", "GET");
        await evaluateFn.mock.calls[1][0]();

        expect(jsonSpy).toHaveBeenCalled();
    });

    it("should proceed to bypass recaptcha if prompted for it", async () => {
        jest.spyOn(puppeteer, "launch").mockImplementation(() => {
            return {
                close: () => { /**/ },
                pages: () => [{
                    cookies: () => "SESSID=123",
                    evaluate: evaluateFn,
                    goto: gotoFn,
                    setUserAgent: userAgentFn,
                    url: urlFn.mockResolvedValue("http://boxrec.com/recaptcha"),
                }],
            };
        });

        await puppeteerFetch("http://boxrec.com/en/schedule", "", "GET", {
            foo: "bar",
        });

        expect(recaptchSpy).toHaveBeenCalled();
    });

    it("should proceed to do the GET call after a recaptcha", async() => {
        jest.spyOn(puppeteer, "launch").mockImplementation(() => {
            return {
                close: () => { /**/ },
                pages: () => [{
                    cookies: () => "SESSID=123",
                    evaluate: evaluateFn,
                    goto: gotoFn,
                    setUserAgent: userAgentFn,
                    url: urlFn.mockResolvedValue("http://boxrec.com/recaptcha"),
                }],
            };
        });

        await puppeteerFetch("http://boxrec.com/en/schedule", "", "GET", {
            foo: "bar",
        });

        expect(gotoFn).toHaveBeenCalledTimes(2);
    });

    it("should proceed to bypass hcaptcha (Cloudflare) if prompted for it", async () => {
        evaluateFn.mockReturnValue(true);

        await puppeteerFetch("http://boxrec.com/en/schedule", "", "GET", {
            foo: "bar",
        });

        expect(hcaptchaSpy).toHaveBeenCalled();
    });

    it("should proceed to the page after the hcaptcha (Cloudflare)", async () => {
        evaluateFn.mockReturnValue(true);

        await puppeteerFetch("http://boxrec.com/en/schedule", "", "GET", {
            foo: "bar",
        });

        expect(reloadFn).toHaveBeenCalled();
    });

});

// todo a bunch of tests to ensure browser.close() is called
