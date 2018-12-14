# BoxRec Requests
[![Build Status](https://travis-ci.org/boxing/boxrec-requests.svg?branch=master)](https://travis-ci.org/boxing/boxrec-requests)
[![Coverage Status](https://coveralls.io/repos/github/boxing/boxrec-requests/badge.svg?branch=master)](https://coveralls.io/github/boxing/boxrec-requests?branch=master)

This project makes HTTP requests to BoxRec and returns the HTML body.  
The main purpose of this project is for other projects to easily make requests and return the HTML.

## Installation

`yarn add -D boxrec-requests`
or
`npm install -D boxrec-requests`

## Setup
`import BoxrecRequests from "boxrec-requests";`

or

`const BoxrecRequests = require("boxrec-requests").default;`

## Usage
All responses are promises.  It is highly suggested that you log into BoxRec before hand like this

```
const cookieJar = await BoxrecRequests.login(BOXREC_USERNAME, BOXREC_PASSWORD); // returns a cookieJar (your log in cookie)
await BoxrecRequests.getPersonById(cookieJar, 352); // makes next request as a logged in user
```

BoxRec returns additional data if you're logged in.  It's recommended that you log in.  
Store the cookie so you can reuse it to lower the amount of log in requests that you make to BoxRec