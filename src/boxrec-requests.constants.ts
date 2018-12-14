// todo build typings package
export interface BoxrecRatingsParams {
    division?: string;
    sex?: "M" | "F";
    status?: "a" | "";
}

export interface BoxrecRatingsParamsTransformed {
    offset?: number;
    "r[division]"?: string;
    "r[sex]"?: "M" | "F";
    "r[status]"?: "a" | "";
}

export interface PersonRequestParams {
    offset?: number;
    pdf?: "y";
    print?: "y";
    toggleRatings?: "y"; // hard coded but this value doesn't actually matter to BoxRec
}

export enum BoxrecStatus {
    active = "a",
    all = "", // active and inactive
}

export interface BoxrecSearchParams {
    first_name: string;
    last_name: string;
    role: BoxrecRole;
    status: BoxrecStatus;
}

/**
 * The search params to BoxRec are in an array
 */
export interface BoxrecSearchParamsTransformed {
    "offset"?: number;
    "pf[first_name]"?: string;
    "pf[last_name]"?: string;
    "pf[role]"?: BoxrecRole;
    "pf[status]"?: BoxrecStatus;
}

export interface BoxrecSearch extends BoxrecBasic {
    alias: string | null;
    career: Array<number | null>;
    division: string | null;
    id: number;
    last6: WinLossDraw[];
    record: Record;
    residence: Location;
}

export interface BoxrecSearchMetadata {
    location: {
        address: BoxrecSearchLocation;
    };
    startDate: string | null;

    [key: string]: any;
}

export interface BoxrecSearchLocation {
    addressCountry: string | null;
    addressLocality: string | null;
    addressRegion: string | null;
    streetAddress: string | null;
}


export interface Location {
    country: string | null;
    id: number | null;
    region: string | null;
    town: string | null;
}

export interface BoxrecBoutLocation {
    location: Location;
    venue: BoxrecBasic;
}

export enum WinLossDraw {
    win = "win",
    loss = "loss",
    draw = "draw",
    scheduled = "scheduled",
    unknown = "unknown", // not a boxrec thing, just for us in the rare case that a different outcome is found
}

export interface BoxrecBasic {
    id: number | null;
    name: string | null;
}

export interface BoxrecJudge extends BoxrecBasic {
    scorecard: number[];
}

export interface Record {
    draw: number | null;
    loss: number | null;
    win: number | null;
}

export interface BoxrecBoutBasic {
    firstBoxerWeight: number | null;
    judges: BoxrecJudge[];
    links: BoxrecProfileLinks | BoxrecEventLinks;
    metadata: string;
    numberOfRounds: number;
    rating: number | null;
    referee: BoxrecBasic;
    result: [WinLossDraw, BoxingBoutOutcome | string | null, BoxingBoutOutcome | string | null];
    secondBoxer: BoxrecBasic;
    secondBoxerLast6: WinLossDraw[];
    secondBoxerRecord: Record;
    secondBoxerWeight: number | null;
    titles: BoxrecBasic[];
}

export interface BoxrecBout extends BoxrecBoutBasic {
    date: string;
    links: BoxrecProfileLinks;
    location: BoxrecProfileBoutLocation;
}

export type Stance = "orthodox" | "southpaw";

export interface BoxrecProfile {
    KOs: number | null;
    alias: string | null;
    birthName: string | null;
    birthPlace: string | null;
    born: string | null;
    bouts: BoxrecBout[];
    debut: string | null;
    division: string | null;
    globalId: number | null;
    hasBoutScheduled: boolean;
    height: number[] | null;
    name: string | null;
    nationality: string | null;
    numberOfBouts: number;
    otherInfo: string[][] | null;
    ranking: number[][] | null;
    rating: number | null;
    reach: number[] | null;
    residence: string | null;
    role: string | null;
    rounds: number | null;
    stance: string | null;
    status: string | null;
    suspended: string | null;
    titlesHeld: string[] | null;
    vadacbp: string | null;
}

