# Changelog

## 2.1.0-alpha.1

Support for S3, and any other `uploadfs` storage backend that has been modernized with a `streamOut` implementation. This allows the module to be used in a scaled application with multiple servers. Not compatible with `APOS_UPLOADFS_ASSETS=1`.

## 2.0.1

Redirect `/uploads` to `/secure-uploads`. Since all uploads are secured
by this module, it doesn't make sense not to, and all legacy links
to PDFs etc. in rich text break if we don't.

## 2.0.0

Initial release.

