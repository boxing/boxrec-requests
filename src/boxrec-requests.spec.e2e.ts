import * as $ from "cheerio";
import * as fs from "fs";
import * as path from "path";
import {CookieJar} from "request";
import DoneCallback = jest.DoneCallback;
import * as rp from "request-promise";
import {BoxrecRequests} from "./boxrec-requests";
import {BoxrecFighterOption, BoxrecRole, Country, ScoreCard} from "./boxrec-requests.constants";
import {getRoleOfHTML} from "./helpers";

const {BOXREC_USERNAME, BOXREC_PASSWORD} = process.env;

if (!BOXREC_USERNAME || !BOXREC_PASSWORD) {
    throw new Error("Required Username/Password is not set");
}

// ignores __mocks__ and makes real requests
jest.unmock("request-promise");

jest.setTimeout(30000);

const napTime: number = 10000;

const wait: (done: DoneCallback) => void = (done: DoneCallback) => setTimeout(done, napTime);

const sleep: (ms?: number) => Promise<void> = (ms: number = napTime) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

describe("class BoxrecRequests", () => {

    let cookieJar: CookieJar = rp.jar();
    let num: number = 0;

    beforeAll(async () => {
        // to prevent massive amounts of logging in unnecessarily, after logging in we'll store the cookie in a temp
        // directory
        let cookieBuffer: Buffer;
        const tmpPath: string = path.resolve(process.cwd(), "./tmp/cookies.txt");
        const cookieDomain: string = "https://boxrec.com";
        let cookieString: string | null = null;
        try {
            cookieBuffer = await fs.readFileSync(tmpPath);
            cookieString = cookieBuffer.toString();
            cookieJar.setCookie(cookieString, cookieDomain);
        } catch (e) {
            // if the file doesn't exist, we log in and store the cookie in the "../tmp" directory
            cookieJar = await BoxrecRequests.login(BOXREC_USERNAME, BOXREC_PASSWORD);
            const newCookieString: string = cookieJar.getCookieString(cookieDomain);
            await fs.writeFileSync(tmpPath, newCookieString);
        }
    });

    // delay each test so we don't get blocked by BoxRec
    beforeEach(done => {
        num++;
        // tslint:disable-next-line:no-console
        console.log(num);
        wait(done);
    });

    describe("method login", () => {

        it("Bad username should throw an error stating bad credentials because of returning to a page with the login form", async () => {
            try {
                await BoxrecRequests.login("", "");
            } catch (e) {
                expect(e.message).toBe("Please check your credentials, could not log into BoxRec");
            }
        });

        it("Bad password should throw stating bad credentials because of returning to a page with the login form", async () => {
            try {
                await BoxrecRequests.login("boxrec", "");
            } catch (e) {
                expect(e.message).toBe("Please check your credentials, could not log into BoxRec");
            }
        });

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

            await sleep();
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

            await sleep();
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
        // todo these are subject to change
        const enum ColRole {
            // fighters = 2,
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
                let roleIdx: number = $(html).find(".dataTable thead th:contains('role')").eq(0).index();

                if (roleIdx === -1) {
                    throw new Error("Could not find role column");
                }

                // bump the column
                roleIdx++;

                $(html).find(`.dataTable tbody tr td:nth-child(${roleIdx})`)
                    .each((j: number, el: CheerioElement) => {
                        roles.push($(el).text().replace("\n", ""));
                    });

                return roles;
            };

        describe("search for `all`", () => {

            it("should give you an assortment of different roles", async () => {
                const response: string = await BoxrecRequests.getPeopleByName(cookieJar, "Mike", "", "");
                const roles: string[] = getTableRoles(response, ColRole.all);

                if (roles.length === 0) {
                    throw new Error("0 rows?  Something has broken before this");
                }
                const uniqueRoles: string[] = roles.filter(onlyUnique);
                expect(uniqueRoles.length).toBeGreaterThanOrEqual(1);
                expect(uniqueRoles.includes("pro boxer")).toBe(true);
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

    describe("method listScores", () => {

        it("should return the list of all the user's scorecards", async () => {
            const html: string = await BoxrecRequests.listScores(cookieJar);

            expect(html).toContain("My Scores");
        });

    });

    describe("method getScoreByBoutId", () => {

        it("should return the page with scorecards for a bout", async () => {
            const html: string = await BoxrecRequests.getScoresByBoutId(cookieJar, 2756346);

            expect(html).toContain("Scoring");
        });

    });

    describe("method updateScoreByBoutId", () => {

        // todo this isn't really a bullet proof test, even if the request fails it can come back with "Scores saved"
        it("should update the scorecard of a bout", async () => {
            const score: ScoreCard = [
                [10, 9],
                [9, 10],
                [10, 9],
                [9, 10],
                [10, 9],
            ];

            const html: string = await BoxrecRequests.updateScoreByBoutId(cookieJar, 2756346, score);

            expect(html).toContain("Scores saved");
        });

    });

});
