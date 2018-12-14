import * as fs from "fs";
import { CookieJar, Response } from "request";
import * as rp from "request-promise";
import BoxrecRequests from "./boxrec-requests";
import { BoxrecRole, BoxrecStatus, WeightDivisionCapitalized } from "./boxrec-requests.constants";
import Mock = jest.Mock;
import SpyInstance = jest.SpyInstance;

export const boxRecMocksModulePath: string = "./node_modules/boxrec-mocks/pages/";

jest.mock("request-promise");

const mockProfileBoxerRJJ: string = fs.readFileSync(
    `${boxRecMocksModulePath}/profile/mockProfileBoxerRJJ.html`, "utf8");
const mockProfileJudgeDaveMoretti: string = fs.readFileSync(
    `${boxRecMocksModulePath}/profile/mockProfileJudgeDaveMoretti.html`, "utf8");
const mockSearchMayweather: string = fs.readFileSync(
    `${boxRecMocksModulePath}/search/mockSearchMayweather.html`, "utf8");
;

export const getLastCall: (spy: SpyInstance, type?: any) => any =
    (spy: SpyInstance, type: any = "uri") => spy.mock.calls[spy.mock.calls.length - 1][0][type];
const compareObjects: any = (obj: any, objToCompareTo: any) => expect(obj).toEqual(objToCompareTo);
const cookieJar: CookieJar = rp.jar({});
const cookieSpyValid: () => void = () => {
    jest.spyOn(rp, "cookie")
        .mockReturnValueOnce({value: "PHPSESSID"})
        .mockReturnValueOnce({value: "REMEMBERME"});
};

