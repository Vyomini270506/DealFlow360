const AuditLog = require('../models/AuditLog');

// @desc Get audit logs for specific record
// @route GET /api/audit-logs/:recordType/:recordId
const getAuditLogsForRecord = async (req, res) => {
  try {
    const { recordType, recordId } = req.params;
    const logs = await AuditLog.find({ recordType, recordId })
      .populate('performedBy', 'name email role')
      .sort('-timestamp');
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get all audit logs for audit trail console
// @route GET /api/audit-logs
const getAllAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .populate('performedBy', 'name email role')
      .sort('-timestamp')
      .limit(200);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getAuditLogsForRecord, getAllAuditLogs };
