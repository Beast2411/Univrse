function success(res, status, message, data) {
  if (status >= 400) return res.status(status).json({ success: false, message });
  return res.status(status).json({ success: true, message, data });
}

function failure(res, status, message) {
  return res.status(status).json({ success: false, message });
}

module.exports = { success, failure };
