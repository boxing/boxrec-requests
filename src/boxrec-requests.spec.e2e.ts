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

    describe("method getWatched", async () => {

        it("should return the page of the boxers that the user is watching", async () => {
            const html: string = await BoxrecRequests.getWatched(cookieJar);
            expect(html).toContain(`<h1 class="pageHeading">Watching</h1>`);
        });
    });

    describe("watching/unwatching", () => {

        const boxer: number = 447121;
        const boxerName: string = "Terence Crawford";

        describe("method watch", () => {

            it("should watch a person, adding them to the list", async () => {
                const html: string = await BoxrecRequests.watch(cookieJar, boxer);
                expect(html).toContain(boxerName);
            });

        });

        describe("method unwatch", () => {

            it("should unwatch a person.  They shouldn't exist in the returned HTML", async () => {
                const html: string = await BoxrecRequests.unwatch(cookieJar, boxer);
                expect(html).not.toContain(boxerName);
            });

        });

    });

});