describe("class BoxrecRequests", () => {

    describe("method login", () => {

        afterAll(async () => {
            const spy: SpyInstance = jest.spyOn(rp, "jar");
            spy.mockReturnValueOnce({
                getCookies: () => [
                    {
                        key: "PHPSESSID",
                    },
                    {
                        key: "REMEMBERME",
                    }
                ],
                setCookie: () => {
                    //
                }
            });
            await BoxrecRequests.login("", "");
        });

        describe("getting PHPSESSID", () => {

            it("should make a GET request to http://boxrec.com to get the PHPSESSID", async () => {
                const spy: SpyInstance = jest.spyOn(rp, "get");
                spy.mockReturnValueOnce(Promise.resolve({headers: {"set-cookie": ["123"]}}));
                cookieSpyValid();
                await BoxrecRequests.login("", "");
                expect(spy.mock.calls[0][0].uri).toBe("http://boxrec.com");
            });

            it("should throw if it could not get the initial PHPSESSID", async () => {
                const spy: SpyInstance = jest.spyOn(rp, "get");
                spy.mockReturnValueOnce(Promise.resolve({headers: {"set-cookie": []}}));
                await expect(BoxrecRequests.login("", ""))
                    .rejects.toThrowError("Could not get cookie from initial request to boxrec");
            });

            it("should throw if the HTTP status code is an error code", async () => {
                const spy: SpyInstance = jest.spyOn(rp, "get");
                spy.mockReturnValueOnce(Promise.reject({headers: {"set-cookie": "works"}}));
                await expect(BoxrecRequests.login("", "")).rejects.toThrowError("Could not get response from boxrec");
            });

        });

        describe("logging in", () => {

            interface MiniReponse {
                request: any;
            }

            const emptyUriPathName: MiniReponse | Partial<Response> = {
                request: {
                    uri: {
                        pathname: "",
                    },
                },
            };

            // creates a spy with only 1 of 2 required keys and then sets the expect condition
            const cookieTest: any = async (key: "REMEMBERME" | "PHPSESSID"): Promise<any> => {
                const spy: SpyInstance = jest.spyOn(rp, "jar");
                spy.mockReturnValueOnce({
                    getCookies: () => [
                        {
                            key,
                        },
                    ],
                    setCookie: () => {
                        //
                    }
                });

                await expect(BoxrecRequests.login("", ""))
                    .rejects.toThrowError("Cookie did not have PHPSESSID and REMEMBERME");
            };

            it("should make a POST request to http://boxrec.com/en/login", async () => {
                cookieSpyValid();
                const spy: SpyInstance = jest.spyOn(rp, "post");
                await BoxrecRequests.login("", "");
                expect(spy.mock.calls[0][0].url).toBe("http://boxrec.com/en/login");
            });

            it("should throw if boxrec returns that the username does not exist", async () => {
                const spy: SpyInstance = jest.spyOn(rp, "post");
                spy.mockReturnValueOnce(Promise.resolve(Object.assign(
                    {body: "<div>username does not exist</div>"}
                    , emptyUriPathName))); // resolve because 200 response
                await expect(BoxrecRequests.login("", "")).rejects.toThrowError("Username does not exist");
            });

            it("should throw an error if GDPR consent has not been given to BoxRec", async () => {
                const spy: SpyInstance = jest.spyOn(rp, "post");
                spy.mockReturnValueOnce(Promise.resolve(Object.assign(
                    {body: "<div>GDPR</div>"}
                    , emptyUriPathName)));
                // tslint:disable-next-line
                const errorString: string = `GDPR consent is needed with this account.  Log into BoxRec through their website and accept before using this account`;
                await expect(BoxrecRequests.login("", "")).rejects.toThrowError(errorString);
            });

            it("should throw if boxrec returns that the password is not correct", async () => {
                const spy: SpyInstance = jest.spyOn(rp, "post");
                spy.mockReturnValueOnce(Promise.resolve(Object.assign(
                    {body: "<div>your password is incorrect</div>"}
                    , emptyUriPathName))); // resolve because 200 response
                await expect(BoxrecRequests.login("", "")).rejects.toThrowError("Your password is incorrect");
            });

            it("should return cookie if it was a success", async () => {
                cookieSpyValid();
                const response: CookieJar = await BoxrecRequests.login("", "");
                expect(response).toBeDefined();
            });

            it("should throw if after successfully logging in the cookie does not include PHPSESSID", async () => {
                await cookieTest("REMEMBERME");
            });

            it("should throw if after successfully logging in the cookie does not include REMEMBERME", async () => {
                await cookieTest("PHPSESSID");
            });

        });

    });

    describe("method search", () => { // these `search` method tests should be before the other methods that may call it

        beforeAll(() => {
            Object.defineProperty(BoxrecRequests, "searchParamWrap", {
                configurable: true,
                get: jest.fn(() => "abc"),
            });
        });

        it("shouldn't make multiple unnecessary requests to BoxRec to get the search parameter", async () => {
            const spy: Mock<any> = jest.spyOn(rp, "get").mockReturnValue(mockSearchMayweather);
            // current number of API requests
            const numberOfRequests: number = spy.mock.calls.length;

            // should make 2 requests
            await BoxrecRequests.search(cookieJar, {
                first_name: "bla",
                last_name: "",
                role: BoxrecRole.boxer,
                status: BoxrecStatus.all,
            });
            // should make 1 request
            await BoxrecRequests.search(cookieJar, {
                first_name: "bla",
                last_name: "",
                role: BoxrecRole.boxer,
                status: BoxrecStatus.all,
            });

            // the first `search` request will make 2 calls, one to get the search param and the second to make the actual search
            // calling `search` again will only do the latter request to make the actual search, because the search param has already been set
            // if this fails it means the search wrap param is not properly being set and is making the request every time
            // if numberOfRequests < 3, it means the `search request has already been made possibly due to test shuffling
            // if numberOfRequests > 3, it means that additional requests are being made and this should be resolved immediately
            expect(numberOfRequests + 3 === spy.mock.calls.length).toBe(true);
        });

        it("should make a GET request to http://boxrec.com/en/search", async () => {
            const spy: SpyInstance = jest.spyOn(rp, "get");
            await BoxrecRequests.search(cookieJar, {
                first_name: "bla",
                last_name: "",
                role: BoxrecRole.judge,
                status: BoxrecStatus.all,
            });

            expect(getLastCall(spy)).toBe("http://boxrec.com/en/search");
        });

        it("should not send any keys that aren't wrapped in []", async () => {
            const spy: SpyInstance = jest.spyOn(rp, "get");
            await BoxrecRequests.search(cookieJar, {
                first_name: "bla",
                last_name: "",
                role: BoxrecRole.boxer,
                status: BoxrecStatus.all,
            });
            expect(getLastCall(spy, "qs").first_name).not.toBeDefined();
        });

    });

    describe("method getRatings", () => {

        it("should make a GET request to http://boxrec.com/en/ratings", async () => {
            const spy: SpyInstance = jest.spyOn(rp, "get");
            await BoxrecRequests.getRatings(cookieJar, {});
            expect(getLastCall(spy)).toBe("http://boxrec.com/en/ratings");
        });

        it("should clone any keys in the object and wrap with `r[]`", async () => {
            const spy: SpyInstance = jest.spyOn(rp, "get");
            await BoxrecRequests.getRatings(cookieJar, {
                division: "bar",
            }, 0);
            expect(getLastCall(spy, "qs")).toEqual({"offset": 0, "r[division]": "bar"});
        });

    });

    describe("method getDate", () => {

        it("should make a GET request to http://boxrec.com/en/date", async () => {
            const spy: SpyInstance = jest.spyOn(rp, "get");
            await BoxrecRequests.getDate(cookieJar, "2018-05-05");
            expect(getLastCall(spy)).toBe("http://boxrec.com/en/date");
        });

    });

    describe("method getPersonById", () => {

        it("should make a GET request to http://boxrec.com/en/boxer/{globalId}", async () => {
            const spy: SpyInstance = jest.spyOn(rp, "get");
            spy.mockReturnValueOnce(Promise.resolve(mockProfileBoxerRJJ));
            await BoxrecRequests.getPersonById(cookieJar, 555);
            expect(getLastCall(spy)).toBe("http://boxrec.com/en/boxer/555");
        });

        it("should make a GET request to a `judge` endpoint if the role is provided", async () => {
            const spy: SpyInstance = jest.spyOn(rp, "get");
            spy.mockReturnValueOnce(Promise.resolve(mockProfileJudgeDaveMoretti));
            await BoxrecRequests.getPersonById(cookieJar, 1, BoxrecRole.judge);
            expect(getLastCall(spy)).toBe("http://boxrec.com/en/judge/1");
        });

        it("supplying an `offset` value will append this to the URL", async () => {
            const spy: SpyInstance = jest.spyOn(rp, "get");
            spy.mockReturnValueOnce(Promise.resolve(mockProfileJudgeDaveMoretti));
            await BoxrecRequests.getPersonById(cookieJar, 1, BoxrecRole.judge, 20);
            expect(getLastCall(spy, "qs")).toEqual({
                offset: 20,
            });
        });

    });

    describe("method getEventById", () => {

        it("should make a GET request to http://boxrec.com/en/event/${eventId}", async () => {
            const spy: SpyInstance = jest.spyOn(rp, "get");
            await BoxrecRequests.getEventById(cookieJar, 555);
            expect(getLastCall(spy)).toBe("http://boxrec.com/en/event/555");
        });

    });

    describe("method getBout", () => {

        it("should make a GET request to http://boxrec.com/en/event (with bout)", async () => {
            const spy: SpyInstance = jest.spyOn(rp, "get");
            await BoxrecRequests.getBout(cookieJar, "771321/2257534");
            expect(getLastCall(spy)).toBe("http://boxrec.com/en/event/771321/2257534");
        });

    });

    describe("method getPeopleByName", () => {

        it("should return a generator of boxers it found", async () => {
            const searchResults: AsyncIterableIterator<string> =
                await BoxrecRequests.getPeopleByName(cookieJar, "test", "test");
            expect(searchResults.next()).toBeDefined();
        });

        it("should make a call to boxrec every time the generator next method is called", async () => {
            const spy: SpyInstance = jest.spyOn(rp, "get");
            spy.mockReturnValue(Promise.resolve(mockProfileBoxerRJJ));
            const getSpy: SpyInstance = jest.spyOn(BoxrecRequests, "getPersonById");
            jest.spyOn(BoxrecRequests, "search").mockReturnValueOnce([{id: 999}, {id: 888}]);
            const searchResults: AsyncIterableIterator<string> =
                await BoxrecRequests.getPeopleByName(cookieJar, "test", "test");
            expect(getSpy).toHaveBeenCalledTimes(0);
            await searchResults.next(); // makes an API call
            expect(getSpy).toHaveBeenCalledTimes(1);
            await searchResults.next(); // makes an API call
            expect(getSpy).toHaveBeenCalledTimes(2);
        });

    });

    describe("method getResults", () => {

        it("should make a GET request to http://boxrec.com/en/results", async () => {
            const spy: SpyInstance = jest.spyOn(rp, "get");
            await BoxrecRequests.getResults(cookieJar, {});
            expect(getLastCall(spy)).toBe("http://boxrec.com/en/results");
        });

    });

    describe("method getSchedule", () => {

        it("should make a GET request to http://boxrec.com/en/schedule", async () => {
            const spy: SpyInstance = jest.spyOn(rp, "get");
            await BoxrecRequests.getSchedule(cookieJar, {});
            expect(getLastCall(spy)).toBe("http://boxrec.com/en/schedule");
        });

    });

    describe("method getPeopleByLocation", () => {

        it("should make a GET request to http://boxrec.com/en/locations/people", async () => {
            const spy: SpyInstance = jest.spyOn(rp, "get");
            await BoxrecRequests.getPeopleByLocation(cookieJar, {
                role: BoxrecRole.boxer,
            });
            expect(getLastCall(spy)).toBe("http://boxrec.com/en/locations/people");
        });

    });

    describe("method getEventsByLocation", () => {

        it("should make a GET request to http://boxrec.com/en/locations/event", async () => {
            const spy: SpyInstance = jest.spyOn(rp, "get");
            await BoxrecRequests.getEventsByLocation(cookieJar, {});
            expect(getLastCall(spy)).toBe("http://boxrec.com/en/locations/event");
        });

    });

    describe("method getTitleById", () => {

        it("should make a GET request to http://boxrec.cox/en/title/${title}", async () => {
            const spy: SpyInstance = jest.spyOn(rp, "get");
            await BoxrecRequests.getTitleById(cookieJar, "6/Middleweight");
            expect(getLastCall(spy)).toBe("http://boxrec.com/en/title/6/Middleweight");
        });

    });

    describe("method getVenueById", () => {

        it("should make a GET request to http://boxrec.com/en/venue/555", async () => {
            const spy: SpyInstance = jest.spyOn(rp, "get");
            await BoxrecRequests.getVenueById(cookieJar, 555);
            expect(getLastCall(spy)).toBe("http://boxrec.com/en/venue/555");
        });

    });

    describe("method getChampions", () => {

        it("should make a GET request to http://boxrec.com/en/champions", async () => {
            const spy: SpyInstance = jest.spyOn(rp, "get");
            await BoxrecRequests.getChampions(cookieJar);
            expect(getLastCall(spy)).toBe("http://boxrec.com/en/champions");
        });

    });

    describe("method getBoxerPDF", () => {

        let spy: Mock<any>;

        beforeEach(() => {
            spy = jest.spyOn(rp, "get").mockReturnValueOnce({
                pipe: () => {/**/
                },
            });
        });

        it("should make a GET request with query string that contains `pdf`", async () => {
            await BoxrecRequests.getBoxerPDF(cookieJar, 555);
            compareObjects(spy.mock.calls[spy.mock.calls.length - 1][0].qs, {
                pdf: "y",
            });
        });

        it("should not save to the directory it is called from if no path supplied", async () => {
            const spyStream: Mock<any> = jest.spyOn(fs, "createWriteStream").mockReturnValueOnce("test2");
            await BoxrecRequests.getBoxerPDF(cookieJar, 555);
            return expect(spyStream).not.toHaveBeenCalled();
        });

    });

    describe("method getBoxerPrint", () => {

        let spy: Mock<any>;

        beforeEach(() => {
            spy = jest.spyOn(rp, "get").mockReturnValueOnce({
                pipe: () => {
                    //
                },
            });
        });

        it("should make a GET request with query string that contains `print`", async () => {
            await BoxrecRequests.getBoxerPrint(cookieJar, 555);
            compareObjects(spy.mock.calls[spy.mock.calls.length - 1][0].qs, {
                print: "y",
            });
        });

    });

    describe("method getTitles", () => {

        it("should wrap passed in parameters with `WcX`", async () => {
            const spy: SpyInstance = jest.spyOn(rp, "get");
            await BoxrecRequests.getTitles(cookieJar, {
                bout_title: 72,
                division: WeightDivisionCapitalized.superMiddleweight,
            });
            expect(getLastCall(spy, "qs")).toEqual({
                "WcX[bout_title]": 72,
                "WcX[division]": WeightDivisionCapitalized.superMiddleweight,
                "offset": 0,
            });
        });

    });

});
