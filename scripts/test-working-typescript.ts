// import via package.json
import {BoxrecRequests} from "../";

if (!BoxrecRequests.login) {
    throw new Error("Did not compile correctly");
}
