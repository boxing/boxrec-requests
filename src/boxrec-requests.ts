import * as cheerio from "cheerio";
import {Cookie, CookieJar, RequestResponse, Response} from "request";
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
import {getRoleOfHTML, requestWrapper} from "./helpers";

// used to hold the dynamic param on BoxRec to prevent multiple unnecessary requests
// todo these should all be time based or on failure update these values.
// todo A node process not restarted will start getting failures
let searchParamWrap: string = "";
let resultsParamWrap: string = "";
let titlesParamWrap: string = "";
let ratingsParamWrap: string = "";
let quickSearchParamWrap: string = "";

const createParamsObject: (params: object, prefix: string) => object = (params: object, prefix: string) => {
    const qs: object = {};
    for (const i in params) {
        if (params.hasOwnProperty(i)) {
            (qs as any)[`${prefix}[${i}]`] = (params as any)[i];
        }
    }
    return qs;
};

/**
 * Makes API requests to BoxRec and returns the HTML body
 */
export class BoxrecRequests {

    /**
     * Makes a request to get Bout Information
     * @param jar           contains cookie information about the user
     * @param eventBoutId   includes both the event and bout separated by "/"
     */
    static async getBout(jar: CookieJar, eventBoutId: string): Promise<string> {
        return requestWrapper<string>({
            jar,
            method: "GET",
            url: `https://boxrec.com/en/event/${eventBoutId}`,
        });
    }

    /**
     * Makes a request to BoxRec to return/save the PDF version of a boxer profile
     * @param jar           contains cookie information about the user
     * @param globalId     the BoxRec global id of the boxer
     * @param pathToSaveTo directory to save to.  if not used will only return data
     * @param fileName     file name to save as.  Will save as {globalId}.pdf as default.  Add .pdf to end of filename
     * @returns {Promise<string>}
     */
    static async getBoxerPDF(jar: CookieJar, globalId: number, pathToSaveTo?: string, fileName?: string):
        Promise<string> {
        return BoxrecRequests.getBoxerOther(jar, globalId, "pdf", pathToSaveTo, fileName);
    }

    /**
     * Makes a request to BoxRec to return/save the printable version of a boxer profile
     * @param jar           contains cookie information about the user
     * @param globalId     the BoxRec global id of the boxer
     * @param pathToSaveTo directory to save to.  if not used will only return data
     * @param fileName     file name to save as.  Will save as {globalId}.html as default.  Add .html to end of filename
     * @returns {Promise<string>}
     */
    static async getBoxerPrint(jar: CookieJar, globalId: number, pathToSaveTo?: string, fileName?: string):
        Promise<string> {
        return BoxrecRequests.getBoxerOther(jar, globalId, "print", pathToSaveTo, fileName);
    }

    /**
     * Makes a request to BoxRec to return a list of current champions
     * @param jar           contains cookie information about the user
     * @returns {Promise<string>}
     */
    static async getChampions(jar: CookieJar): Promise<string> {
        return requestWrapper<string>({
            jar,
            method: "GET",
            url: "https://boxrec.com/en/champions",
        });
    }

    /**
     * Makes a request to BoxRec to get events/bouts on the particular date
     * @param jar                   contains cookie information about the user
     * @param {string} dateString   date to search for.  Format ex. `2012-06-07`
     * @returns {Promise<void>}
     */
    static async getDate(jar: CookieJar, dateString: string): Promise<string> {
        return requestWrapper<string>({
            jar,
            method: "GET",
            qs: {
                date: dateString,
            },
            url: `https://boxrec.com/en/date`,
        });
    }

    /**
     * Makes a request to BoxRec to retrieve an event by id
     * @param jar                   contains cookie information about the user
     * @param {number} eventId      the event id from BoxRec
     * @returns {Promise<string>}
     */
    static async getEventById(jar: CookieJar, eventId: number): Promise<string> {
        return requestWrapper<string>({
            jar,
            method: "GET",
            url: `https://boxrec.com/en/event/${eventId}`,
        });
    }

