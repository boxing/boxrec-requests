## 6.0.0 (2022-04-15)

### Fixed

-   Date was no longer working as the query string changed.  This is a breaking change and now will accept a date object which will hopefully be easier to maintain
-   PDF/Print fixed as the URL changed
-   Offset for getting boxer bouts was broken from the switch to `node-fetch`

## 5.3.2 (2022-03-26)

### Changed

-   Replace deprecated `request`/`request-promise` package with `node-fetch`.  Which hopefully will make the jump to native Node fetch easier

## 5.3.1 (2022-03-15)

### Changed

-   Compile using the `files` attribute in `package.json` instead of `.npmignore`

## 5.3.0 (2022-03-15)

### Added

-   Proper exporting of constants/interfaces

## 5.2.3 (2022-03-15)

### Fixed

-   Fix log in issue with code comparing null and empty string

## 5.2.2 (2022-03-14)

### Changed

-   If GDPR error message occurs, the username/login error shouldn't override it

## 5.2.1 (2022-03-14)

### Fixed

-   Fix issue where a bad username would throw the wrong error due to a change with the BoxRec error message. 
    Error now just checks if the login returns the login form

## 5.2.0 (2022-02-22)

### Added

-   Endpoints that can list all scores of a bout (user, fan, judges), all user scores, and update the scorecard of a user

## 5.1.4 (2022-02-14)

### Fixed

-   Fix `cheerio.load` to properly create the `$` function

## 5.1.3 (2021-05-08)

### Changed

-   Updated `.npmignore` to decrease package size
    
### Fixed

-   Fix issue with Cheerio and traversing the DOM.  Selectors would come up empty

## 5.1.2 (2021-03-28)

### Fixed

-   BoxRec log in request back to form-data.  I can't explain if this was an error with this package or BoxRec changed

## 5.1.1 (2021-03-04)

### Fixed

-   BoxRec log in request changed from form-data to x-www-form-urlencoded

## 5.1.0 (2020-03-03)

### Added

-   When BoxRec returns 429 Too Many Requests a human readable error will be thrown to callers of this package

## 5.0.5 (2019-12-23)

### Fixed

-   Change the login request to not check the body for `gdpr`.  This was preventing people from logging in

## 5.0.4 (2019-11-11)

### Fixed

-   remove `Jest.timeout` as other packages were throwing issues

## 5.0.3 (2019-11-05)

### Fixed

-   With the roll out of enrollments by BoxRec, some profiles were broken.
    No longer test for column numbers because they can change frequently.
    Instead test to make sure we have the most columns.

## 5.0.2 (2019-08-14)

### Fixed

-   `offset` properly works now for getting people by location

## 5.0.1 (2019-08-12)

### Fixed

-   Profiles were not showing multiple pages of events/bouts for certain roles
-   Return proper column data for different roles

## 5.0.0 (2019-08-05)

### Added

-   Support for new BoxRec roles like pro boxer, amateur boxer, kick boxer, muay thai boxer etc.

### Changed

-   `getPeopleByName` now returns the HTML body and not a generator.  This was because it was nice to have but was very 
inefficient

### Fixed

-   Logging in now works again.  The logging in functionality changed.  BoxRec requests also now support HTTPS

## 4.2.2 (2019-04-21)

### Changed

-   Used travis-ci.com instead of travis-ci.org for builds

## 4.2.0 (2019-01-16)

### Added

-   Can now use `getWatched` to list the boxers that are being watched by the user

## 4.1.0 (2019-01-10)

### Added

-   Can now use `watch`/`unwatch` methods to watch/unwatch a boxer

## 4.0.0 (2019-01-05)

### Fixed

-   Get the dynamic values for ratings page as they change periodically
-   Getting ratings now requires sex of boxers

## 3.0.0 (2018-12-22)

### Changed

-   Remove export default package

### Fixed

-   Get the dynamic values for results/titles page as they change periodically

## 2.0.1 (2018-12-14)

### Fixed

-   Cheerio added as dependency instead of dev dependency

## 2.0.0 (2018-12-14)

### Added

-   Requests now require `cookieJar` passed in.  It can be that of a logged in user or not

### Fixed

-   Type definitions now working properly
