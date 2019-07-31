import {CookieJar} from "request";
import {BoxrecRequests} from "./boxrec-requests";
import {BoxrecRole} from "./boxrec-requests.constants";
import {getRoleOfHTML} from "./helpers";
import * as $ from "cheerio";

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
        const returnRole: (globalId: number, role: BoxrecRole | null, expectedValue: string) => Promise<void>
            = async (globalId: number, role: BoxrecRole | null = null, expectedValue: string): Promise<void> => {
            const html: string = await BoxrecRequests.getPersonById(cookieJar, globalId, role);
            const roleStr: string | null = getRoleOfHTML(html);
            expect(roleStr).toBe(expectedValue);
        };

        describe("person that has two roles", () => {

            const paulieMalignaggi: number = 52984;

            describe("not specifying a role", () => {

                it("should give the profile default role of the person", async () => {
                    // Paulie Malignaggi should default to `Pro Boxing`
                    await returnRole(paulieMalignaggi, null, "proboxer");
                });
            });

            describe("specifying a role", () => {

                it("should return the specified role of that person", async () => {
                    await returnRole(paulieMalignaggi, BoxrecRole.bareKnuckleBoxer, "bareknuckleboxer");
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

            it("should return their default role if not specified", async () => {
                await returnRole(778281, null, "matchmaker");
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