export enum BoxrecProfileTable {
    globalId = "global ID",
    role = "role",
    rating = "rating",
    ranking = "ranking",
    vadacbp = "VADA CBP",
    bouts = "bouts",
    rounds = "rounds",
    KOs = "KOs",
    status = "status",
    titlesHeld = "titles held",
    birthName = "birth name",
    alias = "alias",
    born = "born",
    nationality = "nationality",
    debut = "debut",
    division = "division",
    stance = "stance",
    height = "height",
    reach = "reach",
    residence = "residence",
    birthPlace = "birth place",
    company = "company",
    registeredContact = "registered contact",
}

export interface BoxrecProfileBoutLocation {
    town: string | null;
    venue: string | null;
}

export interface BoxrecProfileLinks {
    bio_open: number | null;  // this is the wiki link
    bout: number | null;
    event: number | null;
    other: string[];
}

export interface BoxrecProfileEventLinks {
    event: number | null;
}

export interface PersonRequestParams {
    offset?: number;
    pdf?: "y";
    print?: "y";
    toggleRatings?: "y"; // hard coded but this value doesn't actually matter to BoxRec
}

export interface BoxrecProfileRole {
    id: number | null;
    name: BoxrecRole;
}

export interface BoxrecPromoter extends BoxrecBasic {
    company: string | null;
}

export enum BoxingBoutOutcome {
    TKO = "technical knockout",
    KO = "knockout",
    UD = "unanimous decision",
    MD = "majority decision",
    SD = "split decision",
    TD = "technical decision",
    RTD = "corner retirement",
    DQ = "disqualification",
    NWS = "newspaper decision",
}

export interface BoxrecEventLinks {
    bio_open: number | null; // this is the wiki link
    bout: number | null;
    other: string[];
}

export enum Sport {
    proBoxing = "Pro Boxing",
    worldSeries = "World Series", // http://boxrec.com/en/event/775965
}

export interface BoxrecResultsParams {
    countryCode?: Country;
    division?: string;
    offset?: number;
}

export interface BoxrecResultsParamsTransformed {
    "c[countryCode]"?: Country;
    "c[division]"?: string;
    offset?: number;
}


