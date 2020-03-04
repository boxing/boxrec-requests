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
