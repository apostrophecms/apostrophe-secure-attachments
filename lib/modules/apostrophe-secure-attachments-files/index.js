module.exports = {
  improve: 'apostrophe-files',
  beforeConstruct: function(self, options) {
    if (options.permissionsFields === undefined) {
      // By default, pages have nuanced permissions
      options.permissionsFields = true;
    }
  }
};

