// import via package.json
const BoxrecRequests = require("../").BoxrecRequests;

if (!BoxrecRequests.login) {
    throw new Error("Did not compile correctly");
}