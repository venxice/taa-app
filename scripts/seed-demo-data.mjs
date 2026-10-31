import { randomBytes } from 'node:crypto';

const apiBase = `${(process.env.DEMO_APP_URL || 'https://taa-app.vercel.app').replace(/\/$/, '')}/api`;
const adminUsername = process.env.DEMO_ADMIN_USERNAME || 'admin';
const adminPassword = process.env.DEMO_ADMIN_PASSWORD;

if (!adminPassword) {
  throw new Error('Set DEMO_ADMIN_PASSWORD before running this script.');
}

async function request(path, { token, method = 'GET', body } = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.success === false) {
    throw new Error(`${method} ${path} failed (${response.status}): ${result.message || 'API error'}`);
  }
  return result.data;
}

async function main() {
  const login = await request('/auth/login', {
    method: 'POST',
    body: { username: adminUsername, password: adminPassword },
  });
  const adminToken = login.accessToken;
  const adminRequest = (path, options = {}) => request(path, { ...options, token: adminToken });

  const demoResidents = [
    { username: 'demo_ana_reyes', firstName: 'Demo Ana', lastName: 'Reyes', houseNumber: 'BLK 01 LOT 03', street: 'Sampaguita Street', householdSize: 4, occupation: 'Teacher' },
    { username: 'demo_marco_santos', firstName: 'Demo Marco', lastName: 'Santos', houseNumber: 'BLK 02 LOT 08', street: 'Maharlika Street', householdSize: 3, occupation: 'Small Business Owner' },
    { username: 'demo_liza_cruz', firstName: 'Demo Liza', lastName: 'Cruz', houseNumber: 'BLK 03 LOT 11', street: 'Rosal Street', householdSize: 5, occupation: 'Nurse' },
    { username: 'demo_daniel_garcia', firstName: 'Demo Daniel', lastName: 'Garcia', houseNumber: 'BLK 04 LOT 02', street: 'Ilang-Ilang Street', householdSize: 2, occupation: 'Accountant' },
    { username: 'demo_sofia_mendoza', firstName: 'Demo Sofia', lastName: 'Mendoza', houseNumber: 'BLK 05 LOT 06', street: 'Jasmin Street', householdSize: 4, occupation: 'Freelance Designer' },
  ];

  const usersResult = await adminRequest('/users?limit=100');
  const usersByName = new Map(usersResult.users.map((user) => [user.username, user]));

  for (const spec of demoResidents) {
    let user = usersByName.get(spec.username);
    if (!user) {
      const password = randomBytes(24).toString('base64url');
      const registration = await request('/auth/register', {
        method: 'POST',
        body: {
          firstName: spec.firstName,
          lastName: spec.lastName,
          username: spec.username,
          password,
          address: `${spec.houseNumber}, ${spec.street}, Teremil Subdivision, Santa Rosa`,
          householdRole: 'Homeowner',
          householdSize: spec.householdSize,
        },
      });
      user = registration.user;
      await adminRequest(`/users/${user.id}/verify`, {
        method: 'POST',
        body: { status: 'verified' },
      });
    } else if (user.status !== 'verified') {
      await adminRequest(`/users/${user.id}/verify`, {
        method: 'POST',
        body: { status: 'verified' },
      });
    }
  }

  // Use the already-provisioned trial resident as an additional sample household.
  const allUsers = (await adminRequest('/users?limit=100')).users;
  const trialResident = allUsers.find((user) => user.username === 'resident');
  if (!trialResident) throw new Error('The resident trial account is missing.');

  const residentsResult = await adminRequest('/residents?limit=100');
  const residentsByUsername = new Map(residentsResult.residents.map((resident) => [resident.user.username, resident]));
  const sampleHouseholds = [];

  for (const spec of demoResidents) {
    const resident = residentsByUsername.get(spec.username);
    if (!resident) throw new Error(`Resident profile missing for ${spec.username}.`);
    await adminRequest(`/residents/${resident.id}`, {
      method: 'PUT',
      body: {
        houseNumber: spec.houseNumber,
        street: spec.street,
        purok: `Block ${spec.houseNumber.match(/\d+/)?.[0] || '1'}`,
        barangay: 'Teremil (Sample)',
        municipality: 'Santa Rosa',
        address: `${spec.houseNumber}, ${spec.street}, Teremil Subdivision, Santa Rosa`,
        householdRole: 'Homeowner',
        householdSize: spec.householdSize,
        occupation: spec.occupation,
        nationality: 'Filipino',
      },
    });
    sampleHouseholds.push({ ...spec, id: resident.id, userId: resident.user.id });
  }

  const trialResidentProfile = residentsByUsername.get('resident');
  if (!trialResidentProfile) throw new Error('Resident profile missing for the trial resident.');
  await adminRequest(`/residents/${trialResidentProfile.id}`, {
    method: 'PUT',
    body: {
      houseNumber: 'BLK 01 LOT 01',
      street: 'Mabini Street',
      purok: 'Block 1',
      barangay: 'Teremil (Sample)',
      municipality: 'Santa Rosa',
      address: 'BLK 01 LOT 01, Mabini Street, Teremil Subdivision, Santa Rosa',
      householdRole: 'Homeowner',
      householdSize: 4,
      occupation: 'Office Administrator',
      nationality: 'Filipino',
    },
  });
  sampleHouseholds.push({ username: 'resident', firstName: 'Juan', lastName: 'Dela Cruz', id: trialResidentProfile.id, userId: trialResident.id });

  const existingAnnouncements = (await adminRequest('/announcements?limit=100')).announcements;
  const announcementTitles = new Set(existingAnnouncements.map((item) => item.title));
  const announcements = [
    {
      title: '[DEMO] Community meeting and monthly updates',
      content: 'SAMPLE NOTICE — This fictional preview announcement is for demonstrating the app only. The monthly community meeting is shown here as a sample at the covered court on Saturday, November 7, 2026 at 9:00 AM. Residents can review the sample agenda and submit questions through the community office.',
      isPublished: true,
      isPinned: true,
    },
    {
      title: '[DEMO] Streetlight maintenance schedule',
      content: 'SAMPLE NOTICE — Fictional preview content. A sample maintenance team will inspect streetlights along Sampaguita Street and Maharlika Street on November 3, 2026, from 8:00 AM to 12:00 PM. Please keep walkways clear during the inspection.',
      isPublished: true,
    },
    {
      title: '[DEMO] Weekend clean-up drive',
      content: 'SAMPLE NOTICE — Fictional preview content. The sample clean-up drive starts at the community gate on Saturday, November 14, 2026 at 7:00 AM. Gloves and collection bags are available at the sample HOA office.',
      isPublished: true,
    },
    {
      title: '[DEMO] Water service advisory',
      content: 'SAMPLE NOTICE — Fictional preview content. This example advisory demonstrates how a temporary water interruption and service update can be shared with residents. No actual service interruption is scheduled.',
      isPublished: true,
    },
  ];
  for (const announcement of announcements) {
    if (!announcementTitles.has(announcement.title)) {
      await adminRequest('/announcements', { method: 'POST', body: announcement });
    }
  }

  const existingOfficials = (await adminRequest('/officials')).officials;
  const officials = [
    ['Ana', 'Reyes', 'President'],
    ['Marco', 'Santos', 'Vice President'],
    ['Liza', 'Cruz', 'Secretary'],
    ['Daniel', 'Garcia', 'Treasurer'],
    ['Sofia', 'Mendoza', 'Auditor'],
    ['Rafael', 'Navarro', 'Board Member'],
    ['Elena', 'Ramos', 'Board Member'],
  ];
  const officialKeys = new Set(existingOfficials.map((official) => `${official.firstName}|${official.lastName}|${official.position}`));
  for (const [firstName, lastName, position] of officials) {
    const firstNameWithDemo = `Demo ${firstName}`;
    const key = `${firstNameWithDemo}|${lastName}|${position}`;
    if (!officialKeys.has(key)) {
      await adminRequest('/officials', {
        method: 'POST',
        body: {
          firstName: firstNameWithDemo,
          lastName,
          position,
          positionOrder: officials.findIndex((item) => item[2] === position) + 1,
          termFrom: '2026-01-01',
          termTo: '2026-12-31',
          isActive: true,
          email: `demo.${firstName.toLowerCase()}@example.com`,
          address: 'Teremil Subdivision (fictional sample)',
        },
      });
      officialKeys.add(key);
    }
  }

  const existingPayments = (await adminRequest('/payments?search=DEMO&limit=100')).payments;
  if (existingPayments.length === 0) {
    const octoberStatuses = ['confirmed', 'confirmed', 'confirmed', 'rejected', 'pending', 'pending'];
    for (let i = 0; i < sampleHouseholds.length; i += 1) {
      const household = sampleHouseholds[i];
      const october = await adminRequest('/payments', {
        method: 'POST',
        body: {
          residentId: household.id,
          title: '[DEMO] Monthly HOA dues — October 2026',
          description: 'Fictional sample charge for UI preview only. No real payment is due.',
          amount: 350,
          dueDate: '2026-10-05T12:00:00.000Z',
        },
      });
      if (octoberStatuses[i] === 'confirmed') {
        await adminRequest(`/payments/${october.payment.id}`, {
          method: 'PUT',
          body: { proofOfPayment: `DEMO-OR-2026-10-${String(i + 1).padStart(3, '0')}` },
        });
        await adminRequest(`/payments/${october.payment.id}/confirm`, {
          method: 'POST',
          body: { status: 'confirmed' },
        });
      } else if (octoberStatuses[i] === 'rejected') {
        await adminRequest(`/payments/${october.payment.id}/confirm`, {
          method: 'POST',
          body: { status: 'rejected', rejectionReason: 'DEMO — sample receipt needs a clearer image.' },
        });
      }

      await adminRequest('/payments', {
        method: 'POST',
        body: {
          residentId: household.id,
          title: '[DEMO] Monthly HOA dues — November 2026',
          description: 'Fictional sample charge for UI preview only. No real payment is due.',
          amount: 350,
          dueDate: '2026-11-10T12:00:00.000Z',
        },
      });
    }
  }

  const existingIncidents = (await adminRequest('/incidents?search=DEMO&limit=100')).incidents;
  if (existingIncidents.length === 0) {
    const residentLogin = await request('/auth/login', {
      method: 'POST',
      body: { username: 'resident', password: 'Resident123!' },
    });
    const reports = [
      { type: 'Maintenance', title: '[DEMO] Streetlight outage near Sampaguita Street', description: 'Fictional report for UI preview. The sample streetlight near the corner has been out for two evenings.', location: 'Sampaguita Street, Block 1', date: '2026-10-27T12:00:00.000Z', status: 'pending' },
      { type: 'Infrastructure', title: '[DEMO] Drainage inspection requested after rain', description: 'Fictional report for UI preview. Water collected near the sample curb after heavy rain and should be inspected.', location: 'Maharlika Street, Block 2', date: '2026-10-25T12:00:00.000Z', status: 'investigating' },
      { type: 'Noise Complaint', title: '[DEMO] Evening noise near the community court', description: 'Fictional report for UI preview. A sample resident reported loud music after quiet hours.', location: 'Community court', date: '2026-10-20T12:00:00.000Z', status: 'resolved' },
      { type: 'Road Obstruction', title: '[DEMO] Temporary obstruction on Mabini Street', description: 'Fictional report for UI preview. A sample delivery vehicle blocked part of the roadway for a short period.', location: 'Mabini Street, Block 1', date: '2026-10-29T12:00:00.000Z', status: 'pending' },
    ];
    for (const report of reports) {
      const created = await request('/incidents', {
        token: residentLogin.accessToken,
        method: 'POST',
        body: {
          incidentType: report.type,
          title: report.title,
          description: report.description,
          location: report.location,
          dateIncident: report.date,
        },
      });
      if (report.status !== 'pending') {
        await adminRequest(`/incidents/${created.incident.id}`, {
          method: 'PUT',
          body: {
            status: report.status,
            remarks: 'DEMO — sample status update for interface preview.',
            actionTaken: report.status === 'resolved' ? 'DEMO — sample maintenance follow-up completed.' : 'DEMO — sample inspection is in progress.',
          },
        });
      }
    }
  }

  const finance = await adminRequest('/finance');
  if (!finance.entries.some((entry) => entry.description.startsWith('[DEMO]'))) {
    const entries = [
      ['income', 'HO Contributions', 'October dues — sample collection', 4200, '2026-10-05'],
      ['income', 'HO Contributions', 'November dues — sample advance payments', 1750, '2026-10-20'],
      ['income', 'Compound', 'Community court rental — sample entry', 1500, '2026-10-12'],
      ['income', 'Other', 'Replacement gate keys — sample entry', 600, '2026-10-18'],
      ['expense', 'Maintenance', 'Streetlight supplies — sample expense', 2850, '2026-10-08'],
      ['expense', 'Security', 'Additional weekend patrol — sample expense', 3200, '2026-10-15'],
      ['expense', 'Utilities', 'Common-area electricity — sample expense', 4175, '2026-10-25'],
    ];
    for (const [type, category, label, amount, entryDate] of entries) {
      await adminRequest('/finance/entries', {
        method: 'POST',
        body: {
          type,
          category,
          source: 'Demo HOA ledger',
          description: `[DEMO] ${label}. Fictional preview entry; not an actual HOA transaction.`,
          amount,
          entryDate,
        },
      });
    }
  }

  const summary = {
    createdOrEnsuredDemoResidents: demoResidents.length,
    sampleHouseholdsWithPaymentRecords: sampleHouseholds.length,
    demoAnnouncements: announcements.length,
    demoOfficials: officials.length,
    demoIncidents: 4,
    demoFinanceEntries: 7,
    allRecordsClearlyMarked: true,
  };
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