    /**
     * Makes a request to BoxRec to list events by sport/location
     * @param jar                                   contains cookie information about the user
     * @param {BoxrecLocationEventParams} params    params included to get events by location
     * @param {number} offset                       the number of rows to offset the search
     * @returns {Promise<string>}
     */
    static async getEvents(jar: CookieJar, params: BoxrecLocationEventParams, offset: number = 0): Promise<string> {
        return BoxrecRequests.getEventsByLocation(jar, params, offset);
    }

    /**
     * Makes a request to BoxRec to list events by sport/location
     * @deprecated              This method is now more than location, and is also by sport (use `getPeople`)
     * @param jar                                   contains cookie information about the user
     * @param {BoxrecLocationEventParams} params    params included to get events by location
     * @param {number} offset                       the number of rows to offset the search
     * @returns {Promise<string>}
     */
    static async getEventsByLocation(jar: CookieJar, params: BoxrecLocationEventParams, offset: number = 0):
        Promise<string> {
        const qs: Partial<BoxrecLocationEventParams> = createParamsObject(params, "l");
        qs.offset = offset;

        return requestWrapper<string>({
            jar,
            method: "GET",
            qs,
            url: `https://boxrec.com/en/locations/event`,
        });
    }

    /**
     * Make a request to BoxRec to search for people by location/role
     * @param jar                                   contains cookie information about the user
     * @param {BoxrecLocationsPeopleParams} params  params included to get people by location/role
     * @param {number} offset                       the number of rows to offset the search
     * @returns {Promise<string>}
     */
    static async getPeople(jar: CookieJar, params: BoxrecLocationsPeopleParams, offset: number = 0): Promise<string> {
        return BoxrecRequests.getPeopleByLocation(jar, params, offset);
    }

