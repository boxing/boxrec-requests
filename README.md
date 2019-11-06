# BoxRec Requests
[![npm version](https://badge.fury.io/js/boxrec-requests.svg)](https://badge.fury.io/js/boxrec-requests)
[![Known Vulnerabilities](https://snyk.io/test/github/boxing/boxrec-requests/badge.svg?targetFile=package.json)](https://snyk.io/test/github/boxing/boxrec-requests?targetFile=package.json)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/81db3ecc80f8489eb4a6367511bcbb17)](https://www.codacy.com/manual/mikedidomizio/boxrec-requests?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=boxing/boxrec-requests&amp;utm_campaign=Badge_Grade)

This project makes HTTP requests to BoxRec and returns the HTML body.  
The main purpose of this project is for other projects to easily make requests and return the HTML.

## Installation

`yarn add -D boxrec-requests`
or
`npm install -D boxrec-requests`

## Setup
`import {BoxrecRequests} from "boxrec-requests";`

or

`const BoxrecRequests = require("boxrec-requests").BoxrecRequests;`

## Usage
All responses are promises.  It is highly suggested that you log into BoxRec before hand like this

```
const cookieJar = await BoxrecRequests.login(BOXREC_USERNAME, BOXREC_PASSWORD); // returns a cookieJar (your log in cookie)
await BoxrecRequests.getPersonById(cookieJar, 352); // makes next request as a logged in user
```

BoxRec returns additional data if you're logged in.  It's recommended that you log in.  
Store the cookie so you can reuse it to lower the amount of log in requests that you make to BoxRec

## Todo

Needs proper CI/CD with E2E tests and not mocks
