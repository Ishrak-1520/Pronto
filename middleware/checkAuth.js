// Authentication Middleware
function checkAuth(req, res, next) {
    if (req.session && req.session.user) {
        // User is authenticated
        return next();
    }
    // Not authenticated - redirect to login
    res.redirect('/auth/login');
}

module.exports = checkAuth;
