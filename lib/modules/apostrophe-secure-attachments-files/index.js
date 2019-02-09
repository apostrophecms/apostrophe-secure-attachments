module.exports = {
  beforeConstruct: function(self, options) {
    if (options.permissions !== undefined) {
      options.permissions = true;
    }
  }
};

