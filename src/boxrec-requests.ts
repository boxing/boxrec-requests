import * as $ from "cheerio";
import {Cookie, CookieJar, RequestResponse} from "request";
import * as rp from "request-promise";
import {
    BoxrecLocationEventParams,
    BoxrecLocationsPeopleParams,
    BoxrecLocationsPeopleParamsTransformed,
    BoxrecRatingsParams,
    BoxrecResultsParams,
    BoxrecResultsParamsTransformed,
    BoxrecRole,
    BoxrecScheduleParams,
    BoxrecSearchParams,
    BoxrecSearchParamsTransformed,
    BoxrecStatus,
    BoxrecTitlesParams,
    BoxrecTitlesParamsTransformed,
    PersonRequestParams
} from "./boxrec-requests.constants";

// https://github.com/Microsoft/TypeScript/issues/14151
if (typeof (Symbol as any).asyncIterator === "undefined") {
    (Symbol as any).asyncIterator = Symbol.asyncIterator || Symbol("asyncIterator");
}

// used to hold the dynamic param on BoxRec to prevent multiple unnecessary requests
let searchParamWrap: string = "";
let resultsParamWrap: string = "";
let titlesParamWrap: string = "";
let ratingsParamWrap: string = "";
let numberOfFailedAttemptsAtProfileColumns: number = 0;

/**
 * Makes API requests to BoxRec and returns the HTML body
 */
class BoxrecRequests {

    /**
     * Makes a request to get Bout Information
     * @param jar           contains cookie information about the user
     * @param eventBoutId   includes both the event and bout separated by "/"
     */
    static async getBout(jar: CookieJar, eventBoutId: string): Promise<string> {
        return rp.get({
            jar,
            uri: `http://boxrec.com/en/event/${eventBoutId}`,
        });
    }

    /**
     * Makes a request to BoxRec to return/save the PDF version of a boxer profile
     * @param jar           contains cookie information about the user
     * @param {number} globalId     the BoxRec global id of the boxer
     * @param {string} pathToSaveTo directory to save to.  if not used will only return data
     * @param {string} fileName     file name to save as.  Will save as {globalId}.pdf as default.  Add .pdf to end of filename
     * @returns {Promise<string>}
     */
    static async getBoxerPDF(jar: CookieJar, globalId: number, pathToSaveTo?: string, fileName?: string): Promise<string> {
        return BoxrecRequests.getBoxerOther(jar, globalId, "pdf", pathToSaveTo, fileName);
    }

    /**
     * Makes a request to BoxRec to return/save the printable version of a boxer profile
     * @param jar           contains cookie information about the user
     * @param {number} globalId     the BoxRec global id of the boxer
     * @param {string} pathToSaveTo directory to save to.  if not used will only return data
     * @param {string} fileName     file name to save as.  Will save as {globalId}.html as default.  Add .html to end of filename
     * @returns {Promise<string>}
     */
    static async getBoxerPrint(jar: CookieJar, globalId: number, pathToSaveTo?: string, fileName?: string): Promise<string> {
        return BoxrecRequests.getBoxerOther(jar, globalId, "print", pathToSaveTo, fileName);
    }

    /**
     * Makes a request to BoxRec to return a list of current champions
     * @param jar           contains cookie information about the user
     * @returns {Promise<string>}
     */
    static async getChampions(jar: CookieJar): Promise<string> {
        return rp.get({
            jar,
            uri: "http://boxrec.com/en/champions",
        });
    }

    /**
     * Makes a request to BoxRec to get events/bouts on the particular date
     * @param jar                   contains cookie information about the user
     * @param {string} dateString   date to search for.  Format ex. `2012-06-07`
     * @returns {Promise<void>}
     */
    static async getDate(jar: CookieJar, dateString: string): Promise<string> {
        return rp.get({
            jar,
            qs: {
                date: dateString,
            },
            uri: `http://boxrec.com/en/date`,
        });
    }

    /**
     * Makes a request to BoxRec to retrieve an event by id
     * @param jar                   contains cookie information about the user
     * @param {number} eventId      the event id from BoxRec
     * @returns {Promise<string>}
     */
    static async getEventById(jar: CookieJar, eventId: number): Promise<string> {
        return rp.get({
            jar,
            uri: `http://boxrec.com/en/event/${eventId}`,
        });
    }

