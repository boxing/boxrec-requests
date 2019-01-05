import {CookieJar} from "request";
import {BoxrecRequests} from "./boxrec-requests";

const BOXREC_USERNAME: string | undefined = process.env.BOXREC_USERNAME;
const BOXREC_PASSWORD: string | undefined = process.env.BOXREC_PASSWORD;

if (!BOXREC_USERNAME || !BOXREC_PASSWORD) {
    throw new Error("Required Username/Password is not set");
}

// ignores __mocks__ and makes real requests
jest.unmock("request-promise");

describe("class BoxrecRequests", () => {

    let cookieJar: CookieJar;

    beforeAll(async () => {
        cookieJar = await BoxrecRequests.login(BOXREC_USERNAME, BOXREC_PASSWORD);
    });

    it("cookie should be not null and defined", () => {
        expect(cookieJar).toBeDefined();
        expect(cookieJar).not.toBeNull();
    });

    describe("method getPersonById", () => {

        it("should return the HTML", async () => {
            const html: string = await BoxrecRequests.getPersonById(cookieJar, 352);
            expect(html).not.toBeNull();
        });

    });

});
