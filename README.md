# apostrophe-secure-attachments

## Why?

You want to limit access to certain uploaded files, such as PDFs, to 
website users who have specifically been given permission to view
those files.

## Wait, what's the standard behavior?

By default, files uploaded to your Apostrophe site can be accessed
by anyone who knows the URL... which is why the URLs are unguessable.
This is a common approach for high-traffic services. It allows media
to be served as fast as possible by static webservers. And it still
protects that media from being discovered by search engines, *until
someone shares that link in public.* 

This compromise works well for most sites, but it is not acceptable
for Intranet sites. And that's why you tracked this module down.

## Sounds great, what's the catch?

All attachments are delivered a little bit slower, including attachments
that have public permissions. That's because Apostrophe must get
involved in serving each one. It's not terrible, but there's an impact.
So just bear that in mind, and don't use this module on a super-high-traffic
site that doesn't really need it.

## Installation

```
npm install apostrophe-secure-attachments
```

## Restrictions (**please read**)

**This module only works with the `local` storage backend of `uploadfs`**.
This is the default way attachments are stored in Apostrophe. You cannot
use this module with the `s3` or `azure` storage backends.

> "Why not?" Those services are basically static webservers for your media.
That defeats the purpose of using this module.

## Configuration

Just turn it on in `app.js`:

```javascript
module.exports = {
  // in app.js
  const apos = require('apostrophe')({
    modules: {
      'apostrophe-secure-attachments': {}
    }
  });
};
```

## So wait... now how do I secure a file?

Just click on "Images" or "Files" in your admin bar, browse to the 
file of interest, click to edit, and select the Permissions tab. You can
set up view permissions just as you would for a page, including options
like "Login Required" and "Certain People." The latter can be locked down
both by user and by group.

## What if I have my own custom `attachment` fields?

If you have added `attachment` schema fields directly to your own pages
or pieces, just set the view permissions for those pages and pieces.
For pages, this option is always available via "Page Settings." For
pieces, it becomes available when you set `permissions: true` as
an option to your pieces module, like this:

```javascript
// lib/modules/products/index.js

module.exports = {
  extend: 'apostrophe-pieces',
  name: 'product',
  // Enables view permissions on a per-piece basis
  permissions: true,
  addFields: [
    {
      type: 'attachment',
      group: 'office',
      name: 'resume'
    }
  ]
};
```