    /**
     * Makes a request to BoxRec to list events by location
     * @param jar                                   contains cookie information about the user
     * @param {BoxrecLocationEventParams} params    params included to get events by location
     * @param {number} offset                       the number of rows to offset the search
     * @returns {Promise<string>}
     */
    static async getEventsByLocation(jar: CookieJar, params: BoxrecLocationEventParams, offset: number = 0): Promise<string> {
        const qs: BoxrecLocationEventParams = {};

        for (const i in params) {
            if (params.hasOwnProperty(i)) {
                (qs as any)[`l[${i}]`] = (params as any)[i];
            }
        }

        qs.offset = offset;

        return rp.get({
            jar,
            qs,
            uri: `http://boxrec.com/en/locations/event`,
        });
    }

    /**
     * Make a request to BoxRec to search for people by location
     * @param jar                                   contains cookie information about the user
     * @param {BoxrecLocationsPeopleParams} params  params included to get people by location
     * @param {number} offset                       the number of rows to offset the search
     * @returns {Promise<string>}
     */
    static async getPeopleByLocation(jar: CookieJar, params: BoxrecLocationsPeopleParams, offset: number = 0): Promise<string> {
        const qs: BoxrecLocationsPeopleParamsTransformed = {};

        for (const i in params) {
            if (params.hasOwnProperty(i)) {
                (qs as any)[`l[${i}]`] = (params as any)[i];
            }
        }

        qs.offset = offset;

        return rp.get({
            jar,
            qs,
            uri: `http://boxrec.com/en/locations/people`,
        });
    }

    /**
     * Makes a search request to BoxRec to get all people that match that name
     * by using a generator, we're able to prevent making too many calls to BoxRec
     * @param jar                   contains cookie information about the user
     * @param {string} firstName            the person's first name
     * @param {string} lastName             the person's last name
     * @param {string} role                 the role of the person
     * @param {BoxrecStatus} status         whether the person is active in Boxing or not
     * @param {number} offset               the number of rows to offset the search
     * @yields {string}                     returns a generator to fetch the next person by ID
     */
    static async* getPeopleByName(jar: CookieJar, firstName: string, lastName: string, role: BoxrecRole = BoxrecRole.boxer, status: BoxrecStatus = BoxrecStatus.all, offset: number = 0): AsyncIterableIterator<string> {
        const params: BoxrecSearchParams = {
            first_name: firstName,
            last_name: lastName,
            role,
            status,
        };
        const searchResults: RequestResponse["body"] = await BoxrecRequests.search(jar, params, offset);

        for (const result of searchResults) {
            yield await BoxrecRequests.getPersonById(jar, result.id);
        }
    }

    /**
     * Make a request to BoxRec to get a person by their BoxRec Global ID
     * @param jar                               contains cookie information about the user
     * @param {number} globalId                 the BoxRec profile id
     * @param {BoxrecRole} role                 the role of the person in boxing (there seems to be multiple profiles for people if they fall under different roles)
     * @param {number} offset                   offset number of bouts/events in the profile.  Not used for boxers as boxer's profiles list all bouts they've been in
     * @returns {Promise<string>}
     */
    static async getPersonById(jar: CookieJar, globalId: number, role: BoxrecRole = BoxrecRole.boxer, offset: number = 0): Promise<string> {
        return BoxrecRequests.makeGetPersonByIdRequest(jar, globalId, role, offset);
    }

    /**
     * Makes a request to BoxRec to get a list of ratings/rankings, either P4P or by a single weight class
     * @param jar                               contains cookie information about the user
     * @param {BoxrecRatingsParams} params      params included to get ratings
     * @param {number} offset                   the number of rows to offset the search
     * @returns {Promise<string>}
     */
    static async getRatings(jar: CookieJar, params: BoxrecRatingsParams, offset: number = 0): Promise<string> {
        const qs: any = {};
        const paramWrap: string = await BoxrecRequests.getRatingsParamWrap(jar);

        for (const i in params) {
            if (params.hasOwnProperty(i)) {
                (qs as any)[`${paramWrap}[${i}]`] = (params as any)[i];
            }
        }

        qs.offset = offset;

        return rp.get({
            jar,
            qs,
            uri: "http://boxrec.com/en/ratings",
        });
    }

