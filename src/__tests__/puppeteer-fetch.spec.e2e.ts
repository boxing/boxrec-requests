import * as FormData from "form-data";
import puppeteer from "puppeteer-extra";
import {puppeteerFetch} from "../puppeteer-fetch";

global.fetch = jest.fn();

jest.mock("puppeteer-extra-plugin-stealth", () => {
    return () => { /**/ };
});

describe("puppeteer-fetch", () => {

    let evaluateFn: jest.Mock;
    let fetchSpy: jest.Mock;
    let gotoFn: jest.Mock;
    let urlFn: jest.Mock;
    let userAgentFn: jest.Mock;

    beforeEach(() => {
        evaluateFn = jest.fn();
        gotoFn = jest.fn();
        urlFn = jest.fn();
        userAgentFn = jest.fn();
        jest.spyOn(puppeteer, "launch").mockImplementation(() => {
            return {
                close: () => { /**/ },
                pages: () => [{
                    cookies: () => "SESSID=123",
                    evaluate: evaluateFn,
                    goto: gotoFn,
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

    // todo recaptcha test
    it("should proceed to bypass recaptcha if prompted for it", () => {

    });

    // todo recaptcha test
    it("should proceed to do the GET call after a recaptcha", () => {

    });

    it("should use 'credentials: include' in the fetch if cookies passed in", async () => {
        fetchSpy.mockImplementation(() => {
            return {
                then: () => { /**/ },
            };
        });

        await puppeteerFetch("https://boxrec.com/en/quick_search", "SESSID=123", "POST", {
            foo: "bar"
        });

        await evaluateFn.mock.calls[0][0]("https://boxrec.com/en/quick_search", "SESSID=123", { foo: "bar" });

        expect(fetchSpy).toHaveBeenCalledWith("https://boxrec.com/en/quick_search", expect.objectContaining({
            credentials: "include"
        }));
    });

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

});