    /**
     * Make a request to BoxRec to search for people by location/role
     * @deprecated              This method is now more than location, and is also by sport (use `getPeople`)
     * @param jar                                   contains cookie information about the user
     * @param {BoxrecLocationsPeopleParams} params  params included to get people by location
     * @param {number} offset                       the number of rows to offset the search
     * @returns {Promise<string>}
     */
    static async getPeopleByLocation(jar: CookieJar, params: BoxrecLocationsPeopleParams, offset: number = 0):
        Promise<string> {
        const qs: BoxrecLocationsPeopleParamsTransformed = createParamsObject(params, "l");
        qs.offset = offset;

        return requestWrapper<string>({
            jar,
            method: "GET",
            qs,
            url: `https://boxrec.com/en/locations/people`,
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
    static async getPeopleByName(jar: CookieJar, firstName: string, lastName: string,
                                 role: BoxrecRole | "" | "fighters" = "", status: BoxrecStatus = BoxrecStatus.all,
                                 offset: number = 0): Promise<string> {
        const params: BoxrecSearchParams = {
            first_name: firstName,
            last_name: lastName,
            role,
            status,
        };

        return BoxrecRequests.search(jar, params, offset);
    }

    /**
     * Make a request to BoxRec to get a person by their BoxRec Global ID
     * @param jar                               contains cookie information about the user
     * @param {number} globalId                 the BoxRec profile id
     * @param {BoxrecRole} role                 the role of the person in boxing (there are multiple profiles for people if they fall under different roles)
     * @param {number} offset                   offset number of bouts/events in the profile.  todo boxer support?
     * @returns {Promise<string>}
     */
    static async getPersonById(jar: CookieJar, globalId: number, role: BoxrecRole | null = null, offset: number = 0):
        Promise<string> {
        if (role !== null) {
            return BoxrecRequests.makeGetPersonByIdRequest(jar, globalId, role, offset, null);
        }

        // if role is null we need to get the default profile, we `quick_search` it which will give us the default
        return BoxrecRequests.quickSearch(jar, globalId);
    }

    /**
     * Makes a request to BoxRec to get a list of ratings/rankings, either P4P or by a single weight class
     * @param jar                               contains cookie information about the user
     * @param {BoxrecRatingsParams} params      params included to get ratings
     * @param {number} offset                   the number of rows to offset the search
     * @returns {Promise<string>}
     */
    static async getRatings(jar: CookieJar, params: BoxrecRatingsParams, offset: number = 0): Promise<string> {
        const paramWrap: string = await BoxrecRequests.getRatingsParamWrap(jar);
        const qs: any = createParamsObject(params, paramWrap);
        qs.offset = offset;

        return requestWrapper<string>({
            jar,
            method: "GET",
            qs,
            url: "https://boxrec.com/en/ratings",
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

        return requestWrapper<string>({
            jar,
            method: "GET",
            qs,
            url: "https://boxrec.com/en/results",
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

        return requestWrapper<string>({
            jar,
            method: "GET",
            qs,
            url: "https://boxrec.com/en/schedule",
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
        return requestWrapper<string>({
            jar,
            method: "GET",
            url: `https://boxrec.com/en/title/${titleString}`,
        });
    }

    /**
     * Makes a request to BoxRec to get information on scheduled title fights
     * @param jar                   contains cookie information about the user
     * @param params
     * @param offset
     */
    static async getTitles(jar: CookieJar, params: BoxrecTitlesParams, offset: number = 0): Promise<string> {
        const paramWrap: string = await BoxrecRequests.getTitlesParamWrap(jar);
        const qs: BoxrecTitlesParamsTransformed = createParamsObject(params, paramWrap);
        qs.offset = offset;

        return requestWrapper<string>({
            jar,
            method: "GET",
            qs,
            url: `https://boxrec.com/en/titles`,
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
        return requestWrapper<string>({
            jar,
            method: "GET",
            qs: {
                offset,
            },
            url: `https://boxrec.com/en/venue/${venueId}`,
        });
    }

    /**
     * Lists the boxers that the user is watching
     * @param {request.CookieJar} jar
     * @returns {Promise<string>}
     */
    static async getWatched(jar: CookieJar): Promise<string> {
        return requestWrapper<string>({
            followAllRedirects: true,
            jar,
            method: "GET",
            url: "https://boxrec.com/en/watchlist",
        });
    }

    /**
     * Makes a request to BoxRec to log the user in
     * This is required before making any additional calls
     * The session cookie is stored inside this instance of the class
     * @param {string} username     your BoxRec username
     * @param {string} password     your BoxRec password
     * @returns     If the response is undefined, you have successfully logged in.  Otherwise an error will be thrown
     */
    static async login(username: string, password: string): Promise<CookieJar> {
        // check for undefined args, if undefined will throw weird error.  Therefore we check and throw proper error
        // https://github.com/form-data/form-data/issues/336#issuecomment-301116262
        if (username === undefined || password === undefined) {
            throw new Error(`missing parameter: ${username === undefined ? "username" : "password"}`);
        }

        const boxrecDomain: string = "https://boxrec.com";
        const jar: CookieJar = rp.jar();

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
            method: "POST",
            resolveWithFullResponse: true,
            url: "https://boxrec.com/en/login",
        };

        const data: RequestResponse = await requestWrapper<Response>(options);

        let errorMessage: string = "";

        // if the user hasn't given consent, the user is redirected to a page that contains `gdpr`
        if (data.request.uri.pathname.includes("gdpr")) {
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

        const searchParam: string = await BoxrecRequests.getSearchParamWrap(jar);
        const qs: BoxrecSearchParamsTransformed = createParamsObject(params, searchParam);
        qs.offset = offset;

        return requestWrapper<string>({
            jar,
            method: "GET",
            qs,
            url: "https://boxrec.com/en/search",
        });
    }

    /**
     * Removes the boxer from the users watch list.  Returns the watch page where the boxer should be removed
     * @param jar       contains cookie information about the user
     * @param {number} boxerGlobalId
     * @returns {Promise<boolean>}
     */
    static async unwatch(jar: CookieJar, boxerGlobalId: number): Promise<string> {
        return requestWrapper<string>({
            followAllRedirects: true,
            jar,
            method: "GET",
            url: `https://boxrec.com/en/unwatch/${boxerGlobalId}`,
        });
    }

    /**
     * Adds the boxer to the users watch list.  Returns the watch page where the boxer should have been added
     * @param jar       contains cookie information about the user
     * @param {number} boxerGlobalId
     * @returns {Promise<boolean>}
     */
    static async watch(jar: CookieJar, boxerGlobalId: number): Promise<string> {
        return requestWrapper<string>({
            followAllRedirects: true,
            jar,
            method: "GET",
            url: `https://boxrec.com/en/watch/${boxerGlobalId}`,
        });
    }

    /**
     * Search for global ID or string
     * better for searching by global ID.  `search` doesn't have it
     * @param jar
     * @param globalIdOrSearchText
     * @param searchRole    By default this is empty and returns the default role of the user
     */
    private static async quickSearch(jar: CookieJar, globalIdOrSearchText: string | number,
                                     searchRole: BoxrecRole | "" = ""): Promise<string> {
        const formData: any = {};
        const searchParam: string = await BoxrecRequests.getQuickSearchParamWrap(jar);
        // use an empty string or the actual passed role
        formData[`${searchParam}[search_role]`] = searchRole === null ? "" : searchRole;
        formData[`${searchParam}[search_text]`] = globalIdOrSearchText;

        const options: rp.Options = {
            followAllRedirects: true, // 302 redirect occurs
            formData,
            jar,
            method: "POST",
            url: "https://boxrec.com/en/quick_search",
        };

        return requestWrapper<string>(options);
    }

    private static async buildResultsSchedulesParams<T>(jar: CookieJar, params: T, offset: number): Promise<T> {
        const searchParam: string = await BoxrecRequests.getResultsParamWrap(jar);
        const qs: any = createParamsObject(params as any, searchParam);
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
    private static async getBoxerOther(jar: CookieJar, globalId: number,
                                       type: "pdf" | "print", pathToSaveTo?: string, fileName?: string):
        Promise<string> {
        const qs: PersonRequestParams = {};

        if (type === "pdf") {
            qs.pdf = "y";
        } else {
            qs.print = "y";
        }

        return requestWrapper<string>({
            followAllRedirects: true,
            jar,
            method: "GET",
            qs,
            url: `https://boxrec.com/en/boxer/${globalId}`
        });
    }

    private static async getRatingsParamWrap(jar: CookieJar): Promise<string> {
        if (ratingsParamWrap === "") {
            const boxrecPageBody: RequestResponse["body"] = await requestWrapper({
                jar,
                method: "GET",
                url: "https://boxrec.com/en/ratings",
            });

            const $: CheerioStatic = cheerio.load(boxrecPageBody);
            ratingsParamWrap = $(".page form").attr("name");
        }

        return ratingsParamWrap;
    }

    /**
     * Makes a request to BoxRec to get the search param prefix that is wrapped around params for the `results` page
     * @param jar
     */
    private static async getResultsParamWrap(jar: CookieJar): Promise<string> {
        if (resultsParamWrap === "") {
            // it would be nice to get this from any page but the Navbar search is a POST and
            // not as predictable as the search box one on the search page
            const boxrecPageBody: RequestResponse["body"] = await requestWrapper({
                jar,
                method: "GET",
                url: "https://boxrec.com/en/results",
            });

            const $: CheerioStatic = cheerio.load(boxrecPageBody);
            resultsParamWrap = $(".page form").attr("name");
        }

        return resultsParamWrap;
    }

    /**
     * Makes a request to BoxRec to find out the quick search param prefix that is wrapped around params
     * @param jar
     */
    private static async getQuickSearchParamWrap(jar: CookieJar): Promise<string> {
        if (quickSearchParamWrap === "") {
            const boxrecPageBody: RequestResponse["body"] = await requestWrapper({
                jar,
                method: "GET",
                url: "https://boxrec.com/en/quick_search",
            });

            // not sure why but when the package is now compiled and you try to traverse the DOM Cheerio comes
            // up with errors
            // https://github.com/boxing/boxrec/issues/252
            // the fix I found was to wrap the response (which includes the doctype/html tag) inside a div.
            // I'm not sure how to explain why this started but this should fix it
            const $: CheerioStatic = cheerio.load(boxrecPageBody);
            quickSearchParamWrap = $(".navLinks form").attr("name");
        }

        return quickSearchParamWrap;
    }

    /**
     * Makes a request to BoxRec to find out the search param prefix that is wrapped around params
     * @param jar
     */
    private static async getSearchParamWrap(jar: CookieJar): Promise<string> {
        if (searchParamWrap === "") {
            // it would be nice to get this from any page but the Navbar search is a POST and not as predictable
            // as the search box one on the search page
            const boxrecPageBody: RequestResponse["body"] = await requestWrapper({
                jar,
                method: "GET",
                url: "https://boxrec.com/en/search",
            });

            const $: CheerioStatic = cheerio.load(boxrecPageBody);
            searchParamWrap = $("h2:contains('Find People')")
                .parents("td").find("form").attr("name");
        }

        return searchParamWrap;
    }

    /**
     * Makes a request to BoxRec to get the titles param prefix that is wrapped around params for the `titles` page
     * @param jar
     */
    private static async getTitlesParamWrap(jar: CookieJar): Promise<string> {
        if (titlesParamWrap === "") {
            const boxrecPageBody: RequestResponse["body"] = await requestWrapper({
                jar,
                method: "GET",
                url: "https://boxrec.com/en/titles",
            });

            const $: CheerioStatic = cheerio.load(boxrecPageBody);
            titlesParamWrap = $(".page form").attr("name");
        }

        return titlesParamWrap;
    }

    /**
     * Returns the number of table columns on the page in dataTables
     * Note: Due to the selector be lazy and the poor HTML structure on BoxRec, this selector also includes other tables
     *      like enrollments.  We don't care about that though, we're just comparing the page with toggleRatings to get
     *      the most columns we can
     * @param boxrecPageBody
     */
    private static numberOfTableColumns(boxrecPageBody: string): number {
        const $: CheerioStatic = cheerio.load(boxrecPageBody);
        return $(".dataTable tbody:nth-child(2) tr:nth-child(1) td").length;
    }

    /**
     *
     * @param jar
     * @param globalId
     * @param role
     * @param offset        offset is the number of bouts/events on a person's profile (not tested with boxers)
     * @param previousRequestBody  we'll compare both requests and return the one with more columns
     *                                          the reason for this is because it's hard to determine and keep up
     *                                          BoxRec column changes, therefore we just take the one with most columns
     */
    private static async makeGetPersonByIdRequest(jar: CookieJar, globalId: number,
                                                  role: BoxrecRole = BoxrecRole.proBoxer, offset: number = 0,
                                                  previousRequestBody: string | null):
        Promise<string> {
        const url: string = `https://boxrec.com/en/${role}/${globalId}`;
        const qs: any = {
            offset,
        };

        // we made the same request before therefore we toggle ratings to see the difference
        if (previousRequestBody) {
            qs.toggleRatings = "y";
        }

        const boxrecPageBody: RequestResponse["body"] = await requestWrapper({
            jar,
            method: "GET",
            qs,
            resolveWithFullResponse: false,
            url,
        });
        const numberOfColumnsReceived: number =
            BoxrecRequests.numberOfTableColumns(boxrecPageBody);

        // if the profile does not match what we expected (returns something different),
        // we make the other request for data
        // ex. getPersonById `52984` boxer Paulie Malignaggi
        // if we don't specify a role, it'll give his `pro boxer` career
        // if we do specify a role that he doesn't have like `muay thai boxer`,
        // it'll return his `bare knuckle boxing` career
        // there is a test for this
        if (getRoleOfHTML(boxrecPageBody) !== role) {
            // throw an error so we don't deceive the developer/user what type of profile this is
            throw new Error("Person does not have this role");
        }

        if (previousRequestBody) {
            const numberOfColumnsReceivedPrevious: number =
                BoxrecRequests.numberOfTableColumns(previousRequestBody);

            // if the previous request has more columns, we return that body instead
            return numberOfColumnsReceivedPrevious > numberOfColumnsReceived
                ? previousRequestBody : boxrecPageBody;
        }

        // calls itself with the toggle for `toggleRatings=y`
        return this.makeGetPersonByIdRequest(jar, globalId, role, offset, boxrecPageBody);
    }

}
