// We depend on the uploadfs module just to have access
// to its map of content types, the uploadfs instance we
// actually use for everything else belongs to apostrophe

const contentTypes = require('uploadfs/lib/storage/contentTypes.js');
const stream = require('stream');
const util = require('util');
const pipeline = util.promisify(stream.pipeline);

module.exports = {
  moogBundle: {
    directory: 'lib/modules',
    modules: [
      'apostrophe-secure-attachments-images',
      'apostrophe-secure-attachments-files'
    ]
  },
  improve: 'apostrophe-attachments',
  afterConstruct: function(self) {
    self.addRedirectUploadsRoute();
    self.addSecureUploadsRoute();
  },
  beforeConstruct: function(self, options) {
    options.uploadfs = options.uploadfs || {};

    // Change the URL from which content is served to one over which
    // we have control (see route below)
    const base = (options.apos.baseUrl || '') + options.apos.prefix;
    options.uploadfs.cdn = {
      enabled: true,
      url: `${base}/secure-uploads`
    };
    // For S3
    options.uploadfs.bucketObjectACL = 'private';
    options.uploadfs.disabledBucketObjectACL = 'private';
 
    // For local
    options.uploadfs.uploadsPath = options.apos.rootDir + '/data/secure-uploads';
  },
  construct: function(self, options) {

    self.addRedirectUploadsRoute = function() {
      self.apos.app.get('/uploads/*', function(req, res) {
        return res.redirect('/secure-uploads/' + req.params[0]);
      });
    };
      
    self.addSecureUploadsRoute = function() {
      // the middleware does 100% of the work, and only ever in this route, it is still a separate function for bc reasons
      self.apos.app.get('/secure-uploads/*', self.secureAttachmentMiddleware, function(req, res) {});
    };

    self.secureAttachmentMiddleware = async function(req, res, next) {
      try {
        let path = req.params[0];
        const dotAt = path.lastIndexOf('.');
        let extension = (dotAt !== -1) ? path.substring(dotAt + 1) : '';
        if (path.startsWith('attachments/')) {
          // after "attachments..."
          const slashAt = req.params[0].indexOf('/');
          if (slashAt === -1) {
            throw 'notfound';
          }
          // comes the path to the file...
          const path = req.params[0].substring(slashAt + 1);
          const hyphenAt = path.indexOf('-');
          if (hyphenAt === -1) {
            throw 'notfound';
          }
          // the _id is everything up to the first -
          const _id = path.substring(0, hyphenAt);
          const attachment = await self.db.findOne({ _id: _id });
          if (!attachment) {
            throw 'notfound';
          }
          if (attachment.utilized) {

            // Once an attachment is attached to its first doc, the permissions
            // of its docs become its permissions. The test is: we have to be able to view
            // at least one of those docs as this user.
            //
            // Docs in the trash can pass this test for someone allowed to edit them,
            // but in practice only come through if it happens to be the "allowed in
            // trash" size used for media library preview; the rest
            // will have permissions set to 000 or the disabledFileKey renaming pattern
            // in effect, so things behave just as they would without this module.

            const ids = (attachment.docIds || []).concat(attachment.trashDocIds || []);
            if (!ids.length) {
              throw 'forbidden';
            }
            const doc = await self.apos.docs.find(req, { _id: { $in: ids } }).trash(null).published(null).toObject();
            if (!doc) {
              // We are not cool enough to view any of the docs that
              // contain this attachment (there can be more than one
              // due to page copying, piece copying and workflow)
              throw 'forbidden';
            }
          }
        }
        // OK, stream it, take care not to allow escape from the folder
        path = path.replace(/\.\.\//g, '');
        const contentType = contentTypes[extension] || 'application/octet-stream';
        const input = self.uploadfs.streamOut(`/${path}`);
        let progress = false;
        try {
          for await (const buffer of input) {
            res.setHeader('content-type', contentType);
            res.write(buffer);
            progress = true;
          }
        } catch (e) {
          if (!progress) {
            if (e.statusCode) {
              // Without the newline 404 crops to 40
              res.status(e.statusCode).setHeader('content-type', 'text/plain').send(`Error from S3: ${e.status}\n`);
            } else {
              res.status(500).setHeader('content-type', 'text/plain').send('Unknown error from S3\n');
            }
          } else {
            // The pipeline mechanism will shut it down for us
          }
        }
      } catch (e) {
        if (e === 'notfound') {
          return res.status(404).send('not found');
        } if (e === 'forbidden') {
          return res.status(403).send('forbidden');
        } else {
          self.apos.utils.error(e);
          return res.status(500).send('error');
        }
      }
    };
  }
};
