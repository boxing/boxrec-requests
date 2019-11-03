import * as $ from "cheerio";
import {CookieJar} from "request";
import * as rp from "request-promise";
import {BoxrecRequests} from "./boxrec-requests";
import {BoxrecFighterOption, BoxrecRole, Country} from "./boxrec-requests.constants";
import {getRoleOfHTML} from "./helpers";
import SpyInstance = jest.SpyInstance;


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
                sport: BoxrecFighterOption["Pro Boxing"],
            });

            const amateurBoxerResponse: string = await BoxrecRequests.getEvents(cookieJar, {
                country: Country.USA,
                sport: BoxrecFighterOption["Amateur Boxing"],
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
        const promoter: any = {
            leonardEllerbe: 419406,
        };
        const bareknuckleboxer: any = {
            paulieMalignaggi: 52984,
        };
        const proboxer: any = {
            royJonesJr: 774820,
        };
        const muayThaiBoxer: any = {
            markMacKinnon: 875332,
        };
        const matchmaker: any = {
            louDuva: 24678,
        };
        const referee: any = {
            steveWillis: 408398,
        };
        const judge: any = {
            daveMoretti: 401002,
        };

        const doctor: any = {
            anthonyRuggeroli: 412676,
        };
        const inspector: any = {
            michaelBuchato: 775611,
        };
        const manager: any = {
            michaelMcSorleyJr: 785510,
        };
        const supervisor: any = {
            sammyMacias: 406714,
        };
        const amateurBoxer: any = {
            keyshawnDavis: 861063,
        };
        const amateurkickBoxer: any = {
            kyleCassel: 874375,
        };
        const proKickBoxer: any = {
            keithAzzopardi: 744924,
        };
        const proMuayThaiBoxer: any = {
            diegoPaez: 851398,
        };
        const amateurMuayThaiBoxer: any = {
            gurnihalSandhu: 888936,
        };
        const worldSeriesBoxer: any = {
            imamKhataev: 852471,
        };

        describe("person that has two roles", () => {

            describe("not specifying a role", () => {

                it("should give the profile default role of the person", async () => {
                    // Paulie Malignaggi should default to `Pro Boxing`
                    await returnRole(bareknuckleboxer.paulieMalignaggi, null, BoxrecRole.proBoxer);
                });
            });

            describe("specifying a role", () => {

                it("should throw an error if the role doesn't exist for this person", async () => {
                    try {
                        await BoxrecRequests.getPersonById(cookieJar, bareknuckleboxer.paulieMalignaggi,
                            BoxrecRole.amateurMuayThaiBoxer);
                    } catch (e) {
                        expect(e.message).toBe("Person does not have this role");
                    }
                });

                it("should make two requests to BoxRec because we compare the two requests for number of columns",
                    async () => {
                        const spy: SpyInstance = jest.spyOn(rp, "get");
                        await BoxrecRequests.getPersonById(cookieJar, 348759, BoxrecRole.proBoxer);

                        expect(spy.mock.calls.length).toBe(2);
                    });

            });

        });

        describe("different roles different table columns", () => {

            describe("should return the specified role of that person", () => {

                it("(pro kickboxer)", async () => {
                    await returnRole(proKickBoxer.keithAzzopardi, BoxrecRole.proKickBoxer);
                });

                it("(pro muay thai)", async () => {
                    await returnRole(proMuayThaiBoxer.diegoPaez, BoxrecRole.proMuayThaiBoxer);
                });

                it("(world series boxer)", async () => {
                    await returnRole(worldSeriesBoxer.imamKhataev, BoxrecRole.worldSeriesBoxer);
                });

                it("(amateur muay thai boxer)", async () => {
                    await returnRole(amateurMuayThaiBoxer.gurnihalSandhu, BoxrecRole.amateurMuayThaiBoxer);
                });

                it("(amateur boxer)", async () => {
                    await returnRole(amateurBoxer.keyshawnDavis, BoxrecRole.amateurBoxer);
                });

                it("(amateur kickboxer)", async () => {
                    await returnRole(amateurkickBoxer.kyleCassel, BoxrecRole.amateurKickBoxer);
                });

                it("(judge)", async () => {
                    await returnRole(judge.daveMoretti, BoxrecRole.judge);
                });

                it("(doctor)", async () => {
                    await returnRole(doctor.anthonyRuggeroli, BoxrecRole.doctor);
                });

                it("(inspector)", async () => {
                    await returnRole(inspector.michaelBuchato, BoxrecRole.inspector);
                });

                it("(manager)", async () => {
                    await returnRole(manager.michaelMcSorleyJr, BoxrecRole.manager);
                });

                it("(supervisor)", async () => {
                    await returnRole(supervisor.sammyMacias, BoxrecRole.supervisor);
                });

                it("(bareknuckleboxer)", async () => {
                    await returnRole(bareknuckleboxer.paulieMalignaggi, BoxrecRole.bareKnuckleBoxer);
                });

                it("(proboxer)", async () => {
                    await returnRole(proboxer.royJonesJr, BoxrecRole.proBoxer);
                });

                it("(matchmaker)", async () => {
                    await returnRole(matchmaker.louDuva, BoxrecRole.matchmaker);
                });

                it("(muaythaiboxing)", async () => {
                    await returnRole(muayThaiBoxer.markMacKinnon, BoxrecRole.proMuayThaiBoxer);
                });

                it("(referee)", async () => {
                    await returnRole(referee.steveWillis, BoxrecRole.referee);
                });

                it("(promoter)", async () => {
                    await returnRole(promoter.leonardEllerbe, BoxrecRole.promoter);
                });

            });

        });

        describe("person that has one role", () => {

            const marlonDavis: number = 778281;

            it("should return their default role if not specified (matchmaker)", async () => {
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