// if needed to rebuild
// grab the dropdown HTML from the locations page
// run it through regexr with this regex `value\s?\=\s?\"(\w{1,2})\"\s?(?:selected\=\"selected\")?\>\s?([A-zÀ-ÿ\s’\-\(\)\.]+)`
// go to `list` and use this `"$2" = "$1",\n`
export enum Country {
    "Afghanistan" = "AF",
    "Albania" = "AL",
    "Algeria" = "DZ",
    "American Samoa" = "AS",
    "Andorra" = "AD",
    "Angola" = "AO",
    "Anguilla" = "AI",
    "Antarctica" = "AQ",
    "Antigua And Barbuda" = "AG",
    "Argentina" = "AR",
    "Armenia" = "AM",
    "Aruba" = "AW",
    "Australia" = "AU",
    "Austria" = "AT",
    "Azerbaijan" = "AZ",
    "Bahamas" = "BS",
    "Bahrain" = "BH",
    "Bangladesh" = "BD",
    "Barbados" = "BB",
    "Belarus" = "BY",
    "Belgium" = "BE",
    "Belize" = "BZ",
    "Benin" = "BJ",
    "Bermuda" = "BM",
    "Bhutan" = "BT",
    "Bolivia" = "BO",
    "Bonaire" = "BQ",
    "Bosnia And Herzegovina" = "BA",
    "Botswana" = "BW",
    "Bouvet Island" = "BV",
    "Brazil" = "BR",
    "British Indian Ocean Territory" = "IO",
    "British Virgin Islands" = "VG",
    "Brunei" = "BN",
    "Bulgaria" = "BG",
    "Burkina Faso" = "BF",
    "Burundi" = "BI",
    "Cambodia" = "KH",
    "Cameroon" = "CM",
    "Canada" = "CA",
    "Cape Verde" = "CV",
    "Cayman Islands" = "KY",
    "Central African Republic" = "CF",
    "Chad" = "TD",
    "Chile" = "CL",
    "China" = "CN",
    "Christmas Island" = "CX",
    "Cocos (Keeling) Islands" = "CC",
    "Colombia" = "CO",
    "Comoros" = "KM",
    "Congo" = "CG",
    "Cook Islands" = "CK",
    "Costa Rica" = "CR",
    "Croatia" = "HR",
    "Cuba" = "CU",
    "Curaçao" = "CW",
    "Cyprus" = "CY",
    "Czech Republic" = "CZ",
    "Côte D’Ivoire" = "CI",
    "Democratic Republic Of The Congo" = "CD",
    "Denmark" = "DK",
    "Djibouti" = "DJ",
    "Dominica" = "DM",
    "Dominican Republic" = "DO",
    "Ecuador" = "EC",
    "Egypt" = "EG",
    "El Salvador" = "SV",
    "Equatorial Guinea" = "GQ",
    "Eritrea" = "ER",
    "Estonia" = "EE",
    "Ethiopia" = "ET",
    "Falkland Islands" = "FK",
    "Faroe Islands" = "FO",
    "Fiji" = "FJ",
    "Finland" = "FI",
    "France" = "FR",
    "French Guiana" = "GF",
    "French Polynesia" = "PF",
    "French Southern Territories" = "TF",
    "Gabon" = "GA",
    "Gambia" = "GM",
    "Georgia" = "GE",
    "Germany" = "DE",
    "Ghana" = "GH",
    "Gibraltar" = "GI",
    "Greece" = "GR",
    "Greenland" = "GL",
    "Grenada" = "GD",
    "Guadeloupe" = "GP",
    "Guam" = "GU",
    "Guatemala" = "GT",
    "Guinea" = "GN",
    "Guinea-Bissau" = "GW",
    "Guyana" = "GY",
    "Haiti" = "HT",
    "Heard Island And Mcdonald Islands" = "HM",
    "Honduras" = "HN",
    "Hong Kong S.A.R." = "HK",
    "Hungary" = "HU",
    "Iceland" = "IS",
    "India" = "IN",
    "Indonesia" = "ID",
    "Iran" = "IR",
    "Iraq" = "IQ",
    "Ireland" = "IE",
    "Israel" = "IL",
    "Italy" = "IT",
    "Jamaica" = "JM",
    "Japan" = "JP",
    "Jordan" = "JO",
    "Kazakhstan" = "KZ",
    "Kenya" = "KE",
    "Kiribati" = "KI",
    "Kosovo" = "XK",
    "Kuwait" = "KW",
    "Kyrgyzstan" = "KG",
    "Laos" = "LA",
    "Latvia" = "LV",
    "Lebanon" = "LB",
    "Lesotho" = "LS",
    "Liberia" = "LR",
    "Libya" = "LY",
    "Liechtenstein" = "LI",
    "Lithuania" = "LT",
    "Luxembourg" = "LU",
    "Macao S.A.R." = "MO",
    "Macedonia" = "MK",
    "Madagascar" = "MG",
    "Malawi" = "MW",
    "Malaysia" = "MY",
    "Maldives" = "MV",
    "Mali" = "ML",
    "Malta" = "MT",
    "Marshall Islands" = "MH",
    "Martinique" = "MQ",
    "Mauritania" = "MR",
    "Mauritius" = "MU",
    "Mayotte" = "YT",
    "Mexico" = "MX",
    "Micronesia" = "FM",
    "Moldova" = "MD",
    "Monaco" = "MC",
    "Mongolia" = "MN",
    "Montenegro" = "ME",
    "Montserrat" = "MS",
    "Morocco" = "MA",
    "Mozambique" = "MZ",
    "Myanmar" = "MM",
    "Namibia" = "NA",
    "Nauru" = "NR",
    "Nepal" = "NP",
    "Netherlands" = "NL",
    "Netherlands Antilles" = "AN",
    "New Caledonia" = "NC",
    "New Zealand" = "NZ",
    "Nicaragua" = "NI",
    "Niger" = "NE",
    "Nigeria" = "NG",
    "Niue" = "NU",
    "Norfolk Island" = "NF",
    "North Korea" = "KP",
    "Northern Mariana Islands" = "MP",
    "Norway" = "NO",
    "Oman" = "OM",
    "Pakistan" = "PK",
    "Palau" = "PW",
    "Palestinian Territory" = "PS",
    "Panama" = "PA",
    "Papua New Guinea" = "PG",
    "Paraguay" = "PY",
    "Peru" = "PE",
    "Philippines" = "PH",
    "Pitcairn" = "PN",
    "Poland" = "PL",
    "Portugal" = "PT",
    "Puerto Rico" = "PR",
    "Qatar" = "QA",
    "Romania" = "RO",
    "Russia" = "RU",
    "Rwanda" = "RW",
    "Réunion" = "RE",
    "Saint Helena" = "SH",
    "Saint Kitts And Nevis" = "KN",
    "Saint Lucia" = "LC",
    "Saint Pierre And Miquelon" = "PM",
    "Saint Vincent And The Grenadines" = "VC",
    "Samoa" = "WS",
    "San Marino" = "SM",
    "Sao Tome And Principe" = "ST",
    "Saudi Arabia" = "SA",
    "Senegal" = "SN",
    "Serbia" = "RS",
    "Seychelles" = "SC",
    "Sierra Leone" = "SL",
    "Singapore" = "SG",
    "Sint Maarten" = "SX",
    "Slovakia" = "SK",
    "Slovenia" = "SI",
    "Solomon Islands" = "SB",
    "Somalia" = "SO",
    "South Africa" = "ZA",
    "South Georgia And The South Sandwich Islands" = "GS",
    "South Korea" = "KR",
    "South Sudan" = "SS",
    "Spain" = "ES",
    "Sri Lanka" = "LK",
    "Sudan" = "SD",
    "Suriname" = "SR",
    "Svalbard And Jan Mayen" = "SJ",
    "Swaziland" = "SZ",
    "Sweden" = "SE",
    "Switzerland" = "CH",
    "Syria" = "SY",
    "Taiwan" = "TW",
    "Tajikistan" = "TJ",
    "Tanzania" = "TZ",
    "Thailand" = "TH",
    "Timor-Leste" = "TL",
    "Togo" = "TG",
    "Tokelau" = "TK",
    "Tonga" = "TO",
    "Trinidad And Tobago" = "TT",
    "Tunisia" = "TN",
    "Turkey" = "TR",
    "Turkmenistan" = "TM",
    "Turks And Caicos Islands" = "TC",
    "Tuvalu" = "TV",
    "U.S. Virgin Islands" = "VI",
    "Uganda" = "UG",
    "Ukraine" = "UA",
    "United Arab Emirates" = "AE",
    "United Kingdom" = "UK",
    "United States Minor Outlying Islands" = "UM",
    "Uruguay" = "UY",
    "USA" = "US",
    "Uzbekistan" = "UZ",
    "Vanuatu" = "VU",
    "Vatican" = "VA",
    "Venezuela" = "VE",
    "Vietnam" = "VN",
    "Wallis And Futuna" = "WF",
    "Western Sahara" = "EH",
    "Yemen" = "YE",
    "Yugoslavia" = "YU",
    "Zambia" = "ZM",
    "Zimbabwe" = "ZW",
}