    /**
     * Makes a request to BoxRec to get a list of results.
     * Uses same class
     * @param jar                           contains cookie information about the user
     * @param {BoxrecResultsParams} params  params included to get results
     * @param {number} offset               the number of rows to offset this search
     * @returns {Promise<string>}
     */
    static async getResults(jar: CookieJar, params: BoxrecResultsParams, offset: number = 0): Promise<string> {
        const qs: BoxrecResultsParamsTransformed =
            await BoxrecRequests.buildResultsSchedulesParams<BoxrecResultsParamsTransformed>(jar, params, offset);

        return rp.get({
            jar,
            qs,
            uri: "http://boxrec.com/en/results",
        });
    }

    /**
     * Makes a request to BoxRec to get a list of scheduled events
     * @param jar                               contains cookie information about the user
     * @param {BoxrecScheduleParams} params     params included to get schedule
     * @param {number} offset                   the number of rows to offset the search
     * @returns {Promise<string>}
     */
    static async getSchedule(jar: CookieJar, params: BoxrecScheduleParams, offset: number = 0): Promise<string> {
        const qs: BoxrecResultsParamsTransformed =
            await BoxrecRequests.buildResultsSchedulesParams<BoxrecResultsParamsTransformed>(jar, params, offset);

        return rp.get({
            jar,
            qs,
            uri: "http://boxrec.com/en/schedule",
        });
    }

    /**
     * Makes a request to BoxRec to the specific title URL to get a belt's history
     * @param jar                   contains cookie information about the user
     * @param {string} titleString  in the format of "6/Middleweight" which would be the WBC Middleweight title
     * @param {number} offset       the number of rows to offset the search
     * @returns {Promise<string>}
     */
    static async getTitleById(jar: CookieJar, titleString: string, offset: number = 0): Promise<string> {
        return rp.get({
            jar,
            uri: `http://boxrec.com/en/title/${titleString}`,
        });
    }

    /**
     * Makes a request to BoxRec to get information on scheduled title fights
     * @param jar                   contains cookie information about the user
     * @param params
     * @param offset
     */
    static async getTitles(jar: CookieJar, params: BoxrecTitlesParams, offset: number = 0): Promise<any> {
        const qs: BoxrecTitlesParamsTransformed = {};
        const paramWrap: string = await BoxrecRequests.getTitlesParamWrap(jar);

        for (const i in params) {
            if (params.hasOwnProperty(i)) {
                (qs as any)[`${paramWrap}[${i}]`] = (params as any)[i];
            }
        }

        qs.offset = offset;

        return rp.get({
            jar,
            qs,
            uri: `http://boxrec.com/en/titles`,
        });
    }

    /**
     * Makes a request to BoxRec to get the information of a venue
     * @param jar               contains cookie information about the user
     * @param {number} venueId
     * @param {number} offset   the number of rows to offset the search
     * @returns {Promise<string>}
     */
    static async getVenueById(jar: CookieJar, venueId: number, offset: number = 0): Promise<string> {
        return rp.get({
            jar,
            qs: {
                offset,
            },
            uri: `http://boxrec.com/en/venue/${venueId}`,
        });
    }

    /**
     * Makes a request to BoxRec to log the user in
     * This is required before making any additional calls
     * The session cookie is stored inside this instance of the class
     * Note: credentials are sent over HTTP, BoxRec doesn't support HTTPS
     * @param {string} username     your BoxRec username
     * @param {string} password     your BoxRec password
     * @returns {Promise<void>}     If the response is undefined, you have successfully logged in.  Otherwise an error will be thrown
     */
    static async login(username: string, password: string): Promise<CookieJar> {
        let rawCookies: string[];
        const boxrecDomain: string = "http://boxrec.com";

        try {
            rawCookies = await BoxrecRequests.getSessionCookie() || [];
        } catch (e) {
            throw new Error("Could not get response from boxrec");
        }

        if (!rawCookies || !rawCookies[0]) {
            throw new Error("Could not get cookie from initial request to boxrec");
        }

        const cookie: Cookie | undefined = rp.cookie(rawCookies[0]);

        if (!cookie) {
            throw new Error("Could not get cookie");
        }

        const jar: CookieJar = rp.jar();
        jar.setCookie(cookie, boxrecDomain);

        const options: rp.Options = {
            followAllRedirects: true, // 302 redirect occurs
            formData: {
                "_password": password,
                "_remember_me": "on",
                "_target_path": boxrecDomain, // not required,
                "_username": username,
                "login[go]": "", // not required
            },
            jar,
            resolveWithFullResponse: true,
            url: "http://boxrec.com/en/login", // BoxRec does not support HTTPS
        };

        try {
            await rp.post(options)
                .then((data: RequestResponse) => {

                    let errorMessage: string = "";

                    // if the user hasn't given consent, the user is redirected to a user that contains `gdpr`
                    if (data.request.uri.pathname.includes("gdpr") || data.body.toLowerCase().includes("gdpr")) {
                        errorMessage = "GDPR consent is needed with this account.  Log into BoxRec through their website and accept before using this account";
                    }

                    // the following are when login has failed
                    // an unsuccessful login returns a 200, we'll look for phrases to determine the error
                    if (data.body.includes("your password is incorrect")) {
                        errorMessage = "Your password is incorrect";
                    }

                    if (data.body.includes("username does not exist")) {
                        errorMessage = "Username does not exist";
                    }

                    if (data.statusCode !== 200 || errorMessage !== "") {
                        throw new Error(errorMessage);
                    }

                });
        } catch (e) {
            throw new Error(e);
        }

        const requiredCookies: string[] = ["PHPSESSID", "REMEMBERME"];

        jar.getCookies(boxrecDomain)
            .forEach((cookieInsideJar: Cookie) => {
                const index: number = requiredCookies.findIndex((val: string) => val === cookieInsideJar.value);
                requiredCookies.splice(index);
            });

        // test to see if both cookies exist
        if (!requiredCookies.length) {
            return jar; // success
        } else {
            throw new Error("Cookie did not have PHPSESSID and REMEMBERME");
        }
    }

