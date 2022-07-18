import puppeteer from "puppeteer-extra";
import {puppeteerFetch} from "../puppeteer-fetch";

global.fetch = jest.fn();

jest.mock("puppeteer-extra-plugin-stealth", () => {
    return { default: () => {

        }
    };
});

describe("puppeteer-fetch", () => {

    let evaluateFn: jest.Mock;
    let fetchSpy: jest.Mock;

    beforeEach(() => {
        evaluateFn = jest.fn();
        jest.spyOn(puppeteer, "launch").mockImplementation(() => {
            return {
                pages: () => [{
                    evaluate: evaluateFn,
                    goto: () => { /**/ },
                }],
            };
        });
        fetchSpy = jest.spyOn(global, "fetch").mockImplementation(() => {
            /**/
        });
    });

    afterAll(() => {
        (global.fetch as any).mockClear();
    });

    it("should strip boxrec.com out of the url", async () => {
        await puppeteerFetch("http://boxrec.com/en/schedule");
        await evaluateFn.mock.calls[0][0]();

        expect(fetchSpy).toHaveBeenCalledWith("/en/schedule", expect.anything());
    });

    it("should pass cookies in the header", async () => {
        await puppeteerFetch("http://boxrec.com/en/schedule", "SESSID=123");
        await evaluateFn.mock.calls[0][0]();

        expect(fetchSpy).toHaveBeenCalledWith("/en/schedule", expect.objectContaining({
            headers: {
                cookie: "SESSID=123",
                method: "GET"
            }
        }));
    });

    it("should be able to make a POST request", async () => {
        await puppeteerFetch("https://boxrec.com/en/login", "SESSID=123", {
            method: "POST",
        });
        await evaluateFn.mock.calls[0][0]();

        expect(fetchSpy).toHaveBeenCalledWith("/en/login", expect.objectContaining({
            headers: {
                cookie: "SESSID=123",
                method: "POST"
            }
        }));
    });

});
