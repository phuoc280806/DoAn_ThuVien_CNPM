// Định dạng response thống nhất: { success, data, message }

function ok(res, data = null, message = undefined) {
  return res.status(200).json({ success: true, data, message });
}

function created(res, data = null, message = undefined) {
  return res.status(201).json({ success: true, data, message });
}

module.exports = { ok, created };