    /**
     * Makes a request to BoxRec to search people by
     * Note: currently only supports boxers
     * @param jar                           contains cookie information about the user
     * @param {BoxrecSearchParams} params   params included in this search
     * @param {number}             offset   the number of rows to offset the search
     * @returns {Promise<string>}
     */
    static async search(jar: CookieJar, params: BoxrecSearchParams, offset: number = 0): Promise<string> {
        if (!params.first_name && !params.last_name) {
            // BoxRec says 2 or more characters, it's actually 3 or more
            throw new Error("Requires `first_name` or `last_name` - minimum 3 characters long");
        }

        const qs: BoxrecSearchParamsTransformed = {};
        const searchParam: string = await BoxrecRequests.getSearchParamWrap(jar);

        for (const i in params) {
            if (params.hasOwnProperty(i)) {
                (qs as any)[`${searchParam}[${i}]`] = (params as any)[i];
            }
        }

        qs.offset = offset;

        return rp.get({
            jar,
            qs,
            uri: "http://boxrec.com/en/search",
        });
    }

    private static async buildResultsSchedulesParams<T>(jar: CookieJar, params: T, offset: number): Promise<T> {
        const qs: any = {};
        const searchParam: string = await BoxrecRequests.getResultsParamWrap(jar);

        for (const i in params) {
            if (params.hasOwnProperty(i)) {
                (qs as any)[`${searchParam}[${i}]`] = (params as any)[i];
            }
        }

        qs.offset = offset;

        return qs as T;
    }

    /**
     * Returns/saves a boxer's profile in print/pdf format
     * @param jar                           contains cookie information about the user
     * @param {number} globalId
     * @param {"pdf" | "print"} type
     * @param {string} pathToSaveTo
     * @param {string} fileName
     * @returns {Promise<string>}
     */
    private static async getBoxerOther(jar: CookieJar, globalId: number, type: "pdf" | "print", pathToSaveTo?: string, fileName?: string): Promise<string> {
        const qs: PersonRequestParams = {};

        if (type === "pdf") {
            qs.pdf = "y";
        } else {
            qs.print = "y";
        }

        return rp.get({
            followAllRedirects: true,
            jar,
            qs,
            uri: `http://boxrec.com/en/boxer/${globalId}`
        });
    }

    /**
     * Makes a request to BoxRec to get the search param prefix that is wrapped around params for the `results` page
     * @param jar
     */
    private static async getResultsParamWrap(jar: CookieJar): Promise<string> {
        if (resultsParamWrap === "") {
            // it would be nice to get this from any page but the Navbar search is a POST and not as predictable as the search box one on the search page
            const boxrecPageBody: RequestResponse["body"] = await rp.get({
                jar,
                uri: "http://boxrec.com/en/results",
            });

            resultsParamWrap = $(boxrecPageBody).find(".page form").attr("name");
        }

        return resultsParamWrap;
    }

