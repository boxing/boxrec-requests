import * as $ from "cheerio";
import * as fs from "fs";
import * as path from "path";
import {getRoleOfHTML} from "../helpers";
import {BoxrecFighterOption, BoxrecLocationLevel, BoxrecRequests, BoxrecRole, Country, ScoreCard} from "../index";
import Root = cheerio.Root;
import DoneCallback = jest.DoneCallback;

const {BOXREC_USERNAME, BOXREC_PASSWORD} = process.env;

if (!BOXREC_USERNAME || !BOXREC_PASSWORD) {
    throw new Error("Required Username/Password is not set");
}

jest.setTimeout(90000);

const napTime: number = 10000;

const wait: (done: DoneCallback) => void = (done: DoneCallback) => setTimeout(done, napTime);

const sleep: (ms?: number) => Promise<void> = (ms: number = napTime) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

describe("class BoxrecRequests", () => {

    let cookies: string = "";
    let num: number = 0;

    beforeAll(async () => {
        // to prevent massive amounts of logging in unnecessarily, after logging in we'll store the cookie in a temp
        // directory
        let cookieBuffer: Buffer;
        const tmpPath: string = path.resolve(process.cwd(), "./tmp/cookies.txt");
        try {
            cookieBuffer = await fs.readFileSync(tmpPath);
            cookies = cookieBuffer.toString();
        } catch (e) {
            // if the file doesn't exist, we log in and store the cookie in the "../tmp" directory
            const cookiesResponse: string = await BoxrecRequests.login(BOXREC_USERNAME, BOXREC_PASSWORD);
            await fs.writeFileSync(tmpPath, cookiesResponse);
            cookies = cookiesResponse;
        }
    });

    // delay each test so we don't get blocked by BoxRec
    beforeEach(done => {
        num++;
        // tslint:disable-next-line:no-console
        console.log(num);
        wait(done);
    });

    it("cookie should be not null and defined", () => {
        expect(cookies).toBeDefined();
        expect(cookies).not.toBeNull();
    });

    describe("method login", () => {

        it("should return a cookie if log in was successful", async () => {
            const cookiesResponse: string = await BoxrecRequests.login(BOXREC_USERNAME, BOXREC_PASSWORD);
            expect(cookiesResponse).toContain("PHPSESSID");
        });

        describe("bad username", () => {

            it("should throw an error stating bad credentials because of returning to a page with the login form", async () => {
               try {
                   await BoxrecRequests.login("", "");
               } catch (e) {
                   expect((e as any).message).toBe("Please check your credentials, could not log into BoxRec");
               }
           });

        });

        describe("bad password", () => {

            it("should throw stating bad credentials because of returning to a page with the login form", async () => {
                try {
                    await BoxrecRequests.login("boxrec", "");
                } catch (e) {
                    expect((e as any).message).toBe("Please check your credentials, could not log into BoxRec");
                }
            });

        });

    });

    describe("method getBout", () => {

        it("should get the details of an individual bout", async() => {
            const response = await BoxrecRequests.getBout(cookies, "856254/2850125");

            expect(response).toContain("Saul Alvarez");
            expect(response).toContain("Mexico");
        });

    });

    describe("method getRatings", () => {

        it("should give male pro boxing ratings", async() => {
            const response: string = await BoxrecRequests.getRatings(cookies, {
                sex: "M",
                role: BoxrecFighterOption["Pro Boxing"]
            })

            expect(response).toContain("Male Boxing Pro Ratings");
        });

    });

    describe("method getEvents", () => {

        it("should return different events if different roles are provided", async () => {
            const proBoxerResponse: string = await BoxrecRequests.getEvents(cookies, {
                country: Country.USA,
                sport: BoxrecFighterOption["Pro Boxing"],
            });

            await sleep();
            const amateurBoxerResponse: string = await BoxrecRequests.getEvents(cookies, {
                country: Country.USA,
                sport: BoxrecFighterOption["Amateur Boxing"],
            });

            // was tested to see that two of the same requests will equal the same, so we do know this works as intended
            expect(proBoxerResponse).not.toEqual(amateurBoxerResponse);
        });

        it("should return the country if specified only", async () => {
            const response: string = await BoxrecRequests.getEvents(cookies, {
                level_id: "us",
                level: BoxrecLocationLevel.Country,
                location: "us_30352",
                sport: BoxrecFighterOption["Pro Boxing"],
            });

            expect(response).toContain("USA");
        });

        it("should return the region if specified with country", async () => {
            // todo not very good tests as they don't test that results came back
            const response: string = await BoxrecRequests.getEvents(cookies, {
                level_id: "us",
                level: BoxrecLocationLevel.Country,
                location: "us_30352",
                sport: BoxrecFighterOption["Pro Boxing"],
            });

            // bound to be a flaky test
            expect(response).toContain(/Events in us/i);
        });

    });

    describe("method getPeople", () => {

        it("should return different people if different roles are provided", async () => {
            const proBoxerResponse: string = await BoxrecRequests.getPeople(cookies, {
                level_id: "us",
                location: "us_30352",
                role: BoxrecFighterOption["Pro Boxing"],
                sex: "m",
            });

            await sleep();
            const amateurBoxerResponse: string = await BoxrecRequests.getPeople(cookies, {
                level_id: "us",
                location: "us_30352",
                role: BoxrecFighterOption["Amateur Boxing"],
                sex: "m"
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
                const $a: Root = $.load(html);
                let roleIdx: number = $a("table thead th:contains('role')").eq(0).index();

                if (roleIdx === -1) {
                    throw new Error("Could not find role column");
                }

                // bump the column
                roleIdx++;

                $a(`.dataTable tbody tr td:nth-child(${roleIdx})`)
                    .each((j: number, el: any) => {
                        roles.push($a(el).text().replace("\n", ""));
                    });

                return roles;
            };

        describe("search for `all`", () => {

            it("should give you an assortment of different roles", async () => {
                const response: string = await BoxrecRequests.getPeopleByName(cookies, "Mike", "", "");
                const roles: string[] = getTableRoles(response, ColRole.all);

                if (roles.length === 0) {
                    throw new Error("0 rows?  Something has broken before this");
                }
                const uniqueRoles: string[] = roles.filter(onlyUnique);
                expect(uniqueRoles.length).toBeGreaterThanOrEqual(1);
            });

        });

    });

    describe("method getChampions", () => {

        it("should return a list of champions", async() => {
            const response = await BoxrecRequests.getChampions(cookies);

            expect(response).toContain("Cruiserweight");
        });

    });

    describe("method getDate", () => {

        it("can return a previous date", async () => {
            const html: string = await BoxrecRequests.getDate(cookies, {
                day: 28,
                month: 9,
                year: 2019,
            });
            expect(html).toContain("2019");
            expect(html).toContain("September");
            expect(html).toContain("28");
        });

    });

    describe("method getEventById", () => {

        it("should return an event", async() => {
            const response = await BoxrecRequests.getEventById(cookies, 856254);

            expect(response).toContain("Saul Alvarez");
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
            const html: string = await BoxrecRequests.getPersonById(cookies, globalId, role);
            const roleStr: string | null = getRoleOfHTML(html);
            expect(roleStr).toBe(role || expectedValue);
            expect(roleStr).not.toBe(null);
        };
        const promoter: Record<string, number> = {
            leonardEllerbe: 419406,
        };
        const bareknuckleboxer: any = {
            paulieMalignaggi: 52984,
        };
        const proboxer: Record<string, number> = {
            royJonesJr: 774820,
        };
        const muayThaiBoxer: Record<string, number> = {
            markMacKinnon: 875332,
        };
        const matchmaker: Record<string, number> = {
            louDuva: 24678,
        };
        const referee: Record<string, number> = {
            steveWillis: 408398,
        };
        const judge: Record<string, number> = {
            daveMoretti: 401002,
        };

        const doctor: Record<string, number> = {
            anthonyRuggeroli: 412676,
        };
        const inspector: Record<string, number> = {
            michaelBuchato: 775611,
        };
        const manager: Record<string, number> = {
            michaelMcSorleyJr: 785510,
        };
        const supervisor: Record<string, number> = {
            sammyMacias: 406714,
        };
        const amateurBoxer: Record<string, number> = {
            keyshawnDavis: 861063,
        };
        const amateurkickBoxer: Record<string, number> = {
            kyleCassel: 874375,
        };
        const proKickBoxer: Record<string, number> = {
            keithAzzopardi: 744924,
        };
        const proMuayThaiBoxer: Record<string, number> = {
            diegoPaez: 851398,
        };
        const amateurMuayThaiBoxer: Record<string, number> = {
            gurnihalSandhu: 888936,
        };
        const worldSeriesBoxer: Record<string, number> = {
            imamKhataev: 852471,
        };

        describe("offset", () => {

            it("should return a different page if specifying offset", async () => {
                const response: string = await BoxrecRequests.getPersonById(cookies, 9625, BoxrecRole.proBoxer, 100);

                expect(response).toContain("Flashy Sebastian");
            });

        });

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
                        await BoxrecRequests.getPersonById(cookies, bareknuckleboxer.paulieMalignaggi,
                            BoxrecRole.amateurMuayThaiBoxer);
                    } catch (e) {
                        expect((e as any).message).toBe("Person does not have this role");
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

                it("(world series boxer) gets lumped in with amateur boxing", async () => {
                    await returnRole(worldSeriesBoxer.imamKhataev, BoxrecRole.amateurBoxer);
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
            const html: string = await BoxrecRequests.getWatched(cookies);
            expect(html).toContain(`Following`);
        });
    });

    describe("watching/unwatching", () => {

        const boxer: number = 447121;
        const boxerName: string = "Terence Crawford";

        describe("method watch", () => {

            it("should watch a person, adding them to the list", async () => {
                const html: string = await BoxrecRequests.watch(cookies, boxer);
                expect(html).toContain(boxerName);
            });

        });

        describe("method unwatch", () => {

            it("should unwatch a person.  They shouldn't exist in the returned HTML", async () => {
                const html: string = await BoxrecRequests.unwatch(cookies, boxer);
                expect(html).not.toContain(boxerName);
            });

        });

    });

    describe("method listScores", () => {

        it("should return the list of all the user's scorecards", async () => {
            const html: string = await BoxrecRequests.listScores(cookies);

            expect(html).toContain("My Scores");
        });

    });

    describe("method getScoreByBoutId", () => {

        it("should return the page with scorecards for a bout", async () => {
            const html: string = await BoxrecRequests.getScoresByBoutId(cookies, 2756346);

            expect(html).toContain("Score");
        });

    });

    // todo I don't think it's getting the intended results
    describe("method getSchedule", () => {

        it("should return schedule events", async() => {
            const response = await BoxrecRequests.getSchedule(cookies, {
                countryCode: 51
            });

            expect(response).toContain("flag-icon-gb");
        })

    });

    // todo I don't think it's getting the intended results
    describe("method getResults", () => {

        it("should return results", async() => {
            const response = await BoxrecRequests.getResults(cookies, {
                countryCode: 51
            });

            expect(response).toContain("flag-icon-gb");
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

            const html: string = await BoxrecRequests.updateScoreByBoutId(cookies, 2756346, score);

            expect(html).toContain("Score");
        });

    });

});
