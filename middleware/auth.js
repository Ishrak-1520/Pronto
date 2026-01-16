// Auth middleware - DISABLED for emergency deployment
// All routes now bypass authentication

module.exports = {
    ensureAuth: function (req, res, next) {
        // Bypass authentication - assign dummy user
        req.user = {
            id: 1,
            name: "Guest User",
            displayName: "Guest User",
            email: "guest@pronto.com",
            avatar_url: "https://via.placeholder.com/150",
            company_name: "Pronto Demo"
        };
        req.session = req.session || {};
        req.session.user = req.user;
        return next();
    },
    ensureGuest: function (req, res, next) {
        return next();
    }
};