    /**
     * Makes a request to BoxRec to find out the search param prefix that is wrapped around params
     * @param jar
     */
    private static async getSearchParamWrap(jar: CookieJar): Promise<string> {
        if (searchParamWrap === "") {
            // it would be nice to get this from any page but the Navbar search is a POST and not as predictable as the search box one on the search page
            const boxrecPageBody: RequestResponse["body"] = await rp.get({
                jar,
                uri: "http://boxrec.com/en/search",
            });

            searchParamWrap = $(boxrecPageBody).find("h2:contains('Find People')").parents("td").find("form").attr("name");
        }

        return searchParamWrap;
    }

    /**
     * Makes a request to get the PHPSESSID required to login
     * @returns {Promise<string[]>}
     */
    private static async getSessionCookie(): Promise<string[] | undefined> {
        const options: rp.Options = {
            resolveWithFullResponse: true,
            uri: "http://boxrec.com",
        };

        return rp.get(options).then((data: RequestResponse) => data.headers["set-cookie"]);
    }

    private static async getRatingsParamWrap(jar: CookieJar): Promise<string> {
        if (ratingsParamWrap === "") {
            const boxrecPageBody: RequestResponse["body"] = await rp.get({
                jar,
                uri: "http://boxrec.com/en/ratings",
            });

            ratingsParamWrap = $(boxrecPageBody).find(".page form").attr("name");
        }

        return ratingsParamWrap;
    }

    /**
     * Makes a request to BoxRec to get the titles param prefix that is wrapped around params for the `titles` page
     * @param jar
     */
    private static async getTitlesParamWrap(jar: CookieJar): Promise<string> {
        if (titlesParamWrap === "") {
            const boxrecPageBody: RequestResponse["body"] = await rp.get({
                jar,
                uri: "http://boxrec.com/en/titles",
            });

            titlesParamWrap = $(boxrecPageBody).find(".page form").attr("name");
        }

        return titlesParamWrap;
    }

    private static async makeGetPersonByIdRequest(jar: CookieJar, globalId: number, role: BoxrecRole = BoxrecRole.boxer, offset: number = 0, callWithToggleRatings: boolean = false): Promise<string> {
        const uri: string = `http://boxrec.com/en/${role}/${globalId}`;
        const qs: any = {
            offset,
        };

        if (callWithToggleRatings) {
            qs.toggleRatings = "y";
        }

        const boxrecPageBody: RequestResponse["body"] = await rp.get({
            jar,
            qs,
            resolveWithFullResponse: false,
            uri,
        });

        // to ensure we don't recursively call this method, by default we return the results
        let hasAllColumns: boolean = true;
        let numberOfColumnsExpecting: string = "unknown";
        let numberOfColumnsReceived: number = -1;

        // there are 9 roles on the BoxRec website
        // the differences are that the boxers have 2 more columns `last6` for each boxer
        // the judge and others don't have those columns
        // the doctor and others have `events`
        // manager is unique in that the table is a list of boxers that they manage
        switch (role) {
            case BoxrecRole.boxer:
                numberOfColumnsExpecting = "16";
                numberOfColumnsReceived = $(boxrecPageBody).find(`.dataTable tbody tr:nth-child(1) td`).length;
                hasAllColumns = numberOfColumnsReceived === parseInt(numberOfColumnsExpecting, 10);
                break;
            case BoxrecRole.judge:
            case BoxrecRole.supervisor:
            case BoxrecRole.referee:
                numberOfColumnsExpecting = "!16";
                numberOfColumnsReceived = $(boxrecPageBody).find("#listBoutsResults tbody tr:nth-child(1) td").length;
                hasAllColumns = numberOfColumnsReceived !== 16;
                break;
        }

        // this is not applicable to all roles
        // the roles that return and don't have `bouts` on their profile page will never hit this point
        if (hasAllColumns) {
            return boxrecPageBody;
        }

        numberOfFailedAttemptsAtProfileColumns++;

        // to prevent BoxRec getting spammed if the number of columns changed, we'll error out if we can't get the correct number
        if (numberOfFailedAttemptsAtProfileColumns > 1) {
            throw new Error(`Cannot find correct number of columns.  Expecting ${numberOfColumnsExpecting}, Received ${numberOfColumnsReceived}.  Please report this error with the profile id`);
        }

        // calls itself with the toggle for `toggleRatings=y`
        return this.makeGetPersonByIdRequest(jar, globalId, role, offset, true);
    }

}

export {
    BoxrecRequests,
};
