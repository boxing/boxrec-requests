import * as cheerio from "cheerio";
import * as FormData from "form-data";
import {
    BoxrecDate,
    BoxrecFighterOption,
    BoxrecLocationEventParams,
    BoxrecLocationSearchParamsCountry,
    BoxrecLocationSearchParams,
    BoxrecLocationSearchResponse, BoxrecLocationSearchResponseCountry,
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
    PersonRequestParams,
    ScoreCard, BoxrecLocationSearchParamsSearch
} from "./boxrec-requests.constants";
import {getRoleOfHTML} from "./helpers";
import {Cookie, LoginResponse, puppeteerFetch} from "./puppeteer-fetch";
import Root = cheerio.Root;

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
     * @param cookies       contains cookie information about the user
     * @param eventBoutId   includes both the event and bout separated by "/"
     */
    static async getBout(cookies: string, eventBoutId: string): Promise<string> {
        return BoxrecRequests.requestWrapper(`https://boxrec.com/en/event/${eventBoutId}`, cookies);
    }

    /**
     * Makes a request to BoxRec to return a list of current champions
     * @param cookies      contains cookie information about the user
     * @returns {Promise<string>}
     */
    static async getChampions(cookies: string): Promise<string> {
        return BoxrecRequests.requestWrapper("https://boxrec.com/en/champions", cookies);
    }

    /**
     * Makes a request to BoxRec to get events/bouts on the particular date
     * @param cookies               contains cookie information about the user
     * @param {BoxrecDate} params
     * @returns {Promise<void>}
     */
    static async getDate(cookies: string, params: BoxrecDate): Promise<string> {
        return BoxrecRequests.requestWrapper("https://boxrec.com/en/date", cookies, {
            "d[date]": `${params.year}-${params.month}-${params.day}`,
            "sport": params.sport,
        });
    }

    /**
     * Makes a request to BoxRec to retrieve an event by id
     * @param cookies               contains cookie information about the user
     * @param {number} eventId      the event id from BoxRec
     * @returns {Promise<string>}
     */
    static async getEventById(cookies: string, eventId: number): Promise<string> {
        return BoxrecRequests.requestWrapper(`https://boxrec.com/en/event/${eventId}`, cookies);
    }

    /**
     * Makes a request to BoxRec to list events by sport/location
     * @param cookies                               contains cookie information about the user
     * @param {BoxrecLocationEventParams} params    params included to get events by location
     * @param {number} offset                       the number of rows to offset the search
     * @returns {Promise<string>}
     */
    static async getEvents(cookies: string, params: BoxrecLocationEventParams, offset: number = 0): Promise<string> {
        return BoxrecRequests.getEventsByLocation(cookies, params, offset);
    }

    /**
     * Makes a request to BoxRec to list events by sport/location
     * @deprecated              This method is now more than location, and is also by sport (use `getPeople`)
     * @param cookies                               contains cookie information about the user
     * @param {BoxrecLocationEventParams} params    params included to get events by location
     * @param {number} offset                       the number of rows to offset the search
     * @returns {Promise<string>}
     */
    static async getEventsByLocation(cookies: string, params: BoxrecLocationEventParams, offset: number = 0):
        Promise<string> {

        // todo this doesn't appear to be needed for "locate people"
        // params.level_id = params.country;
        // todo doesn't appear to be needed
        // params.location = params.country;

        // todo should the user pass their level region or should we be able to figure it out?
        // if (params.country && params.region && params.town) {
        //     params.level = BoxrecLocationLevel.Town;
        // } else if (params.country && params.region) {
        //     params.level = BoxrecLocationLevel.Region;
        // } else {
        //     params.level = BoxrecLocationLevel.Country;
        // }

        const qs: Partial<BoxrecLocationEventParams> = createParamsObject(params, "l");
        qs.offset = offset;

        return BoxrecRequests.requestWrapper(`https://boxrec.com/en/locations/event`, cookies, qs);
    }

    /**
     * Make a request to BoxRec to search for people by location/role
     * @param cookies                               contains cookie information about the user
     * @param {BoxrecLocationsPeopleParams} params  params included to get people by location/role
     * @param {number} offset                       the number of rows to offset the search
     * @returns {Promise<string>}
     */
    static async getPeople(cookies: string, params: BoxrecLocationsPeopleParams, offset: number = 0): Promise<string> {
        return BoxrecRequests.getPeopleByLocation(cookies, params, offset);
    }

    /**
     * Make a request to BoxRec to search for people by location/role
     * @deprecated              This method is now more than location, and is also by sport (use `getPeople`)
     * @param cookies                               contains cookie information about the user
     * @param {BoxrecLocationsPeopleParams} params  params included to get people by location
     * @param {number} offset                       the number of rows to offset the search
     * @returns {Promise<string>}
     */
    static async getPeopleByLocation(cookies: string, params: BoxrecLocationsPeopleParams, offset: number = 0):
        Promise<string> {
        const qs: BoxrecLocationsPeopleParamsTransformed = createParamsObject(params, "l");
        qs.offset = offset;

        return BoxrecRequests.requestWrapper(`https://boxrec.com/en/locations/people`, cookies, qs);
    }

    /**
     * Makes a search request to BoxRec to get all people that match that name
     * by using a generator, we're able to prevent making too many calls to BoxRec
     * @param cookies                       contains cookie information about the user
     * @param {string} firstName            the person's first name
     * @param {string} lastName             the person's last name
     * @param {string} role                 the role of the person
     * @param {BoxrecStatus} status         whether the person is active in Boxing or not
     * @param {number} offset               the number of rows to offset the search
     * @yields {string}                     returns a generator to fetch the next person by ID
     */
    static async getPeopleByName(cookies: string, firstName: string, lastName: string,
                                 role: BoxrecRole | "" | "fighters" = "", status: BoxrecStatus = BoxrecStatus.all,
                                 offset: number = 0): Promise<string> {
        const params: BoxrecSearchParams = {
            first_name: firstName,
            last_name: lastName,
            role,
            status,
        };

        return BoxrecRequests.search(cookies, params, offset);
    }

    /**
     * Make a request to BoxRec to get a person by their BoxRec Global ID
     * @param cookies                           contains cookie information about the user
     * @param {number} globalId                 the BoxRec profile id
     * @param {BoxrecRole} role                 the role of the person in boxing (there are multiple profiles for people if they fall under different roles)
     * @param {number} offset                   offset number of bouts/events in the profile.  todo boxer support?
     * @returns {Promise<string>}
     */
    // todo don't let fighter roles from BoxRecRole
    static async getPersonById(cookies: string, globalId: number, role: BoxrecRole | BoxrecFighterOption | null = null, offset: number = 0):
        Promise<string> {
        if (role !== null) {
            return BoxrecRequests.makeGetPersonByIdRequest(cookies, globalId, role, offset, null);
        }

        // if role is null we need to get the default profile, we `quick_search` it which will give us the default
        return BoxrecRequests.quickSearch(cookies, globalId);
    }

    /**
     * Makes a request to BoxRec to get a list of ratings/rankings, either P4P or by a single weight class
     * @param cookies                           contains cookie information about the user
     * @param {BoxrecRatingsParams} params      params included to get ratings
     * @param {number} offset                   the number of rows to offset the search
     * @returns {Promise<string>}
     */
    static async getRatings(cookies: string, params: BoxrecRatingsParams, offset: number = 0): Promise<string> {
        const paramWrap: string = await BoxrecRequests.getRatingsParamWrap(cookies);
        const qs: any = createParamsObject(params, paramWrap);
        qs.offset = offset;

        return BoxrecRequests.requestWrapper("https://boxrec.com/en/ratings", cookies, qs);
    }

    /**
     * Makes a request to BoxRec to get a list of results.
     * Uses same class
     * @param cookies                       contains cookie information about the user
     * @param {BoxrecResultsParams} params  params included to get results
     * @param {number} offset               the number of rows to offset this search
     * @returns {Promise<string>}
     */
    static async getResults(cookies: string, params: BoxrecResultsParams, offset: number = 0): Promise<string> {
        const qs: BoxrecResultsParamsTransformed =
            await BoxrecRequests.buildResultsSchedulesParams<BoxrecResultsParamsTransformed>(cookies, params, offset);

        return BoxrecRequests.requestWrapper("https://boxrec.com/en/results", cookies, qs);
    }

    /**
     * Makes a request to BoxRec to get a list of scheduled events
     * @param cookies                           contains cookie information about the user
     * @param {BoxrecScheduleParams} params     params included to get schedule
     * @param {number} offset                   the number of rows to offset the search
     * @returns {Promise<string>}
     */
    static async getSchedule(cookies: string, params: BoxrecScheduleParams, offset: number = 0): Promise<string> {
        const qs: BoxrecResultsParamsTransformed =
            await BoxrecRequests.buildResultsSchedulesParams<BoxrecResultsParamsTransformed>(cookies, params, offset);

        return BoxrecRequests.requestWrapper("https://boxrec.com/en/schedule", cookies, qs);
    }

    /**
     * Makes a request to BoxRec to list all the scores of the user
     * @param cookies                            contains cookie information about the user
     * @returns {Promise<string>}
     */
    static async listScores(cookies: string): Promise<string> {
        return BoxrecRequests.requestWrapper(`https://boxrec.com/en/my_scores`, cookies);
    }

    /**
     * Makes a request to BoxRec to list all the scores of a single bout (including the user and fans)
     * @param cookies                           contains cookie information about the user
     * @param boutId                            the ID of the bout
     * @returns {Promise<string>}
     */
    static async getScoresByBoutId(cookies: string, boutId: number): Promise<string> {
        return BoxrecRequests.requestWrapper(`https://boxrec.com/en/scoring/${boutId}`, cookies);
    }

    /**
     * Makes a request to BoxRec to update the user's score of a bout
     * @param cookies                           contains cookie information about the user
     * @param boutId                            the ID of the bout
     * @param scorecard                         an array of numbers that represent the points for each fighter per round
     * @returns {Promise<string>}
     */
    static async updateScoreByBoutId(cookies: string, boutId: number, scorecard: ScoreCard): Promise<string> {
        const qs: Record<string, string> = {};

        scorecard.forEach((round: [number, number], idx: number) => {
            qs[`a${idx + 1}`] = "" + round[0];
            qs[`b${idx + 1}`] = "" + round[1];
        });

        return BoxrecRequests.requestWrapper(`https://boxrec.com/en/scoring/historical/submit/${boutId}`, cookies, qs);
    }

    /**
     * Makes a request to BoxRec to the specific title URL to get a belt's history
     * @param cookies               contains cookie information about the user
     * @param {string} titleString  in the format of "6/Middleweight" which would be the WBC Middleweight title
     * @param {number} offset       the number of rows to offset the search
     * @returns {Promise<string>}
     * @todo offset not used?  Does this link work?
     */
    static async getTitleById(cookies: string, titleString: string, offset: number = 0): Promise<string> {
        return BoxrecRequests.requestWrapper(`https://boxrec.com/en/title/${titleString}`, cookies);
    }

    /**
     * Makes a request to BoxRec to get information on scheduled title fights
     * @param cookies                contains cookie information about the user
     * @param params
     * @param offset
     */
    static async getTitles(cookies: string, params: BoxrecTitlesParams, offset: number = 0): Promise<string> {
        const paramWrap: string = await BoxrecRequests.getTitlesParamWrap(cookies);
        const qs: BoxrecTitlesParamsTransformed = createParamsObject(params, paramWrap);
        qs.offset = offset;

        return BoxrecRequests.requestWrapper(`https://boxrec.com/en/titles`, cookies, qs);
    }

    /**
     * Makes a request to BoxRec to get the information of a venue
     * @param cookies           contains cookie information about the user
     * @param {number} venueId
     * @returns {Promise<string>}
     */
    static async getVenueById(cookies: string, venueId: number): Promise<string> {
        // todo location has been merged with venue, maybe one should be deprecated?
        return BoxrecRequests.requestWrapper(`https://boxrec.com/en/location/${venueId}`, cookies);
    }

    /**
     * Lists the boxers that the user is watching
     * @param cookies
     * @returns {Promise<string>}
     */
    static async getWatched(cookies: string): Promise<string> {
        return BoxrecRequests.requestWrapper("https://boxrec.com/en/watchlist", cookies);
    }

    // static async solveCaptcha(): Promise<Array<Record<string, string>>> {
    //     puppeteer.use(pluginStealth());
    //     const browser: any = await puppeteer.launch({
    //         args: [
    //             `--window-size=600,1000`,
    //             "--window-position=000,000",
    //             "--disable-dev-shm-usage",
    //             "--no-sandbox",
    //             "--user-data-dir=\"/tmp/chromium\"",
    //             "--disable-web-security",
    //             "--disable-features=site-per-process"
    //         ],
    //         headless: false,
    //         ignoreHTTPSErrors: true,
    //     } as any);
    //
    //     const [page] = await browser.pages();
    //     await page.goto("https://boxrec.com");
    //     await page.setDefaultNavigationTimeout(0);
    //     try {
    //         await hcaptcha(page, 10000);
    //         return page.cookies();
    //     } finally {
    //         await browser.close();
    //     }
    // }

    /**
     * Makes a request to get BoxRec location information
     * @param cookies
     * @param params
     */
    static async getLocationSearch(cookies: string, params?: BoxrecLocationSearchParamsSearch | BoxrecLocationSearchParamsCountry): Promise<BoxrecLocationSearchResponseCountry>;
    static async getLocationSearch(cookies: string, params?: BoxrecLocationSearchParams): Promise<BoxrecLocationSearchResponse | BoxrecLocationSearchResponseCountry> {
        return BoxrecRequests.requestWrapper("https://boxrec.com/en/location_search_ajax", cookies, {
            ...params,
            inc_loc: "y",
        });
    }

    /**
     * Makes a request to BoxRec to log the user in
     * This is required before making any additional calls
     * The session cookie is stored inside this instance of the class
     * @param {string} username     your BoxRec username
     * @param {string} password     your BoxRec password
     * @returns     If the response is a string, you have successfully logged in.  Otherwise an error should be thrown
     */
    static async login(username: string, password: string): Promise<string> {
        // check for undefined args, if undefined will throw weird error.  Therefore we check and throw proper error
        // https://github.com/form-data/form-data/issues/336#issuecomment-301116262
        if (username === undefined || password === undefined) {
            throw new Error(`missing parameter: ${username === undefined ? "username" : "password"}`);
        }

        const formData: FormData = new FormData();
        formData.append( "_password", password);
        formData.append( "_remember_me", "on");
        formData.append( "_target_path", "https://boxrec.com");  // not required,
        formData.append( "_username", username);
        formData.append( "login[go]", ""); // not required

        const data: LoginResponse = await BoxrecRequests.requestWrapper("https://boxrec.com/en/login", undefined, {
            _password: password,
            _username: username,
        });

        if (data.cookies) {
            // todo gdpr might be in the HTML already and we need a better selector
            // if (data.body?.includes("gdpr")) {
            //     throw new Error("GDPR consent is needed with this account.  Log into BoxRec through their website and accept before using this account");
            // }

            // the following are when login has failed
            // an unsuccessful login returns a 200
            const $: Root = cheerio.load(data.body);
            if ($("input#username").length) {
                throw new Error("Please check your credentials, could not log into BoxRec");
            }

            return JSON.stringify(data.cookies);
        } else {

            return "";
            // todo this is busted now and can't be committed like this
            //
            // // const data: FetchResponse = await requestWrapperFullResponse("https://boxrec.com/en/login", undefined, {
            // //     body: formData,
            // //     cache: "no-cache",
            // //     credentials: "same-origin",
            // //     method: "POST",
            // //     mode: "no-cors",
            // //     redirect: "manual",
            // // });
            //
            // console.log(data.headers);
            //
            // console.log("here", data);
            //
            // const cookies: any = data.headers.get("set-cookie");
            //
            // // redirect because we want to see if GDPR is activated for this account, as well as check any errors afterwards
            // const redirectUrl: string | null = data.headers.get("Location");
            //
            // if (!redirectUrl) {
            //     throw new Error("Could not get redirect URL");
            // }
            //
            // // get the redirect response to see if login was successful
            // const loginRedirect: FetchResponse = await requestWrapperFullResponse(redirectUrl, cookies, {});
            //
            // const loginRedirectBody: string = await loginRedirect.text();
            // // if the user hasn't given consent, the user is redirected to a page that contains `gdpr`
            // if (redirectUrl?.includes("gdpr")) {
            //     throw new Error("GDPR consent is needed with this account.  Log into BoxRec through their website and accept before using this account");
            // }
            //
            // // the following are when login has failed
            // // an unsuccessful login returns a 200
            // const $: Root = cheerio.load(loginRedirectBody);
            // if ($("input#username").length) {
            //     throw new Error("Please check your credentials, could not log into BoxRec");
            // }
            //
            // if (loginRedirect.status !== 200) {
            //     throw new Error("Redirect status was expecting 200");
            // }
            //
            // return cookies;
        }
    }

    /**
     * Makes a request to BoxRec to search people by
     * Note: currently only supports boxers
     * @param cookies                       contains cookie information about the user
     * @param {BoxrecSearchParams} params   params included in this search
     * @param {number}             offset   the number of rows to offset the search
     * @returns {Promise<string>}
     */
    static async search(cookies: string, params: BoxrecSearchParams, offset: number = 0): Promise<string> {
        if (!params.first_name && !params.last_name) {
            // BoxRec says 2 or more characters, it's actually 3 or more
            throw new Error("Requires `first_name` or `last_name` - minimum 3 characters long");
        }

        const searchParam: string = await BoxrecRequests.getSearchParamWrap(cookies);
        const qs: BoxrecSearchParamsTransformed = createParamsObject(params, searchParam);
        qs.offset = offset;

        return BoxrecRequests.requestWrapper("https://boxrec.com/en/search", cookies, qs);
    }

    /**
     * Removes the boxer from the users watch list.  Returns the watch page where the boxer should be removed
     * @param cookies    contains cookie information about the user
     * @param {number} boxerGlobalId
     * @returns {Promise<boolean>}
     */
    static async unwatch(cookies: string, boxerGlobalId: number): Promise<string> {
        return BoxrecRequests.requestWrapper(`https://boxrec.com/en/unwatch/${boxerGlobalId}`, cookies);
    }

    /**
     * Adds the boxer to the users watch list.  Returns the watch page where the boxer should have been added
     * @param cookies    contains cookie information about the user
     * @param {number} boxerGlobalId
     * @returns {Promise<boolean>}
     */
    static async watch(cookies: string, boxerGlobalId: number): Promise<string> {
        return BoxrecRequests.requestWrapper(`https://boxrec.com/en/watch/${boxerGlobalId}`, cookies);
    }

    /**
     * Intercepts the requests and converts it for the middleware requestor
     * @param url
     * @param cookies
     * @param bodyOrQueryParams
     * @private
     */
    private static async requestWrapper(url: "https://boxrec.com/en/location_search_ajax", cookies: string, bodyOrQueryParams: BoxrecLocationSearchParams): Promise<BoxrecLocationSearchResponse>;
    private static async requestWrapper(url: string, cookies: string, bodyOrQueryParams?: Record<string, any>): Promise<string>;
    private static async requestWrapper(url: "https://boxrec.com/en/login", cookies: undefined, bodyOrQueryParams: Record<string, any>): Promise<LoginResponse>;
    private static async requestWrapper(url: string, cookies: string | undefined, bodyOrQueryParams?: Record<string, any> | BoxrecLocationEventParams): Promise<string | LoginResponse | BoxrecLocationSearchResponse> {
        if (cookies) {
            if (url === "https://boxrec.com/en/quick_search") {
                if (bodyOrQueryParams) {
                    const responsePostQuickSearch = await puppeteerFetch(url, cookies, "POST", bodyOrQueryParams);
                    return responsePostQuickSearch.body;
                }

                const responseGetQuickSearch = await puppeteerFetch(url, cookies, "GET");
                return responseGetQuickSearch.body;
            }

            const responseGet = await puppeteerFetch(url, cookies, "GET", bodyOrQueryParams);
            return responseGet.body;
        }

        if (url === "https://boxrec.com/en/login") {
            return puppeteerFetch(url, undefined, "POST", bodyOrQueryParams);
        }

        throw new Error("could not determine proper request from arguments");
    }

    /**
     * Search for global ID or string
     * better for searching by global ID.  `search` doesn't have it
     * @param cookies
     * @param globalIdOrSearchText
     * @param searchRole    By default this is empty and returns the default role of the user
     */
    private static async quickSearch(cookies: string, globalIdOrSearchText: string | number,
                                     searchRole: BoxrecRole | "" = ""): Promise<string> {
        const searchParam: string = await BoxrecRequests.getQuickSearchParamWrap(cookies);
        // use an empty string or the actual passed role
        return BoxrecRequests.requestWrapper("https://boxrec.com/en/quick_search", cookies, {
            [`${searchParam}[search_role]`]: searchRole === null ? "" : searchRole,
            [`${searchParam}[search_text]`]: globalIdOrSearchText
        });
    }

    private static async buildResultsSchedulesParams<T>(cookies: string, params: T, offset: number): Promise<T> {
        const searchParam: string = await BoxrecRequests.getResultsParamWrap(cookies);
        const qs: any = createParamsObject(params as any, searchParam);
        qs.offset = offset;

        return qs as T;
    }

    /**
     * Returns/saves a boxer's profile in print/pdf format
     * @param cookies                       contains cookie information about the user
     * @param {number} globalId
     * @param {"pdf" | "print"} type
     * @todo support role as it's not just boxers (ex. amateurs)
     * @returns {Promise<string>}
     */
    private static async getBoxerOther(cookies: string, globalId: number,
                                       type: "pdf" | "print"):
        Promise<string> {
        const qs: PersonRequestParams = {};

        if (type === "pdf") {
            qs.pdf = "y";
        } else {
            qs.print = "y";
        }

        return BoxrecRequests.requestWrapper(`https://boxrec.com/en/proboxer/${globalId}`, cookies, qs);
    }

    private static async getRatingsParamWrap(cookies: string): Promise<string> {
        if (ratingsParamWrap === "") {
            const boxrecPageBody: string = await BoxrecRequests.requestWrapper("https://boxrec.com/en/ratings", cookies);

            const $: Root = cheerio.load(boxrecPageBody);
            ratingsParamWrap = $(".page form").attr("name") || "";
        }

        return ratingsParamWrap;
    }

    /**
     * Makes a request to BoxRec to get the search param prefix that is wrapped around params for the `results` page
     * @param cookies
     */
    private static async getResultsParamWrap(cookies: string): Promise<string> {
        if (resultsParamWrap === "") {
            // it would be nice to get this from any page but the Navbar search is a POST and
            // not as predictable as the search box one on the search page
            const boxrecPageBody: string = await BoxrecRequests.requestWrapper("https://boxrec.com/en/results", cookies);

            const $: Root = cheerio.load(boxrecPageBody);
            resultsParamWrap = $(".page form").attr("name") || "";
        }

        return resultsParamWrap;
    }

    /**
     * Makes a request to BoxRec to find out the quick search param prefix that is wrapped around params
     * @param cookies
     */
    private static async getQuickSearchParamWrap(cookies: string): Promise<string> {
        if (quickSearchParamWrap === "") {
            const boxrecPageBody: string = await BoxrecRequests.requestWrapper("https://boxrec.com/en/quick_search", cookies);

            // not sure why but when the package is now compiled and you try to traverse the DOM Cheerio comes
            // up with errors
            // https://github.com/boxing/boxrec/issues/252
            // the fix I found was to wrap the response (which includes the doctype/html tag) inside a div.
            // I'm not sure how to explain why this started but this should fix it
            const $: Root = cheerio.load(boxrecPageBody);
            quickSearchParamWrap = $(".navLinks form").attr("name") || "";
        }

        return quickSearchParamWrap;
    }

    /**
     * Makes a request to BoxRec to find out the search param prefix that is wrapped around params
     * @param cookies
     */
    private static async getSearchParamWrap(cookies: string): Promise<string> {
        if (searchParamWrap === "") {
            // it would be nice to get this from any page but the Navbar search is a POST and not as predictable
            // as the search box one on the search page
            const boxrecPageBody: string = await BoxrecRequests.requestWrapper("https://boxrec.com/en/search", cookies);

            const $: Root = cheerio.load(boxrecPageBody);
            searchParamWrap = $("form[action=\"/en/search\"]").attr("name") || "";
        }

        return searchParamWrap;
    }

    /**
     * Makes a request to BoxRec to get the titles param prefix that is wrapped around params for the `titles` page
     * @param cookies
     */
    private static async getTitlesParamWrap(cookies: string): Promise<string> {
        if (titlesParamWrap === "") {
            const boxrecPageBody: string = await BoxrecRequests.requestWrapper("https://boxrec.com/en/titles", cookies);

            const $: Root = cheerio.load(boxrecPageBody);
            titlesParamWrap = $(".page form").attr("name") || "";
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
        const $: Root = cheerio.load(boxrecPageBody);
        return $(".dataTable tbody:nth-child(2) tr:nth-child(1) td").length;
    }

    /**
     *
     * @param cookies
     * @param globalId
     * @param role
     * @param offset        offset is the number of bouts/events on a person's profile (not tested with boxers)
     * @param previousRequestBody  we'll compare both requests and return the one with more columns
     *                                          the reason for this is because it's hard to determine and keep up
     *                                          BoxRec column changes, therefore we just take the one with most columns
     */
    private static async makeGetPersonByIdRequest(cookies: string, globalId: number,
                                                  role: BoxrecRole | BoxrecFighterOption = BoxrecFighterOption["Pro Boxing"],
                                                  offset: number = 0,
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

        const boxrecPageBody: string = await BoxrecRequests.requestWrapper(url, cookies, qs);
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
        return this.makeGetPersonByIdRequest(cookies, globalId, role, offset, boxrecPageBody);
    }

}
