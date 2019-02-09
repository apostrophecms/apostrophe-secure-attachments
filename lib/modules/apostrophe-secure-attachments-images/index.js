module.exports = {
  improve: 'apostrophe-images',
  beforeConstruct: function(self, options) {
    if (options.permissionsFields === undefined) {
      options.permissionsFields = true;
    }
  }
};

