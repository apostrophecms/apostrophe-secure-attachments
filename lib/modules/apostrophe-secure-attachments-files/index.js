module.exports = {
  improve: 'apostrophe-files',
  beforeConstruct: function(self, options) {
    if (options.permissionsFields === undefined) {
      options.permissionsFields = true;
    }
  }
};
