# Local data and configuration

The public source release does not include the app's generated runtime datasets
or any API credentials. This keeps third-party data licensing separate from the
source code and prevents stale snapshots from being treated as authoritative.

## Data

This slim public release does not include the private project’s data-generation
tooling. Add data only after reviewing the license terms of each upstream source
and confirming you are authorized to redistribute it.

## Configuration

Keep any local configuration outside version control. The public source release
does not include credentials or production-service configuration.
