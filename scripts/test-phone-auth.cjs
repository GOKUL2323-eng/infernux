/**
 * PHONE AUTHENTICATION & SMS OTP AUTOMATION TEST SUITE
 * ----------------------------------------------------
 * Tests:
 * 1. Request SMS OTP for registration
 * 2. Reject invalid phone numbers
 * 3. Reject invalid OTP codes
 * 4. Verify valid OTP & complete registration
 * 5. Re-login using verified phone number
 * 6. Rate limiting & resend cooldown
 * 7. Change phone number with verification
 */

const BASE_URL = 'http://localhost:4000/api/v1';

async function api(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json();
  return { status: res.status, ok: res.ok, ...data };
}

async function run() {
  console.log('\n======================================================');
  console.log('   MOZHI REAL SMS OTP & PHONE AUTH TEST SUITE');
  console.log('======================================================\n');

  const testPhone = '98765' + Math.floor(10000 + Math.random() * 90000);
  const countryCode = '+91';
  let passed = 0;
  let total = 0;

  function assert(title, condition, details = '') {
    total++;
    if (condition) {
      passed++;
      console.log(`[PASS] ${title}`);
      if (details) console.log(`       -> ${details}`);
    } else {
      console.error(`[FAIL] ${title}`);
      if (details) console.error(`       -> ${details}`);
    }
  }

  try {
    // Test 1: Send OTP for Registration
    console.log(`📱 Testing SMS OTP Dispatch to ${countryCode} ${testPhone}...`);
    const otpRes = await api('/auth/phone/send-otp', {
      method: 'POST',
      body: {
        phoneNumber: testPhone,
        countryCode,
        purpose: 'register',
      },
    });

    assert(
      'SMS OTP Delivery',
      otpRes.success === true && otpRes.data.cooldownSeconds === 30,
      `Masked: ${otpRes.data?.maskedPhoneNumber}, Cooldown: ${otpRes.data?.cooldownSeconds}s`
    );

    // Test 2: Reject Invalid Phone Number
    const invalidPhoneRes = await api('/auth/phone/send-otp', {
      method: 'POST',
      body: {
        phoneNumber: '123',
        countryCode,
        purpose: 'register',
      },
    });
    assert(
      'Reject Malformed Phone Number',
      invalidPhoneRes.success === false,
      `Rejected with error: ${invalidPhoneRes.error?.message}`
    );

    // Test 3: Resend Cooldown Enforcement
    const cooldownRes = await api('/auth/phone/send-otp', {
      method: 'POST',
      body: {
        phoneNumber: testPhone,
        countryCode,
        purpose: 'register',
      },
    });
    assert(
      'Resend Cooldown Enforcement (<30s)',
      cooldownRes.success === false && cooldownRes.error?.message?.includes('wait'),
      `Enforced: ${cooldownRes.error?.message}`
    );

    // Test 4: Reject Invalid OTP
    const invalidOtpRes = await api('/auth/phone/register', {
      method: 'POST',
      body: {
        phoneNumber: testPhone,
        countryCode,
        otp: '000000',
        username: 'test_phone_user_' + Date.now().toString().slice(-4),
        displayName: 'Phone Test User',
        acceptedTerms: true,
      },
    });
    assert(
      'Reject Incorrect OTP Code',
      invalidOtpRes.success === false,
      `Rejected with: ${invalidOtpRes.error?.message}`
    );

    // Test 5: Verify & Complete Registration with Dev Test Code 999999
    const testUsername = 'phone_user_' + Date.now().toString().slice(-4);
    const validRegisterRes = await api('/auth/phone/register', {
      method: 'POST',
      body: {
        phoneNumber: testPhone,
        countryCode,
        otp: '999999',
        username: testUsername,
        displayName: 'Verified Phone Tester',
        password: 'Password123!',
        acceptedTerms: true,
      },
    });

    assert(
      'Register Account with Verified Phone Number',
      validRegisterRes.success === true && validRegisterRes.data.user.phoneVerified === true,
      `User ID: ${validRegisterRes.data?.user?.id}, Verified: ${validRegisterRes.data?.user?.phoneVerified}`
    );

    const userToken = validRegisterRes.data.tokens.accessToken;

    // Test 6: Request OTP for Phone Login
    const loginOtpRes = await api('/auth/phone/send-otp', {
      method: 'POST',
      body: {
        phoneNumber: testPhone,
        countryCode,
        purpose: 'login',
      },
    });
    assert(
      'Request Login SMS OTP for Existing Verified User',
      loginOtpRes.success === true && loginOtpRes.data.isRegistered === true,
      `Existing user confirmed: ${loginOtpRes.data?.isRegistered}`
    );

    // Test 7: Complete Login with Phone Number & OTP
    const phoneLoginRes = await api('/auth/phone/login', {
      method: 'POST',
      body: {
        phoneNumber: testPhone,
        countryCode,
        otp: '999999',
        purpose: 'login',
      },
    });
    assert(
      'Phone Number OTP Login & Session Issuance',
      phoneLoginRes.success === true && phoneLoginRes.data.user.username === testUsername,
      `Logged in as: @${phoneLoginRes.data?.user?.username}`
    );

    // Test 8: Change / Link Phone Number in Settings with Verification
    const newTestPhone = '98765' + Math.floor(10000 + Math.random() * 90000);
    await api('/auth/phone/send-otp', {
      method: 'POST',
      body: {
        phoneNumber: newTestPhone,
        countryCode,
        purpose: 'change_phone',
      },
    });

    const changePhoneRes = await api('/auth/phone/change', {
      method: 'PATCH',
      token: userToken,
      body: {
        newPhoneNumber: newTestPhone,
        countryCode,
        otp: '999999',
      },
    });
    assert(
      'Update Phone Number via Settings with SMS OTP',
      changePhoneRes.success === true && changePhoneRes.data.phoneNumber === newTestPhone,
      `Updated Phone: ${changePhoneRes.data?.phoneNumber}`
    );

    console.log('\n======================================================');
    console.log(`   TOTAL: ${total} | PASSED: ${passed} | FAILED: ${total - passed}`);
    console.log(`   PASS RATE: ${((passed / total) * 100).toFixed(1)}%`);
    console.log('======================================================\n');

    process.exit(passed === total ? 0 : 1);
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

run();
