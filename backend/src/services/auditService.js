const AuditLog = require('../models/AuditLog');

/**
 * Single helper to create immutable AuditLog entries for business transactions.
 */
const logAudit = async ({
  recordType,
  recordId,
  action,
  previousStatus = '',
  newStatus = '',
  performedBy = null,
  performerRole = 'SYSTEM',
  comment = '',
  metadata = {}
}) => {
  try {
    const log = await AuditLog.create({
      recordType,
      recordId,
      action,
      previousStatus,
      newStatus,
      performedBy: performedBy?._id || performedBy || null,
      performerRole,
      comment,
      metadata,
      timestamp: new Date()
    });
    return log;
  } catch (error) {
    console.error('AuditLog Creation Warning:', error.message);
    return null;
  }
};

/**
 * Query audit history timeline for a given record.
 */
const getRecordAuditTimeline = async (recordType, recordId) => {
  try {
    return await AuditLog.find({ recordType, recordId })
      .populate('performedBy', 'name email role')
      .sort({ timestamp: -1 });
  } catch (error) {
    console.error('Error fetching audit timeline:', error.message);
    return [];
  }
};

module.exports = { logAudit, getRecordAuditTimeline };