export interface BoxrecScheduleParams extends BoxrecResultsParams {
    tv?: string;
}

export interface BoxrecScheduleParamsTransformed extends BoxrecResultsParamsTransformed {
    "c[tv]"?: string;
}

// the params for searching titles are capitalized divisions
export enum WeightDivisionCapitalized {
    heavyweight = "Heavyweight",
    cruiserweight = "Cruiserweight",
    lightHeavyweight = "Light Heavyweight",
    superMiddleweight = "Super Middleweight",
    middleweight = "Middleweight",
    superWelterweight = "Super Welterweight",
    welterweight = "Welterweight",
    superLightweight = "Super Lightweight",
    lightweight = "Lightweight",
    superFeatherweight = "Super Featherweight",
    featherweight = "Featherweight",
    superBantamweight = "Super Bantamweight",
    bantamweight = "Bantamweight",
    superFlyweight = "Super Flyweight",
    flyweight = "Flyweight",
    lightFlyweight = "Light Flyweight",
    minimumweight = "Minimumweight"
}

export interface BoxrecTitlesParams {
    bout_title: number;
    division: WeightDivisionCapitalized;
}

export interface BoxrecTitlesParamsTransformed {
    "WcX[bout_title]"?: number;
    "WcX[division]"?: WeightDivisionCapitalized;
    offset?: number;
}

