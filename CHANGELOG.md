# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.1.0] - 2021-04-28
### Added
- Pagination support

## [3.0.2] - 2021-04-21
### Added
- Patch: Add Joi to dependencies

## [3.0.1] - 2021-04-20
### Added
- Add env variable to set json upload limit in express

## [3.0.0] - 2021-04-15
### Added
- Add Client/Server and Mocking components
- Changed error handling (converts known errors to a taube error)

## [2.1.2] - 2021-01-05
### Added
- Errors can be serialized to JSON properly without losing information
- Fix npm security issues

## [2.1.1] - 2020-11-26
### Added
- Patch: Add message parameter and rename validation to data

## [2.1.0] - 2020-11-11
### Added
- Errors module in taube is adopted

## [2.0.0] - 2020-08-25
### Added
- Queue and Worker now asserts a dead-letter exchange and an error queue along the operational queue

## [1.0.1] - 2020-05-06
### Added
- The CHANGELOG file.
- Worker ability to handle cancellation of consumers by RabbitMQ.
