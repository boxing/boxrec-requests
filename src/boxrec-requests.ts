import * as $ from "cheerio";
import {CookieJar, RequestResponse} from "request";
import * as rp from "request-promise";
import {Options} from "request-promise";
import {Cookie} from "tough-cookie";
import {
    BoxrecLocationEventParams,
    BoxrecLocationsPeopleParams,
    BoxrecLocationsPeopleParamsTransformed,
    BoxrecRatingsParams,
    BoxrecRatingsParamsTransformed,
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

/**
 * Makes API requests to BoxRec and returns the HTML body
 */
export class BoxrecRequests {

    private _cookieJar: CookieJar = rp.jar();
    private _searchParamWrap: string = "";

    get cookies(): Cookie[] {
        return this._cookieJar.getCookies("http://boxrec.com");
    }

    set cookies(cookiesArr: Cookie[]) {
        this._cookieJar = rp.jar(); // reset the cookieJar
        cookiesArr.forEach(item => this._cookieJar.setCookie(item, "http://boxrec.com"));
    }

    private get searchParamWrap(): string {
        return this._searchParamWrap;
    }

    private static buildResultsSchedulesParams<T>(params: T, offset: number): T {
        const qs: any = {};

        for (const i in params) {
            if (params.hasOwnProperty(i)) {
                (qs as any)[`c[${i}]`] = (params as any)[i];
            }
        }

        qs.offset = offset;

        return qs as T;
    }

    /**
     * Makes a request to get the PHPSESSID required to login
     * @returns {Promise<string[]>}
     */
    private static async getSessionCookie(): Promise<string[] | undefined> {
        const options: Options = {
            resolveWithFullResponse: true,
            uri: "http://boxrec.com",
        };

        return rp.get(options).then((data: RequestResponse) => data.headers["set-cookie"]);
    }

    /**
     * Makes a request to get Bout Information
     * @param eventBoutId   includes both the event and bout separated by "/"
     */
    async getBout(eventBoutId: string): Promise<string> {
        return rp.get({
            jar: this._cookieJar,
            uri: `http://boxrec.com/en/event/${eventBoutId}`,
        });
    }

    /**
     * Makes a request to BoxRec to return/save the PDF version of a boxer profile
     * @param {number} globalId     the BoxRec global id of the boxer
     * @param {string} pathToSaveTo directory to save to.  if not used will only return data
     * @param {string} fileName     file name to save as.  Will save as {globalId}.pdf as default.  Add .pdf to end of filename
     * @returns {Promise<string>}
     */
    async getBoxerPDF(globalId: number, pathToSaveTo?: string, fileName?: string): Promise<string> {
        return this.getBoxerOther(globalId, "pdf", pathToSaveTo, fileName);
    }

    /**
     * Makes a request to BoxRec to return/save the printable version of a boxer profile
     * @param {number} globalId     the BoxRec global id of the boxer
     * @param {string} pathToSaveTo directory to save to.  if not used will only return data
     * @param {string} fileName     file name to save as.  Will save as {globalId}.html as default.  Add .html to end of filename
     * @returns {Promise<string>}
     */
    async getBoxerPrint(globalId: number, pathToSaveTo?: string, fileName?: string): Promise<string> {
        return this.getBoxerOther(globalId, "print", pathToSaveTo, fileName);
    }

    /**
     * Makes a request to BoxRec to return a list of current champions
     * @returns {Promise<string>}
     */
    async getChampions(): Promise<string> {
        return rp.get({
            jar: this._cookieJar,
            uri: "http://boxrec.com/en/champions",
        });
    }

    /**
     * Makes a request to BoxRec to retrieve an event by id
     * @param {number} eventId      the event id from BoxRec
     * @returns {Promise<string>}
     */
    async getEventById(eventId: number): Promise<string> {
        return rp.get({
            jar: this._cookieJar,
            uri: `http://boxrec.com/en/event/${eventId}`,
        });
    }

    /**
     * Makes a request to BoxRec to list events by location
     * @param {BoxrecLocationEventParams} params    params included in this search
     * @param {number} offset                       the number of rows to offset the search
     * @returns {Promise<string>}
     */
    async getEventsByLocation(params: BoxrecLocationEventParams, offset: number = 0): Promise<string> {
        const qs: BoxrecLocationEventParams = {};

        for (const i in params) {
            if (params.hasOwnProperty(i)) {
                (qs as any)[`l[${i}]`] = (params as any)[i];
            }
        }

        qs.offset = offset;

        return rp.get({
            jar: this._cookieJar,
            qs,
            uri: `http://boxrec.com/en/locations/event`,
        });
    }

    /**
     * Make a request to BoxRec to search for people by location
     * @param {BoxrecLocationsPeopleParams} params  params included in this search
     * @param {number} offset                       the number of rows to offset the search
     * @returns {Promise<string>}
     */
    async getPeopleByLocation(params: BoxrecLocationsPeopleParams, offset: number = 0): Promise<string> {
        const qs: BoxrecLocationsPeopleParamsTransformed = {};

        for (const i in params) {
            if (params.hasOwnProperty(i)) {
                (qs as any)[`l[${i}]`] = (params as any)[i];
            }
        }

        qs.offset = offset;

        return rp.get({
            jar: this._cookieJar,
            qs,
            uri: `http://boxrec.com/en/locations/people`,
        });
    }

    /**
     * Makes a search request to BoxRec to get all people that match that name
     * by using a generator, we're able to prevent making too many calls to BoxRec
     * @param {string} firstName            the person's first name
     * @param {string} lastName             the person's last name
     * @param {string} role                 the role of the person
     * @param {BoxrecStatus} status         whether the person is active in Boxing or not
     * @param {number} offset               the number of rows to offset the search
     * @yields {string}                     returns a generator to fetch the next person by ID
     */
    async* getPeopleByName(firstName: string, lastName: string, role: BoxrecRole = BoxrecRole.boxer, status: BoxrecStatus = BoxrecStatus.all, offset: number = 0): AsyncIterableIterator<string> {
        const params: BoxrecSearchParams = {
            first_name: firstName,
            last_name: lastName,
            role,
            status,
        };
        const searchResults: RequestResponse["body"] = await this.search(params, offset);

        for (const result of searchResults) {
            yield await this.getPersonById(result.id);
        }
    }

    /**
     * Make a request to BoxRec to get a person by their BoxRec Global ID
     * @param {number} globalId                 the BoxRec profile id
     * @param {BoxrecRole} role                 the role of the person in boxing (there seems to be multiple profiles for people if they fall under different roles)
     * @param {number} offset                   offset number of bouts/events in the profile.  Not used for boxers as boxer's profiles list all bouts they've been in
     * @returns {Promise<string>}
     */
    async getPersonById(globalId: number, role: BoxrecRole = BoxrecRole.boxer, offset: number = 0): Promise<string> {
        return this.makeGetPersonByIdRequest(globalId, role, offset);
    }

    async getRatings(params: BoxrecRatingsParams, offset: number = 0): Promise<string> {
        const qs: BoxrecRatingsParamsTransformed = {};

        for (const i in params) {
            if (params.hasOwnProperty(i)) {
                (qs as any)[`r[${i}]`] = (params as any)[i];
            }
        }

        qs.offset = offset;

        return rp.get({
            jar: this._cookieJar,
            qs,
            uri: "http://boxrec.com/en/ratings",
        });
    }

    /**
     * Makes a request to BoxRec to get a list of results.
     * Uses same class
     * @param {BoxrecResultsParams} params  params included in this search
     * @param {number} offset               the number of rows to offset this search
     * @returns {Promise<string>}
     */
    async getResults(params: BoxrecResultsParams, offset: number = 0): Promise<string> {
        const qs: BoxrecResultsParamsTransformed =
            BoxrecRequests.buildResultsSchedulesParams<BoxrecResultsParamsTransformed>(params, offset);

        return rp.get({
            jar: this._cookieJar,
            qs,
            uri: "http://boxrec.com/en/results",
        });
    }

    /**
     * Makes a request to BoxRec to get a list of scheduled events
     * @param {BoxrecScheduleParams} params     params included in this search
     * @param {number} offset                   the number of rows to offset the search
     * @returns {Promise<string>}
     */
    async getSchedule(params: BoxrecScheduleParams, offset: number = 0): Promise<string> {
        const qs: BoxrecResultsParamsTransformed =
            BoxrecRequests.buildResultsSchedulesParams<BoxrecResultsParamsTransformed>(params, offset);

        return rp.get({
            jar: this._cookieJar,
            qs,
            uri: "http://boxrec.com/en/schedule",
        });
    }

    /**
     * Makes a request to BoxRec to the specific title URL to get a belt's history
     * @param {string} titleString  in the format of "6/Middleweight" which would be the WBC Middleweight title
     * @param {number} offset       the number of rows to offset the search
     * @returns {Promise<string>}
     */
    async getTitleById(titleString: string, offset: number = 0): Promise<string> {
        return rp.get({
            jar: this._cookieJar,
            uri: `http://boxrec.com/en/title/${titleString}`,
        });
    }

    async getTitles(params: BoxrecTitlesParams, offset: number = 0): Promise<any> {
        const qs: BoxrecTitlesParamsTransformed = {};

        for (const i in params) {
            if (params.hasOwnProperty(i)) {
                (qs as any)[`WcX[${i}]`] = (params as any)[i];
            }
        }

        qs.offset = offset;

        return rp.get({
            jar: this._cookieJar,
            qs,
            uri: `http://boxrec.com/en/titles`,
        });
    }

    /**
     * Makes a request to BoxRec to get the information of a venue
     * @param {number} venueId
     * @param {number} offset   the number of rows to offset the search
     * @returns {Promise<string>}
     */
    async getVenueById(venueId: number, offset: number = 0): Promise<string> {
        return rp.get({
            jar: this._cookieJar,
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
    async login(username: string, password: string): Promise<void> {
        let rawCookies: string[];

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

        this.cookies = [cookie];

        const options: Options = {
            followAllRedirects: true, // 302 redirect occurs
            formData: {
                "_password": password,
                "_remember_me": "on",
                "_target_path": "http://boxrec.com", // not required,
                "_username": username,
                "login[go]": "", // not required
            },
            jar: this._cookieJar,
            resolveWithFullResponse: true,
            url: "http://boxrec.com/en/login", // boxrec does not support HTTPS
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

        if (this.hasRequiredCookiesForLogIn()) {
            return; // success
        } else {
            throw new Error("Cookie did not have PHPSESSID and REMEMBERME");
        }

    }

    /**
     * Makes a request to BoxRec to search people by
     * Note: currently only supports boxers
     * @param {BoxrecSearchParams} params   params included in this search
     * @param {number}             offset   the number of rows to offset the search
     * @returns {Promise<string>}
     */
    async search(params: BoxrecSearchParams, offset: number = 0): Promise<string> {
        if (!params.first_name && !params.last_name) {
            // BoxRec says 2 or more characters, it's actually 3 or more
            throw new Error("Requires `first_name` or `last_name` - minimum 3 characters long");
        }

        const qs: BoxrecSearchParamsTransformed = {};
        let searchParamWrap: string = this.searchParamWrap;

        // if the `searchParamWrap` var is empty we fetch it again
        // this may occur if the user doesn't login but sets the cookie
        if (!searchParamWrap.length) {
            searchParamWrap = await this.getSearchParamWrap();
        }

        for (const i in params) {
            if (params.hasOwnProperty(i)) {
                (qs as any)[`${searchParamWrap}[${i}]`] = (params as any)[i];
            }
        }

        qs.offset = offset;

        return rp.get({
            jar: this._cookieJar,
            qs,
            uri: "http://boxrec.com/en/search",
        });
    }

    /**
     * Returns/saves a boxer's profile in print/pdf format
     * @param {number} globalId
     * @param {"pdf" | "print"} type
     * @param {string} pathToSaveTo
     * @param {string} fileName
     * @returns {Promise<string>}
     */
    private async getBoxerOther(globalId: number, type: "pdf" | "print", pathToSaveTo?: string, fileName?: string): Promise<string> {
        const qs: PersonRequestParams = {};

        if (type === "pdf") {
            qs.pdf = "y";
        } else {
            qs.print = "y";
        }

        return rp.get({
            followAllRedirects: true,
            jar: this._cookieJar,
            qs,
            uri: `http://boxrec.com/en/boxer/${globalId}`
        });
    }

    private async getSearchParamWrap(): Promise<string> {
        const boxrecPageBody: RequestResponse["body"] = await rp.get({
            jar: this._cookieJar,
            uri: "http://boxrec.com/en/search",
        });

        this.setSearchParamWrap(boxrecPageBody);
        return this.searchParamWrap;
    }

    /**
     * Checks cookie jar to see if all required cookies are set
     * this does not necessarily mean the session is logged in
     * @returns {boolean}
     */
    private hasRequiredCookiesForLogIn(): boolean {
        const cookies: Cookie[] = this.cookies;
        const requiredCookies: string[] = ["PHPSESSID", "REMEMBERME"];

        cookies.forEach((cookie: Cookie) => {
            const index: number = requiredCookies.findIndex((val: string) => val === cookie.value);
            requiredCookies.splice(index);
        });

        return !requiredCookies.length;
    }

    private async makeGetPersonByIdRequest(globalId: number, role: BoxrecRole = BoxrecRole.boxer, offset: number = 0, callWithToggleRatings: boolean = false): Promise<string> {
        const uri: string = `http://boxrec.com/en/${role}/${globalId}`;
        const qs: PersonRequestParams = {
            offset,
        };

        if (callWithToggleRatings) {
            qs.toggleRatings = "y";
        }

        const boxrecPageBody: RequestResponse["body"] = await rp.get({
            jar: this._cookieJar,
            qs,
            uri,
        });

        // to ensure we don't recursively call this method, by default we return
        let hasAllColumns: boolean = true;

        // there are 9 roles on the BoxRec website
        // the differences are that the boxers have 2 more columns `last6` for each boxer
        // the judge and others don't have those columns
        // the doctor and others have `events`
        // manager is unique in that the table is a list of boxers that they manage
        switch (role) {
            case BoxrecRole.boxer:
                hasAllColumns = $(boxrecPageBody).find(`.dataTable tbody tr:nth-child(1) td`).length === 16;
                break;
            case BoxrecRole.judge:
            case BoxrecRole.supervisor:
            case BoxrecRole.referee:
                hasAllColumns = $(boxrecPageBody).find("#listBoutsResults tbody tr:nth-child(1) td").length !== 16;
                break;
        }

        // this is not applicable to all roles
        // the roles that return and don't have `bouts` on their profile page will never hit this point
        if (hasAllColumns) {
            return boxrecPageBody;
        }

        // calls itself with the toggle for `toggleRatings=y`
        return this.makeGetPersonByIdRequest(globalId, role, offset, true);
    }

    /**
     * Sets the dynamic search param on BoxRec to prevent further errors
     * It would be nice to get this from any page but the Navbar search is a POST and not as predictable as the search box one on the search page
     * @param {string} bodyHTML     needs to be the body of the "search" page
     * @returns {string}
     */
    private setSearchParamWrap(bodyHTML: string): string {
        // lazy search in case the structure changes
        this._searchParamWrap = $(bodyHTML).find("h2:contains('Find People')").parents("td").find("form").attr("name");

        return this.searchParamWrap;
    }

}

export default new BoxrecRequests();