export interface BoxrecLocationsPeopleParams {
    country?: Country;
    division?: WeightDivision;
    l_go?: any; // BoxRec param that doesn't do anything
    region?: string;
    role?: BoxrecRole;
    town?: string;
}

export interface BoxrecLocationsPeopleParamsTransformed {
    "l[country]"?: Country;
    "l[division]"?: WeightDivision;
    "l[region]"?: string;
    "l[role]"?: BoxrecRole;
    "l[town]"?: string;
    l_go?: any; // BoxRec param that doesn't do anything
    offset?: number;
}

export interface BoxrecChampionsByWeightDivision {
    bantamweight: BoxrecBelts;
    cruiserweight: BoxrecBelts;
    featherWeight: BoxrecBelts;
    flyweight: BoxrecBelts;
    heavyweight: BoxrecBelts;
    lightFlyweight: BoxrecBelts;
    lightHeavyweight: BoxrecBelts;
    lightweight: BoxrecBelts;
    middleweight: BoxrecBelts;
    minimumweight: BoxrecBelts;
    superBantamweight: BoxrecBelts;
    superFeatherweight: BoxrecBelts;
    superFlyweight: BoxrecBelts;
    superLightweight: BoxrecBelts;
    superMiddleweight: BoxrecBelts;
    superWelterweight: BoxrecBelts;
    welterweight: BoxrecBelts;
}

export interface BoxrecBelts {
    BoxRec: BoxrecBasic | null;
    IBF: BoxrecBasic | null;
    IBO: BoxrecBasic | null;
    WBA: BoxrecBasic | null;
    WBC: BoxrecBasic | null;
    WBO: BoxrecBasic | null;
}

export interface BoxrecUnformattedChampions {
    beltHolders: BoxrecBelts;
    weightDivision: WeightDivision;
}

export enum BoxrecRole {
    all = "all", // just used for search
    boxer = "boxer",
    doctor = "doctor",
    inspector = "inspector",
    judge = "judge",
    manager = "manager",
    matchmaker = "matchmaker",
    promoter = "promoter",
    referee = "referee",
    supervisor = "supervisor",
}

export enum WeightDivision {
    heavyweight = "heavyweight",
    cruiserweight = "cruiserweight",
    lightHeavyweight = "light heavyweight",
    superMiddleweight = "super middleweight",
    middleweight = "middleweight",
    superWelterweight = "super welterweight",
    welterweight = "welterweight",
    superLightweight = "super lightweight",
    lightweight = "lightweight",
    superFeatherweight = "super featherweight",
    featherweight = "featherweight",
    superBantamweight = "super bantamweight",
    bantamweight = "bantamweight",
    superFlyweight = "super flyweight",
    flyweight = "flyweight",
    lightFlyweight = "light flyweight",
    minimumweight = "minimumweight"
}

export interface BoxrecLocationEventParams {
    country?: Country;
    offset?: number;
    region?: string;
    town?: string;
    venue?: string;
    year?: number;
}
