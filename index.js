module.exports = {
  moogBundle: {
    directory: 'lib/modules',
    modules: [
      'apostrophe-secure-attachments-images',
      'apostrophe-secure-attachments-files'
    ]
  },
  improve: 'apostrophe-attachments',
  beforeConstruct: function(self, options) {
    options.uploadfs = options.uploadfs || {};
    options.uploadfs.uploadsPath = '/data/secured';
    const base = (options.apos.baseUrl || '') + options.apos.prefix;
    options.uploadfs.uploadsUrl = base + '/modules/apostrophe-attachments/view';
  },
  construct: function(self, options) {
    const superUrl = self.url;
    self.url = function(attachment, options) {
      if (options.uploadfsPath) {
        return superUrl(attachment, options);
      }
      options = Object.assign({}, options, { uploadfsPath: true });
      const path = superUrl(attachment, options);
      return self.action + '/view/' + path;
    };

    self.route('get', 'view/*', self.secureAttachmentMiddleware, function(req, res) {
      return self.servePath(req, res);
    });

    self.secureAttachmentMiddleware = async function(req, res, next) {
      const path = req.params[0];
      if (!path.startsWith('attachments/')) {
        return next();
      }
      try {
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
        const attachment = await self.db.findOne({ _id: _id }).toObject();
        if (!attachment) {
          throw 'notfound';
        }
        if (attachment.utilized) {
          // Once an attachment is attached to its first doc, the permissions
          // of its docs become its permissions - we have to be able to view
          // at least one of them as this user
          if (!attachment.docIds.length) {
            throw 'forbidden';
          }
          const doc = self.apos.docs.find(req, { _id: { $in: attachment.docIds } }).toObject();
          if (!doc) {
            // We are not cool enough to view any of the docs that
            // contain this attachment (there can be more than one
            // due to page copying, piece copying and workflow)
            throw 'forbidden';
          }
        }
        // OK to let it through
        return next();
      } catch (e) {
        if (e === 'notfound') {
          // TODO standard apostrophe 404 page would be nicer
          return res.status(404).send('not found');
        } if (e === 'forbidden') {
          // TODO Compatibility with apostrophe-second-chance-login would
          // be better here
          return res.status(403).send('forbidden');
        } else {
          // TODO standard apostrophe 500 page would be better
          self.apos.utils.error(e);
          return res.status(500).send('error');
        }
      }
    };

    // Send the file at the uploadfs path specified by req.params[0] 
    // to the browser. Assumes local uploadfs backend. Streaming
    // securely from other backends would be expensive and slow.
    // Perhaps it could be implemented with local caching, but we
    // would also have to change the paths to not contain an _id
    // that is visible in the URL so folks don't just go straight
    // to the bucket, etc.

    self.servePath = function(req, res) {
      const path = self.options.uploadfs.uploadsPath + '/' + req.params[0];
      // No sneakiness
      path = path.replace(/\.\./g, ''); 
      return res.sendFile(require('path').resolve(self.options.uploadfs.uploadsPath + path));
    };

  }
};

