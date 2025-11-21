// Middleware kiểm tra người dùng đã đăng nhập chưa
exports.requireAuth = (req, res, next) => {
  // Kiểm tra xem có userId trong session không
  if (req.session && req.session.userId) {
    // Người dùng đã đăng nhập, cho phép tiếp tục
    return next();
  }
  
  // Người dùng chưa đăng nhập
  // Nếu là AJAX request, trả về JSON
  if (req.xhr || req.headers.accept.indexOf('json') > -1) {
    return res.status(401).json({ 
      success: false, 
      message: 'Vui lòng đăng nhập để tiếp tục',
      redirectTo: '/login'
    });
  }
  
  // Nếu là request thường, chuyển hướng về trang login
  res.redirect('/login');
};

// Middleware kiểm tra người dùng chưa đăng nhập (dùng cho trang login/register)
exports.requireGuest = (req, res, next) => {
  // Nếu đã đăng nhập, chuyển về dashboard
  if (req.session && req.session.userId) {
    return res.redirect('/');
  }
  
  // Chưa đăng nhập, cho phép tiếp tục
  next();
};

// Middleware thêm thông tin user vào locals để dùng trong views
exports.setUserLocals = async (req, res, next) => {
  if (req.session && req.session.userId) {
    res.locals.isAuthenticated = true;
    res.locals.userId = req.session.userId;
    res.locals.username = req.session.username;
    res.locals.fullName = req.session.fullName;
  } else {
    res.locals.isAuthenticated = false;
    res.locals.userId = null;
    res.locals.username = null;
    res.locals.fullName = null;
  }
  next();
};
