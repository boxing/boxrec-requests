import * as $ from "cheerio";
import {CookieJar} from "request";
import {BoxrecRequests} from "./boxrec-requests";
import {BoxrecFighterRole, BoxrecRole, Country} from "./boxrec-requests.constants";
import {getRoleOfHTML} from "./helpers";

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

    describe("method getEvents", () => {

        it("should return different events if different roles are provided", async () => {
            const proBoxerResponse: string = await BoxrecRequests.getEvents(cookieJar, {
                country: Country.USA,
                sport: BoxrecFighterRole.proBoxer,
            });

            const amateurBoxerResponse: string = await BoxrecRequests.getEvents(cookieJar, {
                country: Country.USA,
                sport: BoxrecFighterRole.amateurBoxer,
            });

            // was tested to see that two of the same requests will equal the same, so we do know this works as intended
            expect(proBoxerResponse).not.toEqual(amateurBoxerResponse);
        });

    });

    describe("method getPeople", () => {

        it("should return different people if different roles are provided", async () => {
            const proBoxerResponse: string = await BoxrecRequests.getPeople(cookieJar, {
                role: BoxrecRole.proBoxer,
            });

            const amateurBoxerResponse: string = await BoxrecRequests.getPeople(cookieJar, {
                role: BoxrecRole.amateurBoxer,
            });

            // was tested to see that two of the same requests will equal the same, so we do know this works as intended
            expect(proBoxerResponse).not.toEqual(amateurBoxerResponse);
        });

    });

    // the reason we don't test for specific roles is because it's difficult to test a specific role and things
    // are subject to change
    describe("method getPeopleByName", () => {

        function onlyUnique(value: string, index: number, self: string[]): boolean {
            return self.indexOf(value) === index;
        }

        // different role selection changes which column the role data is in
        const enum ColRole {
            fighters = 2,
            all,
            other = 3,
        }

        /**
         * Returns an array of strings that are the roles in the table columns
         * @param html
         * @param isAllFighterOrOther   determines what table column to get the role from
         */
        const getTableRoles: (html: string, isAllFighterOrOther: ColRole) => string[] =
            (html: string, isAllFighterOrOther: ColRole): string[] => {
                const roles: string[] = [];
                $(html).find(".dataTable tbody tr").each((i: number, tableRow: CheerioElement) => {
                    // other roles don't have a link, they are separated by `div`
                    // this is all very subject to failure
                    const elementToGet: "a" | "div" = isAllFighterOrOther !== ColRole.other ? "a" : "div";
                    $(tableRow).find(`td:nth-child(${isAllFighterOrOther}) ${elementToGet}`)
                        .each((j: number, el: CheerioElement) => {
                            roles.push($(el).text());
                        });
                });

                return roles;
            };

        describe("search for `all`", () => {

            it("should give you an assortment of different roles", async () => {
                const response: string = await BoxrecRequests.getPeopleByName(cookieJar, "Mike", "", "");
                const roles: string[] = getTableRoles(response, ColRole.all);
                const uniqueRoles: string[] = roles.filter(onlyUnique);
                expect(uniqueRoles.length).toBeGreaterThan(1);
            });

        });

    });

    describe("method getPersonById", () => {

        /**
         * Tests the URL that is received to see if the correct profile is returned
         * @param globalId
         * @param role
         * @param expectedValue
         */
        const returnRole: (globalId: number, role: BoxrecRole | null, expectedValue?: BoxrecRole | "") => Promise<void>
            = async (globalId: number, role: BoxrecRole | null = null, expectedValue?: BoxrecRole | ""):
            Promise<void> => {
            const html: string = await BoxrecRequests.getPersonById(cookieJar, globalId, role);
            const roleStr: string | null = getRoleOfHTML(html);
            expect(roleStr).toBe(role || expectedValue);
        };

        describe("person that has two roles", () => {

            const paulieMalignaggi: number = 52984;
            const royJonesJr: number = 774820;
            const louDuva: number = 24678;
            const markMacKinnon: number = 875332;
            const steveWillis: number = 408398;

            describe("not specifying a role", () => {

                it("should give the profile default role of the person", async () => {
                    // Paulie Malignaggi should default to `Pro Boxing`
                    await returnRole(paulieMalignaggi, null, BoxrecRole.proBoxer);
                });
            });

            describe("specifying a role", () => {

                describe("different roles different table columns", () => {

                    it("should return the specified role of that person (bareknuckleboxer)", async () => {
                        await returnRole(paulieMalignaggi, BoxrecRole.bareKnuckleBoxer);
                    });

                    it("should return the specified role of that person (proboxer)", async () => {
                        await returnRole(royJonesJr, BoxrecRole.proBoxer);
                    });

                    it("should return the specified role of that person (matchmaker)", async () => {
                        await returnRole(louDuva, BoxrecRole.matchmaker);
                    });

                    it("should return the specified role of that person (muaythaiboxing)", async () => {
                        await returnRole(markMacKinnon, BoxrecRole.muayThaiBoxer);
                    });

                    it("should return the specified role of that person (referee)", async () => {
                        await returnRole(steveWillis, BoxrecRole.referee);
                    });

                });

                it("should throw an error if the role doesn't exist for this person", async () => {
                    try {
                        await BoxrecRequests.getPersonById(cookieJar, paulieMalignaggi,
                            BoxrecRole.amateurMuayThaiBoxer);
                    } catch (e) {
                        expect(e.message).toBe("Person does not have this role");
                    }
                });

            });

        });

        describe("person that has one role", () => {

            const marlonDavis: number = 778281;

            it("should return their default role if not specified", async () => {
                await returnRole(marlonDavis, null, BoxrecRole.matchmaker);
            });

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
