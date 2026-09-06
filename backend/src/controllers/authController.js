const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Customer = require('../models/Customer');
const Otp = require('../models/Otp');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'dealflow360_super_secret_jwt_key_2026_hackathon', {
    expiresIn: '30d',
  });
};

// @desc Auth user & get token
// @route POST /api/auth/login
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() }).populate('salesManagerId').populate('customerId');

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        salesManagerId: user.salesManagerId,
        customerId: user.customerId,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const { sendOtpEmail } = require('../utils/emailService');

// @desc Send 6-digit OTP code to user email
// @route POST /api/auth/send-otp
const sendOtp = async (req, res) => {
  try {
    const { email, type = 'REGISTER' } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email address is required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: cleanEmail });

    if (type === 'REGISTER' && existingUser) {
      return res.status(400).json({ message: 'Account with this email already exists. Please sign in instead.' });
    }

    if ((type === 'LOGIN' || type === 'FORGOT_PASSWORD') && !existingUser) {
      return res.status(404).json({ message: 'No registered account found with this email address.' });
    }

    // Generate 6-digit random numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Delete previous pending OTPs for this email and type
    await Otp.deleteMany({ email: cleanEmail, type });

    // Store OTP in database
    await Otp.create({
      email: cleanEmail,
      otp,
      type,
      expiresAt
    });

    console.log(`[OTP Engine] 🔐 Verification OTP generated for ${cleanEmail}: ${otp}`);

    // Send real Gmail / SMTP email via Nodemailer
    const emailResult = await sendOtpEmail(cleanEmail, otp, type);

    res.json({
      message: `Verification OTP sent to ${cleanEmail}! Please check your email inbox.`,
      email: cleanEmail,
      emailSent: emailResult.sent,
      expiresInMinutes: 10
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Register a new user with OTP verification
// @route POST /api/auth/register
const registerUser = async (req, res) => {
  try {
    const { name, email, password, role = 'CUSTOMER', company, otp } = req.body;

    if (!name || !email || !password || !company || !otp) {
      return res.status(400).json({ message: 'Full name, email, password, company name, and OTP code are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Verify OTP code
    const otpRecord = await Otp.findOne({ email: cleanEmail, type: 'REGISTER', otp });
    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid OTP code entered. Please check and try again.' });
    }

    if (otpRecord.expiresAt < new Date()) {
      return res.status(400).json({ message: 'OTP code has expired. Please request a new OTP.' });
    }

    // 2. Check existing user
    const userExists = await User.findOne({ email: cleanEmail });
    if (userExists) {
      return res.status(400).json({ message: 'User already registered with this email.' });
    }

    // 3. Clear used OTP
    await Otp.deleteMany({ email: cleanEmail, type: 'REGISTER' });

    // 4. Always create linked Customer document in MongoDB customer collection (Iron tier by default)
    const defaultRep = await User.findOne({ role: 'SALES_REP' });
    const defaultManager = await User.findOne({ role: 'SALES_MANAGER' });

    const customerObj = await Customer.create({
      name: company || name,
      email: cleanEmail,
      password: password,
      company: company.trim(),
      tier: 'Bronze',
      creditLimit: 500000,
      assignedSalesRepresentative: defaultRep ? defaultRep._id : null,
      assignedSalesManager: defaultManager ? defaultManager._id : null,
      assignmentStatus: defaultRep ? 'REP_ASSIGNED' : (defaultManager ? 'MANAGER_ASSIGNED' : 'UNASSIGNED'),
      assignedAt: new Date()
    });

    // 5. Create new User with CUSTOMER role
    const user = await User.create({
      name,
      email: cleanEmail,
      password,
      role: 'CUSTOMER',
      customerId: customerObj._id
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      customerId: user.customerId,
      token: generateToken(user._id),
      message: 'Account created successfully!'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Login user using OTP instead of password
// @route POST /api/auth/login-otp
const verifyLoginOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP code are required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail }).populate('salesManagerId').populate('customerId');

    if (!user) {
      return res.status(404).json({ message: 'No registered user found with this email' });
    }

    const otpRecord = await Otp.findOne({ email: cleanEmail, type: 'LOGIN', otp });
    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid OTP code entered' });
    }

    if (otpRecord.expiresAt < new Date()) {
      return res.status(400).json({ message: 'OTP code has expired. Please request a new OTP.' });
    }

    // Clear used OTP
    await Otp.deleteMany({ email: cleanEmail, type: 'LOGIN' });

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      salesManagerId: user.salesManagerId,
      customerId: user.customerId,
      token: generateToken(user._id),
      message: 'OTP authentication successful!'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get current user profile
// @route GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password').populate('salesManagerId').populate('customerId');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Reset user password with OTP verification
// @route POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email address, OTP code, and new password are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Verify OTP code
    const otpRecord = await Otp.findOne({ email: cleanEmail, type: 'FORGOT_PASSWORD', otp });
    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid OTP verification code entered.' });
    }

    if (otpRecord.expiresAt < new Date()) {
      return res.status(400).json({ message: 'OTP code has expired. Please request a new code.' });
    }

    // 2. Find user account
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(404).json({ message: 'No registered user found with this email.' });
    }

    // 3. Update password (will be hashed automatically by User and Customer pre('save') hooks)
    user.password = newPassword;
    await user.save();

    if (user.customerId) {
      const customer = await Customer.findById(user.customerId);
      if (customer) {
        customer.password = newPassword;
        await customer.save();
      }
    }

    // 4. Delete used OTP
    await Otp.deleteMany({ email: cleanEmail, type: 'FORGOT_PASSWORD' });

    res.json({ message: 'Password updated successfully! You can now sign in with your new password.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { loginUser, sendOtp, registerUser, verifyLoginOtp, resetPassword, getMe };


